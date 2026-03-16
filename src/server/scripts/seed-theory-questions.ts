/**
 * seed-theory-questions.ts
 *
 * Reads theory_seeds_progress.json (produced by scripts/python/theory_pipeline.py)
 * and inserts THEORY-type challenges into the DB.
 *
 * Each question is matched to a lesson by topic title.
 * If no lesson is found the question is skipped (run the relevant syllabus
 * seed first: seed-0653-syllabus.ts, seed-em-0680.ts, etc.)
 *
 * Run:  npx tsx src/server/scripts/seed-theory-questions.ts
 */

import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import * as fs from "fs";
import * as path from "path";

import { eq, and } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

import db from "@/server/db/drizzle";

const PROGRESS_FILE   = "theory_seeds_progress.json";
const DIAGRAMS_PUBLIC = path.join(process.cwd(), "public", "diagrams");

function getRealDiagramPaths(): Set<string> {
  const set = new Set<string>();
  if (fs.existsSync(DIAGRAMS_PUBLIC)) {
    for (const f of fs.readdirSync(DIAGRAMS_PUBLIC)) {
      if (f.toLowerCase().endsWith(".png")) set.add(`/diagrams/${f}`);
    }
  }
  return set;
}

function parsePaperRef(source: string): string | null {
  const m = source.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)\.pdf/i);
  if (!m) return null;
  const [, , season, year2, paperNum] = m;
  const year = `20${year2}`;
  const seasonLabel =
    season.toLowerCase() === "m" ? "March" :
    season.toLowerCase() === "s" ? "May/June" : "Oct/Nov";
  return `Paper ${paperNum} · ${seasonLabel} ${year}`;
}

function parseOrder(raw: number | string | undefined): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const m = raw.match(/\d+/);
    return m ? parseInt(m[0]) : 1;
  }
  return 1;
}

// ── Topic name normalisation ──────────────────────────────────────────────────
// Maps topic names produced by the Python pipeline → DB lesson titles.
// Only needed for 0653 where the pipeline used a different numbering scheme.
const TOPIC_MAP: Record<string, string> = {
  // Biology (pipeline B-number → DB B-number)
  "B2. Cells":                          "B2. Cells",
  "B3. Biological molecules":           "B4. Biological molecules",
  "B4. Enzymes":                        "B5. Enzymes",
  "B5. Plant nutrition":                "B6. Plant nutrition",
  "B6. Animal nutrition":               "B7. Human nutrition",
  "B7. Transport":                      "B8. Transport in plants",
  "B8. Gas exchange and respiration":   "B11. Gas exchange in humans",
  "B9. Coordination and response":      "B10. Diseases and immunity",
  "B10. Reproduction":                  "B14. Reproduction",
  "B11. Inheritance":                   "B15. Organisms and their environment",
  "B12. Ecology":                       "B15. Organisms and their environment",
  // Chemistry
  "C1. Particulate nature of matter":   "C1. States of matter",
  "C2. Experimental techniques":        "C12. Experimental techniques and chemical analysis",
  "C3. Atoms, elements and compounds":  "C2. Atoms, elements and compounds",
  "C4. Stoichiometry":                  "C3. Stoichiometry",
  "C5. Electricity and chemistry":      "C4. Electrochemistry",
  "C6. Energy changes in reactions":    "C5. Chemical energetics",
  "C7. Chemical reactions":             "C6. Chemical reactions",
  "C8. Acids, bases and salts":         "C7. Acids, bases and salts",
  "C9. The Periodic Table":             "C8. The Periodic Table",
  "C10. Metals":                        "C9. Metals",
  "C11. Air and water":                 "C10. Chemistry of the environment",
  "C12. Organic chemistry":             "C11. Organic chemistry",
  // Physics (P1-P3 already match; P4 and P6 differ)
  "P4. Electricity and magnetism":      "P4. Electricity",
  "P6. Space physics":                  "P5. Space physics",
};

function normaliseTopic(raw: string): string {
  return TOPIC_MAP[raw] ?? raw;
}

async function main() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    console.error("❌ theory_seeds_progress.json not found. Run the Python pipeline first.");
    process.exit(1);
  }

  type RawQuestion = {
    number: number | string;
    topic: string;
    question: string;
    markingSchemeAnswer?: string;
    totalMarks?: number;
    imageSrc?: string | null;
  };

  const papers = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")) as Array<{
    source: string;
    ms_source?: string;
    questions: RawQuestion[];
  }>;

  const validDiagrams = getRealDiagramPaths();
  console.log(`📂 ${validDiagrams.size} diagram files in public/diagrams/`);
  console.log(`📄 ${papers.length} papers | processing theory questions …`);

  let added = 0;
  let skipped = 0;
  let noLesson = 0;

  for (const paper of papers) {
    console.log(`\n📝 ${paper.source} (${paper.questions.length} questions)`);
    const paperRef = parsePaperRef(paper.source);

    for (const q of paper.questions) {
      const imageSrc: string | null =
        q.imageSrc && validDiagrams.has(q.imageSrc) ? q.imageSrc : null;

      // Match lesson by topic title (with normalisation for 0653 numbering differences)
      const topicTitle = normaliseTopic(q.topic);
      const lesson = await db.query.lessons.findFirst({
        where: eq(schema.lessons.title, topicTitle),
      });

      if (!lesson) {
        noLesson++;
        continue;
      }

      // Dedup check (same lesson + same question text)
      const existing = await db.query.challenges.findFirst({
        where: and(
          eq(schema.challenges.lessonId, lesson.id),
          eq(schema.challenges.question, q.question)
        ),
      });

      if (existing) {
        // Update imageSrc / paperRef if stale
        const needsUpdate =
          existing.imageSrc !== imageSrc ||
          (paperRef && existing.paperRef !== paperRef);
        if (needsUpdate) {
          await db
            .update(schema.challenges)
            .set({ imageSrc, ...(paperRef ? { paperRef } : {}) })
            .where(eq(schema.challenges.id, existing.id));
        }
        skipped++;
        continue;
      }

      await db.insert(schema.challenges).values({
        lessonId: lesson.id,
        type: "THEORY",
        topic: q.topic,
        question: q.question,
        markingSchemeAnswer: q.markingSchemeAnswer ?? null,
        totalMarks: q.totalMarks ?? 1,
        imageSrc,
        paperRef: paperRef ?? null,
        order: parseOrder(q.number),
      });

      added++;
    }
  }

  console.log(`\n✅ Theory seeding complete!`);
  console.log(`   Added    : ${added}`);
  console.log(`   Skipped  : ${skipped} (already in DB)`);
  console.log(`   No topic : ${noLesson} (run the subject syllabus seed first)`);
}

main().catch((err) => {
  console.error("🔴 Fatal:", err);
  process.exit(1);
});
