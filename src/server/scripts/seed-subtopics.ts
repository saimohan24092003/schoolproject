import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const SUB_TOPIC_MAPPING = [
  { 
    lessonTitle: "B1. Characteristics of living organisms", 
    topics: ["MRS GREN Definitions", "Metabolism Basics", "Excretion vs Egestion"] 
  },
  { 
    lessonTitle: "B2. Cells", 
    topics: ["Cell Wall & Membrane", "Chloroplasts & Vacuoles", "Magnification Formula", "Animal vs Plant Cells"] 
  },
  { 
    lessonTitle: "B3. Biological molecules", 
    topics: ["Carbohydrate Structure", "Protein & Amino Acids", "Iodine Test", "Benedict's Test"] 
  },
  { 
    lessonTitle: "B4. Enzymes", 
    topics: ["Active Site Theory", "Temperature Effects", "pH Denaturation", "Lock and Key Model"] 
  },
  { 
    lessonTitle: "P4. Electricity and magnetism", 
    topics: ["Series vs Parallel", "Ohm's Law (V=IR)", "Circuit Symbols", "Resistance Factors"] 
  }
];

async function main() {
  console.log("🟠 Populating Sub-Topic metadata for Curriculum View...");

  for (const mapping of SUB_TOPIC_MAPPING) {
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.title, mapping.lessonTitle),
      with: { challenges: true }
    });

    if (lesson && lesson.challenges.length > 0) {
      // Distribute sub-topics across challenges in this lesson
      for (let i = 0; i < lesson.challenges.length; i++) {
        const subTopic = mapping.topics[i % mapping.topics.length];
        await db.update(schema.challenges)
          .set({ topic: subTopic })
          .where(eq(schema.challenges.id, lesson.challenges[i].id));
      }
      console.log(`✅ Seeded ${mapping.topics.length} sub-topics for: ${mapping.lessonTitle}`);
    } else {
      console.log(`⚠️ Skipping ${mapping.lessonTitle} (No challenges found)`);
    }
  }

  console.log("🟢 Sub-Topic seeding complete!");
}

main().catch(console.error);
