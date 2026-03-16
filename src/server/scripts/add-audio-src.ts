import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import db from "@/server/db/drizzle";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS audio_src text`);
    console.log("✅ audio_src column added to challenges table");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
