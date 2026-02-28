import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import { infer0653TopicFromQuestion, isOfficial0653Topic } from "@/lib/syllabus/combined-science-2025";

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
    console.log(`🟠 Syncing ${papers.length} papers to database...`);
    
    let newQuestionsAdded = 0;

    for (const paper of papers) {
        console.log(`Processing ${paper.source}...`);
        for (const q of paper.questions) {
            const normalizedTopic = infer0653TopicFromQuestion(q.question || "", q.topic || "");
            if (!normalizedTopic) continue;
            if (!isOfficial0653Topic(normalizedTopic)) continue;

            // Find the lesson (topic)
            const lesson = await db.query.lessons.findFirst({
                where: eq(schema.lessons.title, normalizedTopic)
            });

            if (!lesson) continue;

            // Sanitize order: "1(a)" -> 1
            const rawOrder = q.number;
            let orderNum = 1;
            if (typeof rawOrder === 'number') {
                orderNum = rawOrder;
            } else if (typeof rawOrder === 'string') {
                const match = rawOrder.match(/\d+/);
                orderNum = match ? parseInt(match[0]) : 1;
            }

            // Check if question already exists to prevent duplicates
            const existingChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(schema.challenges.lessonId, lesson.id),
                    eq(schema.challenges.question, q.question)
                )
            });

            if (existingChallenge) continue; // Skip if already in DB

            // Insert the challenge
            const [challenge] = await db.insert(schema.challenges).values({
                lessonId: lesson.id,
                type: "SELECT",
                question: q.question,
                topic: normalizedTopic,
                explanation: q.explanation || null,
                imageSrc: q.imageSrc || null,
                order: orderNum,
            }).returning();

            newQuestionsAdded++;

            // Insert options and mark the correct one immediately if available
            if (q.options && q.options.length > 0) {
                // If correctAnswer is "A", "B", etc., calculate index. Otherwise default to 0.
                let correctIndex = 0;
                if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                    const charCode = q.correctAnswer.charCodeAt(0);
                    if (charCode >= 65 && charCode <= 68) {
                        correctIndex = charCode - 65; // A=0, B=1, C=2, D=3
                    }
                }

                const optionValues = q.options.map((text: string, index: number) => ({
                    challengeId: challenge.id,
                    text,
                    correct: index === correctIndex,
                }));

                await db.insert(schema.challengeOptions).values(optionValues);
            }
        }
    }

    console.log(`🟢 Sync Complete! Added ${newQuestionsAdded} new questions.`);
}

seedFromBulk().catch(console.error);
