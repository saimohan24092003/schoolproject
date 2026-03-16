import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import db from "@/server/db/drizzle";
import { eq } from "drizzle-orm";
import * as schema from "@/server/db/schema";

async function main() {
  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.title, "Hindi as a Second Language (0549)"),
    with: { units: { with: { lessons: { with: { challenges: true } } } } },
  });

  if (!course) { console.log("❌ Course not found"); process.exit(1); }
  console.log(`✅ Course: ${course.title} (ID: ${course.id})`);
  console.log(`   Units: ${course.units.length}`);

  let totalQ = 0, withAudio = 0, withImage = 0;
  for (const unit of course.units) {
    let unitQ = 0;
    for (const lesson of unit.lessons) {
      unitQ += lesson.challenges.length;
      for (const ch of lesson.challenges) {
        if (ch.audioSrc) withAudio++;
        if (ch.imageSrc) withImage++;
      }
    }
    totalQ += unitQ;
    console.log(`   ${unit.title}: ${unitQ}q`);
  }

  console.log(`\n📊 Total questions: ${totalQ}`);
  console.log(`🎧 With audioSrc: ${withAudio}`);
  console.log(`🖼️  With imageSrc: ${withImage}`);

  // Sample a few with audio
  const sampleAudio = await db.query.challenges.findMany({
    where: eq(schema.challenges.type, "THEORY"),
    columns: { id: true, question: true, audioSrc: true, paperRef: true, topic: true },
    limit: 3,
  });
  console.log("\nSample questions with audio:");
  sampleAudio.filter(q => q.audioSrc).slice(0, 3).forEach(q => {
    console.log(`  [${q.id}] ${q.topic}`);
    console.log(`         Q: ${(q.question || "").slice(0, 60)}...`);
    console.log(`         audio: ${q.audioSrc}`);
  });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
