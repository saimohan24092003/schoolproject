import db from '../db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  // Mark distribution for 0580 to understand level filtering
  const rows = await db.execute(sql`
    SELECT 
      CASE 
        WHEN c.total_marks BETWEEN 1 AND 3 THEN 'L1: 1-3 marks'
        WHEN c.total_marks BETWEEN 4 AND 6 THEN 'L2: 4-6 marks'
        WHEN c.total_marks >= 7 THEN 'L3: 7+ marks'
        ELSE 'Unknown'
      END as level_bucket,
      count(*) as cnt
    FROM challenges c
    JOIN lessons l ON c.lesson_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN courses co ON u.course_id = co.id
    WHERE co.title LIKE '%0580%' AND c.type = 'THEORY'
    GROUP BY 1 ORDER BY 1
  `);
  console.log('0580 mark distribution (for level filtering):');
  for (const r of rows.rows) console.log(` ${r.level_bucket}: ${r.cnt}`);
  
  const rows2 = await db.execute(sql`
    SELECT 
      CASE 
        WHEN c.total_marks BETWEEN 1 AND 3 THEN 'L1: 1-3 marks'
        WHEN c.total_marks BETWEEN 4 AND 6 THEN 'L2: 4-6 marks'
        WHEN c.total_marks >= 7 THEN 'L3: 7+ marks'
        ELSE 'Unknown'
      END as level_bucket,
      count(*) as cnt
    FROM challenges c
    JOIN lessons l ON c.lesson_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN courses co ON u.course_id = co.id
    WHERE co.title LIKE '%0680%' AND c.type = 'THEORY'
    GROUP BY 1 ORDER BY 1
  `);
  console.log('\n0680 mark distribution:');
  for (const r of rows2.rows) console.log(` ${r.level_bucket}: ${r.cnt}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
