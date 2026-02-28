import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

/**
 * Migration to add marking_scheme_answer to challenges table
 * and ensure support for Theory questions.
 */
export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE challenges 
    ADD COLUMN IF NOT EXISTS marking_scheme_answer TEXT,
    ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 1;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE challenges 
    DROP COLUMN IF EXISTS marking_scheme_answer,
    DROP COLUMN IF EXISTS total_marks;
  `);
}
