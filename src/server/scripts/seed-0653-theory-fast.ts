/**
 * Fast seed: 0653 theory questions only
 * Uses theory_seeds_0653_only.json
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as schema from "@/server/db/schema";
import * as fs from "fs";
import * as path from "path";
import { eq, and, inArray } from "drizzle-orm";
import db from "@/server/db/drizzle";

const PROGRESS_FILE = "theory_seeds_0653_only.json";
const DIAGRAMS_PUBLIC = path.join(process.cwd(), "public", "diagrams");

// DB lessons use OLD Cambridge numbering.
// P6/alternative-to-practical papers use 2025-2027 numbering — map those here.
const TOPIC_MAP: Record<string, string> = {
  // Biology (2025-2027 → OLD DB numbering)
  "B3. Movement into and out of cells":     "B2. Cells",
  "B4. Biological molecules":               "B3. Biological molecules",
  "B5. Enzymes":                            "B4. Enzymes",
  "B6. Plant nutrition":                    "B5. Plant nutrition",
  "B7. Animal nutrition":                   "B6. Animal nutrition",
  "B8. Transport in plants":                "B7. Transport",
  "B9. Transport in animals":               "B7. Transport",
  "B11. Gas exchange in humans":            "B8. Gas exchange and respiration",
  "B12. Respiration":                       "B8. Gas exchange and respiration",
  // Chemistry
  "C3. Stoichiometry":                      "C4. Stoichiometry",
  "C4. Electrochemistry":                   "C5. Electricity and chemistry",
  "C5. Chemical energetics":                "C6. Energy changes in reactions",
  "C6. Chemical reactions":                 "C7. Chemical reactions",
  "C7. Acids, bases and salts":             "C8. Acids, bases and salts",
  "C9. Metals":                             "C10. Metals",
  "C12. Experimental techniques and chemical analysis": "C2. Experimental techniques",
  // Physics
  "P4. Electricity":                        "P4. Electricity and magnetism",
  "P5. Space physics":                      "P6. Space physics",
};

function normaliseTopic(raw: string): string {
  return TOPIC_MAP[raw] ?? raw;
}

function parsePaperRef(source: string): string | null {
  const m = source.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)\.pdf/i);
  if (!m) return null;
  const [, , season, year2, paperNum] = m;
  const year = `20${year2}`;
  const seasonLabel = season.toLowerCase() === "m" ? "March" : season.toLowerCase() === "s" ? "May/June" : "Oct/Nov";
  return `Paper ${paperNum} · ${seasonLabel} ${year}`;
}

function getRealDiagramPaths(): Set<string> {
  const set = new Set<string>();
  if (fs.existsSync(DIAGRAMS_PUBLIC)) {
    for (const f of fs.readdirSync(DIAGRAMS_PUBLIC)) {
      if (f.toLowerCase().endsWith(".png")) set.add(`/diagrams/${f}`);
    }
  }
  return set;
}

async function main() {
  const papers = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  const validDiagrams = getRealDiagramPaths();

  // Pre-load all 0653 lessons into a map for fast lookup
  const allLessons = await db.query.lessons.findMany({ columns: { id: true, title: true } });
  const lessonByTitle = new Map(allLessons.map(l => [l.title, l.id]));
  console.log(`📚 ${lessonByTitle.size} lessons loaded`);

  // Pre-load existing questions to skip dedup queries
  const existing = await db.query.challenges.findMany({
    columns: { id: true, question: true },
    where: eq(schema.challenges.type, "THEORY"),
  });
  const existingQuestions = new Set(existing.map(e => e.question.trim().toLowerCase()));
  console.log(`⚡ ${existingQuestions.size} existing THEORY questions (dedup cache)`);
  console.log(`📄 ${papers.length} papers to process\n`);

  let added = 0, skipped = 0, noLesson = 0;
  const noLessonTopics = new Map<string, number>();
  const BATCH_SIZE = 50;
  let batch: any[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await db.insert(schema.challenges).values(batch);
    added += batch.length;
    batch = [];
  };

  for (const paper of papers) {
    process.stdout.write(`📝 ${paper.source} (${paper.questions.length}q) `);
    const paperRef = parsePaperRef(paper.source);
    let paperAdded = 0;

    for (const q of paper.questions) {
      const key = (q.question ?? "").trim().toLowerCase();
      if (!key) continue;
      if (existingQuestions.has(key)) { skipped++; continue; }

      const topicTitle = normaliseTopic(q.topic);
      const lessonId = lessonByTitle.get(topicTitle);
      if (!lessonId) { noLesson++; noLessonTopics.set(topicTitle, (noLessonTopics.get(topicTitle)||0)+1); continue; }

      const imageSrc = q.imageSrc && validDiagrams.has(q.imageSrc) ? q.imageSrc : null;
      existingQuestions.add(key); // prevent re-adding in same run
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
      if (batch.length >= BATCH_SIZE) await flush();
    }
    console.log(`→ +${paperAdded}`);
  }
  await flush();

  console.log(`\n✅ Done! Added: ${added} | Skipped (dup): ${skipped} | No lesson: ${noLesson}`);
  if (noLessonTopics.size > 0) {
    console.log('\n❌ Topics with no lesson match:');
    Array.from(noLessonTopics.entries()).sort((a,b)=>b[1]-a[1]).forEach(([t,c]) => console.log(`  ${c}q  "${t}"`));
    console.log('\n📚 Available lesson titles (B/C/P):');
    Array.from(lessonByTitle.keys()).filter(t=>/^[BCP]\d/.test(t)).sort().forEach(t=>console.log(' ',t));
  }
}

main().catch(e => { console.error("🔴", e); process.exit(1); });
