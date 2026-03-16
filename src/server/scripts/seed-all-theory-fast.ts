/**
 * Fast bulk theory seeder — all subjects, batch inserts
 * Uses pre-loaded lesson map + in-memory dedup (no per-row SELECT)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as schema from "@/server/db/schema";
import * as fs from "fs";
import * as path from "path";
import { eq, isNotNull } from "drizzle-orm";
import db from "@/server/db/drizzle";

const PROGRESS_FILE = "theory_seeds_progress.json";
const DIAGRAMS_PUBLIC = path.join(process.cwd(), "public", "diagrams");
const BATCH_SIZE = 100;

// Per-subject topic maps (pipeline name → DB lesson title)
const TOPIC_MAPS: Record<string, Record<string, string>> = {
  "0653": { "P5. Space physics": "P6. Space physics" },
  "0580": {}, "0500": {}, "0680": {},
};

function normaliseTopic(subjectCode: string, raw: string): string {
  return TOPIC_MAPS[subjectCode]?.[raw] ?? raw;
}

function parsePaperRef(source: string): string | null {
  const m = source.match(/(\d{4})_([msw])(\d{2})_qp_(\d+)\.pdf/i);
  if (!m) return null;
  const [,, season, year2, paperNum] = m;
  const year = `20${year2}`;
  const s = season.toLowerCase() === "m" ? "March" : season.toLowerCase() === "s" ? "May/June" : "Oct/Nov";
  return `Paper ${paperNum} · ${s} ${year}`;
}

function getSubjectCode(source: string): string {
  return source.match(/^(\d{4})/)?.[1] ?? "";
}

function getRealDiagramPaths(): Set<string> {
  const set = new Set<string>();
  if (fs.existsSync(DIAGRAMS_PUBLIC))
    for (const f of fs.readdirSync(DIAGRAMS_PUBLIC))
      if (f.toLowerCase().endsWith(".png")) set.add(`/diagrams/${f}`);
  return set;
}

async function main() {
  console.log("Loading resources...");
  const papers: any[] = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  const validDiagrams = getRealDiagramPaths();

  // Pre-load all lessons
  const allLessons = await db.query.lessons.findMany({ columns: { id: true, title: true } });
  const lessonByTitle = new Map(allLessons.map(l => [l.title, l.id]));
  console.log(`  Lessons: ${lessonByTitle.size}`);

  // Pre-load ALL existing theory question texts for dedup
  const existing = await db.query.challenges.findMany({
    columns: { question: true },
    where: eq(schema.challenges.type, "THEORY"),
  });
  const existingSet = new Set(existing.map(e => (e.question ?? "").trim().toLowerCase()));
  console.log(`  Existing THEORY: ${existingSet.size}`);
  console.log(`  Valid diagrams: ${validDiagrams.size}`);
  console.log(`  Papers to process: ${papers.length}\n`);

  let totalAdded = 0, totalSkipped = 0, totalNoLesson = 0;
  const bySubject: Record<string, { added: number; skipped: number; noLesson: number }> = {};

  let batch: any[] = [];
  const flush = async () => {
    if (!batch.length) return;
    await db.insert(schema.challenges).values(batch);
    totalAdded += batch.length;
    batch = [];
  };

  for (const paper of papers) {
    const code = getSubjectCode(paper.source);
    if (!bySubject[code]) bySubject[code] = { added: 0, skipped: 0, noLesson: 0 };
    const paperRef = parsePaperRef(paper.source);
    let paperAdded = 0;

    for (const q of (paper.questions ?? [])) {
      const key = (q.question ?? "").trim().toLowerCase();
      if (!key) continue;

      if (existingSet.has(key)) { totalSkipped++; bySubject[code].skipped++; continue; }

      const topicTitle = normaliseTopic(code, q.topic ?? "");
      const lessonId = lessonByTitle.get(topicTitle);
      if (!lessonId) { totalNoLesson++; bySubject[code].noLesson++; continue; }

      const imageSrc = q.imageSrc && validDiagrams.has(q.imageSrc) ? q.imageSrc : null;
      existingSet.add(key);

      batch.push({
        lessonId,
        type: "THEORY",
        topic: topicTitle,
        question: q.question,
        markingSchemeAnswer: q.markingSchemeAnswer ?? null,
        totalMarks: q.totalMarks ?? 1,
        imageSrc,
        paperRef: paperRef ?? null,
        order: typeof q.number === "number" ? q.number : 1,
      });
      paperAdded++;
      bySubject[code].added++;

      if (batch.length >= BATCH_SIZE) await flush();
    }

    if (paperAdded > 0) process.stdout.write(`  ${paper.source} +${paperAdded}\n`);
  }
  await flush();

  console.log("\n========================================");
  console.log("SEEDING COMPLETE");
  console.log("========================================");
  console.log(`Total Added    : ${totalAdded}`);
  console.log(`Total Skipped  : ${totalSkipped} (already in DB)`);
  console.log(`Total No Lesson: ${totalNoLesson}\n`);
  console.log("By Subject:");
  for (const [code, s] of Object.entries(bySubject)) {
    console.log(`  ${code}: +${s.added} added | ${s.skipped} dup | ${s.noLesson} no-lesson`);
  }
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
