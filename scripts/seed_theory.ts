import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import dns from "node:dns";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { courses, units, lessons, challenges } from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

import * as schema from "../src/server/db/schema";

// Patch dns.lookup to use public DNS (8.8.8.8) for neon.tech hostnames.
const originalLookup = dns.lookup.bind(dns);
(dns as any).lookup = function (
  hostname: string,
  options: any,
  callback: any
) {
  if (hostname && hostname.includes("neon.tech")) {
    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "8.8.4.4"]);
    const opts =
      typeof options === "object" && options !== null ? options : {};
    const returnAll = opts.all === true;
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || !addresses.length) {
        return originalLookup(hostname, options, callback);
      }
      const cb = typeof options === "function" ? options : callback;
      if (returnAll) {
        cb(null, addresses.map((a: string) => ({ address: a, family: 4 })));
      } else {
        cb(null, addresses[0], 4);
      }
    });
  } else {
    originalLookup(hostname, options, callback);
  }
};

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const dataPath = path.join(process.cwd(), "theory_seeds_progress.json");
  if (!fs.existsSync(dataPath)) {
    console.log("No theory_seeds_progress.json found.");
    return;
  }

  const theoryData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  // 1. Get or Create Course: Environmental Management (0680)
  let course = await db.query.courses.findFirst({
    where: eq(courses.title, "Environmental Management (0680)"),
  });

  if (!course) {
    const [inserted] = await db.insert(courses).values({
      title: "Environmental Management (0680)",
      imageSrc: "/hero.svg", // Placeholder
    }).returning();
    course = inserted;
    console.log("Created course: Environmental Management (0680)");
  }

  for (const paper of theoryData) {
    console.log(`Seeding questions from ${paper.source}...`);

    for (const q of paper.questions) {
      // 2. Map Topic to Unit
      // Example topic: "1.1 Rocks and minerals" -> Unit: "1. Rocks and minerals"
      const topicMatch = q.topic.match(/^(\d+)\.(.*)/);
      const unitTitle = topicMatch ? `Unit ${topicMatch[1]}` : "General Topics";
      const lessonTitle = q.topic;

      // Find or Create Unit
      let unit = await db.query.units.findFirst({
        where: eq(units.title, unitTitle),
      });

      if (!unit) {
        const [inserted] = await db.insert(units).values({
          title: unitTitle,
          description: `Study of ${unitTitle}`,
          courseId: course.id,
          order: topicMatch ? parseInt(topicMatch[1]) : 99,
        }).returning();
        unit = inserted;
      }

      // Find or Create Lesson
      let lesson = await db.query.lessons.findFirst({
        where: eq(lessons.title, lessonTitle),
      });

      if (!lesson) {
        const [inserted] = await db.insert(lessons).values({
          title: lessonTitle,
          unitId: unit.id,
          order: 1, // Default order
        }).returning();
        lesson = inserted;
      }

      // 3. Insert Challenge (Theory Type)
      await db.insert(challenges).values({
        lessonId: lesson.id,
        type: "THEORY",
        topic: q.topic,
        question: q.question,
        markingSchemeAnswer: q.markingSchemeAnswer,
        totalMarks: q.totalMarks || 1,
        imageSrc: q.imageSrc,
        order: 1, // Simplified order
      });
    }
  }

  console.log("Theory seeding complete.");
}

main().catch(console.error);
