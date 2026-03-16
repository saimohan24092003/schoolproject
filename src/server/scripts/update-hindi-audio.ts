/**
 * Updates existing Hindi 0549 challenges to add audioSrc for listening paper questions.
 * Run: npx tsx --env-file=.env.local src/server/scripts/update-hindi-audio.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import db from "@/server/db/drizzle";
import { eq, and, like } from "drizzle-orm";
import * as schema from "@/server/db/schema";
import * as fs from "fs";

const SEEDS_FILE = "hindi_seeds_0549.json";

async function main() {
  if (!fs.existsSync(SEEDS_FILE)) {
    console.log("No seeds file found");
    return;
  }
  const papers = JSON.parse(fs.readFileSync(SEEDS_FILE, "utf-8"));
  let updated = 0;

  for (const paper of papers) {
    const questions = paper.questions ?? [];
    for (const q of questions) {
      if (!q.audioSrc) continue;
      // Find this challenge by question text + paperRef
      const existing = await db.query.challenges.findFirst({
        where: and(
          like(schema.challenges.question, q.question.slice(0, 80) + "%"),
          eq(schema.challenges.paperRef, paper.source),
        ),
        columns: { id: true, audioSrc: true },
      });
      if (existing && !existing.audioSrc) {
        await db.update(schema.challenges)
          .set({ audioSrc: q.audioSrc })
          .where(eq(schema.challenges.id, existing.id));
        updated++;
      }
    }
  }
  console.log(`✅ Updated ${updated} Hindi challenges with audioSrc`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
