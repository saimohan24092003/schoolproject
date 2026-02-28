import "dotenv/config";
import db from "./src/server/db/drizzle";
import { lessons, units, challenges } from "./src/server/db/schema";
import { count, eq, isNotNull } from "drizzle-orm";

async function checkData() {
  console.log("Checking for sub-topics in challenges table...");
  
  const topicsCount = await db.select({ count: count() })
    .from(challenges)
    .where(isNotNull(challenges.topic));
  
  console.log(`Total challenges with a sub-topic assigned: ${topicsCount[0].count}`);

  const sampleWithTopics = await db.select({
    id: challenges.id,
    question: challenges.question,
    topic: challenges.topic,
    lessonId: challenges.lessonId
  })
  .from(challenges)
  .where(isNotNull(challenges.topic))
  .limit(5);

  console.log("Sample challenges with sub-topics:");
  console.table(sampleWithTopics);

  // Check if any lesson in the active course (likely course ID 2 or 3) has sub-topics
  const lessonsWithSubtopics = await db.select({
    lessonTitle: lessons.title,
    challengesCount: count(challenges.id),
    subTopics: challenges.topic // This is just one, but we'll see
  })
  .from(lessons)
  .leftJoin(challenges, eq(lessons.id, challenges.lessonId))
  .where(isNotNull(challenges.topic))
  .groupBy(lessons.title, challenges.topic)
  .limit(10);

  console.log("Lessons that actually have sub-topic data:");
  console.table(lessonsWithSubtopics);

  process.exit(0);
}

checkData().catch(err => {
  console.error(err);
  process.exit(1);
});
