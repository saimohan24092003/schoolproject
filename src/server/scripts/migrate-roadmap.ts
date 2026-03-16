/**
 * Migration: Add roadmap columns + user_roadmap_progress table
 * Run: npx tsx src/server/scripts/migrate-roadmap.ts
 */
import dns from "node:dns";
import { neon } from "@neondatabase/serverless";

// DNS patch (same as drizzle.ts)
const originalLookup = dns.lookup.bind(dns);
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (hostname && hostname.includes("neon.tech")) {
    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "8.8.4.4"]);
    const opts = typeof options === "object" && options !== null ? options : {};
    const returnAll = opts.all === true;
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses?.length) return originalLookup(hostname, options, callback);
      const cb = typeof options === "function" ? options : callback;
      if (returnAll) cb(null, addresses.map((a: string) => ({ address: a, family: 4 })));
      else cb(null, addresses[0], 4);
    });
  } else {
    originalLookup(hostname, options, callback);
  }
};

import "dotenv/config";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Running roadmap migration...");

  // 1. Add new columns to user_topic_setup (if not exist)
  await sql`
    ALTER TABLE user_topic_setup
      ADD COLUMN IF NOT EXISTS paper_preference text DEFAULT 'both',
      ADD COLUMN IF NOT EXISTS self_assessment   text DEFAULT 'starter',
      ADD COLUMN IF NOT EXISTS target_grade      text DEFAULT 'A*',
      ADD COLUMN IF NOT EXISTS start_roadmap_level integer DEFAULT 1
  `;
  console.log("✓ user_topic_setup columns added");

  // 2. Create user_roadmap_progress table (if not exist)
  await sql`
    CREATE TABLE IF NOT EXISTS user_roadmap_progress (
      id            serial PRIMARY KEY,
      user_id       text NOT NULL,
      subject_code  text NOT NULL,
      paper_type    text NOT NULL DEFAULT 'both',
      roadmap_level integer NOT NULL,
      completed     boolean NOT NULL DEFAULT false,
      score         integer NOT NULL DEFAULT 0,
      xp_earned     integer NOT NULL DEFAULT 0,
      attempts      integer NOT NULL DEFAULT 0,
      completed_at  timestamp,
      updated_at    timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ user_roadmap_progress table created");

  console.log("Migration complete!");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
