import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function syncAnswers() {
    const dataPath = "./bulk_seeds_progress.json";
    if (!fs.existsSync(dataPath)) return;

    const papers = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    console.log("🟠 Syncing verified answers to database...");

    for (const paper of papers) {
        for (const q of paper.questions) {
            if (!q.correctAnswer) continue;

            // 1. Find the challenge
            const challenge = await db.query.challenges.findFirst({
                where: and(
                    eq(schema.challenges.question, q.question),
                    eq(schema.challenges.order, q.number)
                )
            });

            if (!challenge) continue;

            // 2. Reset all options to incorrect
            await db.update(schema.challengeOptions)
                .set({ correct: false })
                .where(eq(schema.challengeOptions.challengeId, challenge.id));

            // 3. Mark the correct option
            // correctAnswer is "A", "B", "C", or "D"
            const correctIndex = q.correctAnswer.charCodeAt(0) - 65; // A=0, B=1...
            
            const options = await db.query.challengeOptions.findMany({
                where: eq(schema.challengeOptions.challengeId, challenge.id),
                orderBy: (options, { asc }) => [asc(options.id)]
            });

            if (options[correctIndex]) {
                await db.update(schema.challengeOptions)
                    .set({ correct: true })
                    .where(eq(schema.challengeOptions.id, options[correctIndex].id));
            }
        }
    }

    console.log("🟢 Answer Synchronization Complete!");
}

syncAnswers().catch(console.error);
