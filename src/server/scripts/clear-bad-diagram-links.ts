/**
 * clear-bad-diagram-links.ts
 *
 * Nulls out imageSrc for any challenge that references an old-format
 * diagram file (containing ".pdf_" in the path, e.g. 0653_m21_qp_32.pdf_2_0.png).
 * These were extracted by raw page number — not by question — so they are
 * unreliable and often contain barcodes / cover pages.
 *
 * Safe: only touches old-format paths. Proper _p{page}_q{question}.png
 * images are untouched.
 *
 * Run:  npx tsx src/server/scripts/clear-bad-diagram-links.ts
 */

import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { like, isNotNull } from "drizzle-orm";
import * as schema from "@/server/db/schema";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function main() {
  // Find all challenges with old-format imageSrc (contains ".pdf_")
  const badRecords = await db.query.challenges.findMany({
    where: (c, { and, like, isNotNull }) =>
      and(isNotNull(c.imageSrc), like(c.imageSrc, "%.pdf_%")),
    columns: { id: true, imageSrc: true, question: true },
  });

  console.log(`🔍 Found ${badRecords.length} challenges with old-format (bad) diagram links`);

  if (badRecords.length === 0) {
    console.log("✅ Nothing to clean up.");
    return;
  }

  // Log each one before clearing
  for (const r of badRecords) {
    console.log(`  ❌ ID ${r.id}: ${r.imageSrc}`);
    console.log(`     Q: ${r.question.slice(0, 80)}...`);
  }

  // Null them all out
  let cleared = 0;
  for (const r of badRecords) {
    await db
      .update(schema.challenges)
      .set({ imageSrc: null })
      .where(like(schema.challenges.imageSrc!, "%.pdf_%"));
    cleared++;
    break; // one bulk update is enough — the WHERE already matches all
  }

  // Verify
  const remaining = await db.query.challenges.findMany({
    where: (c, { and, like, isNotNull }) =>
      and(isNotNull(c.imageSrc), like(c.imageSrc, "%.pdf_%")),
    columns: { id: true },
  });

  console.log(`\n✅ Cleared ${badRecords.length} bad diagram links`);
  console.log(`🔎 Remaining bad links after patch: ${remaining.length}`);
}

main().catch((err) => {
  console.error("🔴 Fatal:", err);
  process.exit(1);
});
