import "dotenv/config";
import db from "./src/server/db/drizzle";
import { courses } from "./src/server/db/schema";

async function listCourses() {
  console.log("Listing all courses:");
  const allCourses = await db.select().from(courses);
  console.table(allCourses);
  process.exit(0);
}

listCourses().catch(err => {
  console.error(err);
  process.exit(1);
});
