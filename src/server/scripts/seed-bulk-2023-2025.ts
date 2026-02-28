import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as fs from "fs";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function seedFromBulk() {
    const dataPath = "./bulk_seeds_progress.json";
    if (!fs.existsSync(dataPath)) {
        console.log("No bulk data found.");
        return;
    }

    const papers = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    console.log(`🟠 Seeding ${papers.length} papers...`);

    for (const paper of papers) {
        console.log(`Processing ${paper.source}...`);
        for (const q of paper.questions) {
            // 1. Find the lesson (topic) in the DB
            const lesson = await db.query.lessons.findFirst({
                where: eq(schema.lessons.title, q.topic)
            });

            if (!lesson) {
                console.warn(`⚠️ Topic not found in DB: ${q.topic}`);
                continue;
            }

            // 2. Insert the challenge
            // Sanitize order: "1(a)" -> 1
            const rawOrder = q.number;
            let orderNum = 1;
            if (typeof rawOrder === 'number') {
                orderNum = rawOrder;
            } else if (typeof rawOrder === 'string') {
                const match = rawOrder.match(/\d+/);
                orderNum = match ? parseInt(match[0]) : 1;
            }

            const [challenge] = await db.insert(schema.challenges).values({
                lessonId: lesson.id,
                type: "SELECT",
                question: q.question,
                explanation: q.explanation || null,
                imageSrc: q.imageSrc || null,
                order: orderNum,
            }).returning();

            // 3. Insert the options if they exist
            if (q.options && q.options.length > 0) {
              const optionValues = q.options.map((text: string, index: number) => ({
                  challengeId: challenge.id,
                  text,
                  correct: index === 0, // Placeholder
              }));

              await db.insert(schema.challengeOptions).values(optionValues);
            }
        }
    }

    console.log("🟢 Seeding Complete!");
}

seedFromBulk().catch(console.error);
