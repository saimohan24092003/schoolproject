import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import db from "@/server/db/drizzle";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/server/db/schema";
import * as fs from "fs";

async function main() {
  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.title, "Hindi as a Second Language (0549)"),
    with: { units: { with: { lessons: true } } },
  });
  if (!course) { console.log("Course not found"); process.exit(1); }

  const lessonIds = course.units.flatMap(u => u.lessons.map(l => l.id));
  await db.delete(schema.challenges).where(inArray(schema.challenges.lessonId, lessonIds));
  console.log("Deleted existing Hindi challenges");

  const papers = JSON.parse(fs.readFileSync("hindi_seeds_0549.json", "utf-8"));
  const allLessons = await db.query.lessons.findMany({ columns: { id: true, title: true } });
  const lessonByTitle = new Map(allLessons.map(l => [l.title, l.id]));

  let added = 0, noLesson = 0;
  for (const paper of papers) {
    for (const q of (paper.questions ?? [])) {
      const key = (q.question ?? "").trim();
      if (!key) continue;
      const lessonId = lessonByTitle.get(q.topic);
      if (!lessonId) { noLesson++; continue; }
      await db.insert(schema.challenges).values({
        lessonId,
        type: q.questionType === "SELECT" ? "SELECT" : "THEORY",
        topic: q.topic,
        question: q.question,
        markingSchemeAnswer: q.markingSchemeAnswer ?? null,
        totalMarks: q.totalMarks ?? 1,
        imageSrc: q.imageSrc ?? null,
        audioSrc: q.audioSrc ?? null,
        paperRef: paper.source,
        order: added + 1,
      });
      added++;
    }
  }
  console.log(`✅ Re-seeded: ${added} questions | No lesson: ${noLesson}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
