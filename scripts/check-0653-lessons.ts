import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const lessons = await sql`
    SELECT l.id, l.title, u.title as unit
    FROM lessons l
    JOIN units u ON u.id = l.unit_id
    JOIN courses c ON c.id = u.course_id
    WHERE c.title = 'Combined Science (0653)'
    ORDER BY u.title, l.order
  `;
  console.log(`\n=== 0653 Lessons in DB: ${lessons.length} ===`);
  lessons.forEach((l: any) => console.log(`  [${l.unit}] ${l.title}`));

  const theoryCount = await sql`
    SELECT COUNT(*) as cnt FROM challenges ch
    JOIN lessons l ON l.id = ch.lesson_id
    JOIN units u ON u.id = l.unit_id
    JOIN courses c ON c.id = u.course_id
    WHERE c.title = 'Combined Science (0653)' AND ch.type = 'THEORY'
  `;
  console.log(`\n0653 THEORY challenges total: ${theoryCount[0].cnt}`);
}

main().catch(console.error);
