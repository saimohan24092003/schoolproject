/**
 * patch-exam-diagram-links.ts
 *
 * Reads data/diagram_manifest.json and injects the correct imageSrc into
 * every question stored in exam_papers.content (JSON blob) where a matching
 * manifest entry exists.
 *
 * Matching key: subject_code + season_code + year2d + "_qp_" + variant
 *   → derives the expected PDF filename, looks up manifest entries for that
 *     filename, then matches by question.number.
 *
 * Run:  npx tsx src/server/scripts/patch-exam-diagram-links.ts
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "@/server/db/schema";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const MANIFEST_FILE  = "data/diagram_manifest.json";
const DIAGRAMS_DIR   = path.join(process.cwd(), "public", "diagrams");

type ManifestEntry = {
  paper: string;
  question: number;
  filename: string | null;
  has_multiple_diagrams: boolean;
  safe_to_link_directly: boolean;
  status: string;
};

// DB season string → Cambridge PDF season prefix
const SEASON_TO_CODE: Record<string, string> = {
  march:    "m",
  february: "m",
  june:     "s",
  may:      "s",
  november: "w",
  october:  "w",
};

function derivePdfName(
  subjectCode: string,
  season: string,
  year: number,
  variant: string
): string | null {
  const sc = SEASON_TO_CODE[season.toLowerCase().trim()];
  if (!sc) return null;
  const yy = String(year).slice(-2);
  // variant in DB is already the paper code, e.g. "12", "22", "32"
  return `${subjectCode}_${sc}${yy}_qp_${variant}.pdf`;
}

function getSubjectCode(subject: string): string | null {
  const m = subject.match(/\((\d{4})\)/);
  return m?.[1] ?? null;
}

function fileExists(webPath: string): boolean {
  try {
    const clean = webPath.startsWith("/") ? webPath.slice(1) : webPath;
    return fs.existsSync(path.join(process.cwd(), "public", clean));
  } catch { return false; }
}

async function main() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error("❌ data/diagram_manifest.json not found. Run crop_question_diagrams.py first.");
    process.exit(1);
  }

  const allEntries: ManifestEntry[] = JSON.parse(
    fs.readFileSync(MANIFEST_FILE, "utf-8")
  );

  // Build lookup: pdfName → Map<qnum, webPath>
  // Prefer primary (no _iN suffix) when multiple exist; skip multi-diagram entries
  // that are not safe to link directly.
  const lookup = new Map<string, Map<number, string>>();
  for (const e of allEntries) {
    if (e.status !== "resolved" || !e.filename) continue;
    const isPrimary = !/_i\d+\.png$/.test(e.filename);
    const pdf = e.paper;
    if (!lookup.has(pdf)) lookup.set(pdf, new Map());
    const qmap = lookup.get(pdf)!;
    // Only set if not already set (primary wins over _iN)
    if (!qmap.has(e.question) || isPrimary) {
      qmap.set(e.question, e.filename);
    }
  }
  console.log(`🗺️  Manifest: ${allEntries.length} entries covering ${lookup.size} PDFs`);

  const papers = await db.query.examPapers.findMany();
  console.log(`📄 ${papers.length} exam_papers rows to check\n`);

  let papersPatched = 0;
  let questionsLinked = 0;

  for (const paper of papers) {
    const subjectCode = getSubjectCode(paper.subject);
    if (!subjectCode) continue;

    const pdfName = derivePdfName(subjectCode, paper.season, paper.year, paper.variant);
    if (!pdfName) continue;

    const qmap = lookup.get(pdfName);
    if (!qmap || qmap.size === 0) continue;

    // Parse content JSON
    let content: { questions?: Array<Record<string, unknown>> };
    try {
      content = JSON.parse(paper.content);
    } catch { continue; }

    const questions = content.questions;
    if (!Array.isArray(questions) || questions.length === 0) continue;

    let changed = 0;
    for (const q of questions) {
      const qnum = typeof q.number === "number" ? q.number : parseInt(String(q.number));
      if (!qnum) continue;

      // Skip if already has a valid imageSrc
      const existing = q.imageSrc as string | null | undefined;
      if (existing && fileExists(existing)) continue;

      const manifestPath = qmap.get(qnum);
      if (manifestPath && fileExists(manifestPath)) {
        q.imageSrc = manifestPath;
        changed++;
        questionsLinked++;
      }
    }

    if (changed > 0) {
      await db
        .update(schema.examPapers)
        .set({ content: JSON.stringify(content) })
        .where(eq(schema.examPapers.id, paper.id));
      console.log(`✅ ${pdfName} (paper id ${paper.id}): +${changed} diagram links`);
      papersPatched++;
    }
  }

  console.log(`\n📊 Done`);
  console.log(`   Papers patched   : ${papersPatched}`);
  console.log(`   Questions linked : ${questionsLinked}`);
  console.log(`\nNext: node -e \"...\" scripts/check_resource_ui_audit_0653.js`);
}

main().catch((err) => {
  console.error("🔴 Fatal:", err);
  process.exit(1);
});
