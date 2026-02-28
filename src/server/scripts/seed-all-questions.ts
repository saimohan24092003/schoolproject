/**
 * seed-all-questions.ts
 *
 * Reads bulk_seeds_progress.json and pushes every question to the DB.
 * - Validates imageSrc against files in public/diagrams/ (nulls fake paths)
 * - Skips duplicates (same lessonId + question text)
 * - Marks the correct option by correctAnswer letter (A→0, B→1, C→2, D→3)
 *
 * Run:  npx tsx src/server/scripts/seed-all-questions.ts
 */

import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import * as fs from "fs";
import * as path from "path";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const PROGRESS_FILE   = "bulk_seeds_progress.json";
const MANIFEST_FILE   = "data/diagram_manifest.json";
const DIAGRAMS_PUBLIC = path.join(process.cwd(), "public", "diagrams");

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a lookup from the diagram_manifest.json produced by crop_question_diagrams.py.
 * Key: "<pdf_filename>|<question_number>"  e.g. "0653_m25_qp_12.pdf|14"
 * Value: web path to the best single PNG, or null.
 *
 * For questions with multiple diagrams we pick the first (_i0 / no suffix) so
 * the student at least sees a related figure; mark-scheme review should refine later.
 */
function buildManifestLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  if (!fs.existsSync(MANIFEST_FILE)) return lookup;
  try {
    const entries = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8")) as Array<{
      paper: string;
      question: number;
      filename: string | null;
      status: string;
      has_multiple_diagrams: boolean;
    }>;
    // Group by paper+question, prefer safe_to_link_directly entries, else first resolved
    const grouped = new Map<string, typeof entries>();
    for (const e of entries) {
      if (e.status !== "resolved" || !e.filename) continue;
      const key = `${e.paper}|${e.question}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    }
    for (const [key, group] of grouped) {
      // Prefer the entry without _iN suffix (primary diagram) when multiple exist
      const primary = group.find((e) => e.filename && !/_i\d+\.png$/.test(e.filename));
      const chosen = primary ?? group[0];
      if (chosen?.filename) lookup.set(key, chosen.filename);
    }
    console.log(`🗺️  Manifest lookup: ${lookup.size} question→diagram mappings`);
  } catch {
    console.warn("⚠️  Could not load diagram_manifest.json — skipping manifest lookup");
  }
  return lookup;
}

function getRealDiagramPaths(): Set<string> {
  const set = new Set<string>();
  if (fs.existsSync(DIAGRAMS_PUBLIC)) {
    for (const f of fs.readdirSync(DIAGRAMS_PUBLIC)) {
      if (f.toLowerCase().endsWith(".png")) {
        set.add(`/diagrams/${f}`);
      }
    }
  }
  return set;
}

function parseCorrectIndex(correctAnswer: string | null | undefined): number {
  if (!correctAnswer) return 0;
  const upper = correctAnswer.trim().toUpperCase();
  const code = upper.charCodeAt(0);
  if (code >= 65 && code <= 68) return code - 65; // A=0 B=1 C=2 D=3
  return 0;
}

function parseOrderNum(raw: number | string | undefined): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const m = raw.match(/\d+/);
    return m ? parseInt(m[0]) : 1;
  }
  return 1;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    console.error("❌ bulk_seeds_progress.json not found. Run the Python pipeline first.");
    process.exit(1);
  }

  const papers = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")) as Array<{
    source: string;
          questions: Array<{
            number: number | string;
            topic: string;
            question: string;
            explanation?: string;
            options: string[];
            correctAnswer?: string;
            imageSrc?: string | null;
          }>;
        }>;
  const validDiagrams  = getRealDiagramPaths();
  const manifestLookup = buildManifestLookup();
  console.log(`📂 ${validDiagrams.size} real diagram files in public/diagrams/`);
  console.log(`📄 ${papers.length} papers | processing...`);

  let added = 0;
  let skipped = 0;
  let noLesson = 0;
  let manifestLinked = 0;

  for (const paper of papers) {
    console.log(`\n📝 ${paper.source} (${paper.questions.length} questions)`);

    for (const q of paper.questions) {
      // 1. Validate explicit imageSrc from Gemini extraction
      let imageSrc: string | null =
        q.imageSrc && validDiagrams.has(q.imageSrc) ? q.imageSrc : null;

      // 2. If no valid explicit imageSrc, try the manifest lookup keyed by paper+qnum
      if (!imageSrc) {
        const qnum = typeof q.number === "number" ? q.number : parseInt(String(q.number));
        const manifestKey = `${paper.source}|${qnum}`;
        const manifestPath = manifestLookup.get(manifestKey);
        if (manifestPath && validDiagrams.has(manifestPath)) {
          imageSrc = manifestPath;
          manifestLinked++;
        }
      }

      // Find matching lesson by topic title
      const lesson = await db.query.lessons.findFirst({
        where: eq(schema.lessons.title, q.topic),
      });

      if (!lesson) {
        noLesson++;
        continue; // topic not seeded yet — run seed-0653-syllabus.ts first
      }

      // Dedup check
      const existing = await db.query.challenges.findFirst({
        where: and(
          eq(schema.challenges.lessonId, lesson.id),
          eq(schema.challenges.question, q.question)
        ),
      });

      if (existing) {
        // Sync imageSrc: update if real value differs (also clears fake paths → null)
        if (existing.imageSrc !== imageSrc) {
          await db
            .update(schema.challenges)
            .set({ imageSrc })
            .where(eq(schema.challenges.id, existing.id));
        }
        skipped++;
        continue;
      }

      const [challenge] = await db
        .insert(schema.challenges)
        .values({
          lessonId: lesson.id,
          type: "SELECT",
          question: q.question,
          explanation: q.explanation || null,
          imageSrc,
          order: parseOrderNum(q.number),
        })
        .returning();

      added++;

      // Insert options
      if (q.options && q.options.length > 0) {
        const correctIndex = parseCorrectIndex(q.correctAnswer);
        const optionValues = q.options.map((text, idx) => ({
          challengeId: challenge.id,
          text,
          correct: idx === correctIndex,
          imageSrc: null,
          audioSrc: null,
        }));
        await db.insert(schema.challengeOptions).values(optionValues);
      }
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Added          : ${added}`);
  console.log(`   Skipped        : ${skipped} (already in DB)`);
  console.log(`   No topic       : ${noLesson} (run seed-0653-syllabus.ts first)`);
  console.log(`   Manifest-linked: ${manifestLinked} diagrams auto-attached from manifest`);

  const diagInDB = await db.query.challenges.findMany({
    where: (c, { isNotNull }) => isNotNull(c.imageSrc),
  });
  console.log(`\n🖼️  Questions with diagrams in DB: ${diagInDB.length}`);
}

main().catch((err) => {
  console.error("🔴 Fatal error:", err);
  process.exit(1);
});
