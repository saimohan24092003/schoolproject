import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function main() {
  console.log("🟠 Seeding English as a Second Language (0510)...");

  const [course] = await db.insert(schema.courses).values({
    title: "English as a Second Language (0510)",
    imageSrc: "/hero.svg",
  }).returning();

  console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

  const curriculum = [
    {
      unit: "Unit 1: Reading Comprehension",
      lessons: [
        { title: "1.1 Skimming and scanning", desc: "Techniques for quickly locating information in a text. Identifying the main idea and key details." },
        { title: "1.2 Understanding vocabulary in context", desc: "Inferring word meanings from context. Synonyms, antonyms and word families." },
        { title: "1.3 Note-making", desc: "Identifying and selecting relevant information. Organising notes under headings." },
        { title: "1.4 Summary writing", desc: "Selecting and re-expressing key points concisely. Avoiding repetition and irrelevant detail." },
        { title: "1.5 Inferring meaning and attitude", desc: "Reading between the lines. Identifying the writer's purpose, tone and attitude." },
      ],
    },
    {
      unit: "Unit 2: Writing Skills",
      lessons: [
        { title: "2.1 Formal letters and emails", desc: "Structure and conventions of formal correspondence. Appropriate register and vocabulary." },
        { title: "2.2 Informal letters and emails", desc: "Friendly tone, contractions and colloquial language. Structure of informal writing." },
        { title: "2.3 Articles and reports", desc: "Writing for a target audience. Structuring an article with subheadings. Formal report format." },
        { title: "2.4 Directed writing", desc: "Selecting information from sources and repurposing it for a new task. Adapting style and register." },
        { title: "2.5 Continuous writing — narrative and descriptive", desc: "Planning and structuring creative writing. Use of descriptive language, imagery and engaging openings." },
        { title: "2.6 Continuous writing — argumentative and discursive", desc: "Presenting and justifying a point of view. Structuring an argument with for/against perspectives." },
      ],
    },
    {
      unit: "Unit 3: Vocabulary & Grammar",
      lessons: [
        { title: "3.1 Tenses and verb forms", desc: "Simple, continuous and perfect tenses. Passive voice. Conditionals." },
        { title: "3.2 Sentence structure", desc: "Simple, compound and complex sentences. Relative clauses. Participle phrases." },
        { title: "3.3 Punctuation and spelling", desc: "Correct use of commas, apostrophes, colons and semicolons. Common spelling rules." },
        { title: "3.4 Prepositions and collocations", desc: "Common preposition patterns. Fixed phrases and collocations in formal English." },
        { title: "3.5 Vocabulary building", desc: "Topic-based vocabulary (environment, health, technology, etc.). Word formation (prefixes, suffixes)." },
      ],
    },
    {
      unit: "Unit 4: Listening Skills",
      lessons: [
        { title: "4.1 Listening for specific information", desc: "Completing notes and forms. Identifying key facts, numbers and names from spoken text." },
        { title: "4.2 Understanding the main idea", desc: "Identifying gist and main purpose of spoken passages. Recognising topic changes." },
        { title: "4.3 Inferring speaker attitude", desc: "Detecting emotion, opinion and purpose from tone and word choice." },
        { title: "4.4 Extended listening", desc: "Following longer conversations and talks. Distinguishing between speakers and their views." },
      ],
    },
    {
      unit: "Unit 5: Speaking Skills",
      lessons: [
        { title: "5.1 Pronunciation and fluency", desc: "Word stress, intonation patterns and connected speech. Speaking at a natural pace." },
        { title: "5.2 Expressing opinions", desc: "Agreeing, disagreeing and justifying views politely. Discourse markers and linking phrases." },
        { title: "5.3 Describing and explaining", desc: "Describing images, data and experiences clearly. Using appropriate vocabulary and tense." },
        { title: "5.4 Discussion and debate", desc: "Taking turns, building on others' ideas, and summarising. Discussion strategies." },
      ],
    },
  ];

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];
    const [unit] = await db.insert(schema.units).values({
      title: item.unit,
      description: `Cambridge IGCSE English as a Second Language — ${item.unit}`,
      courseId: course.id,
      order: i + 1,
    }).returning();

    for (let j = 0; j < item.lessons.length; j++) {
      const l = item.lessons[j];
      await db.insert(schema.lessons).values({
        unitId: unit.id,
        title: l.title,
        description: l.desc,
        order: j + 1,
      });
    }
    console.log(`✅ Seeded ${item.unit}`);
  }

  console.log("🟢 English as a Second Language (0510) seeded successfully!");
}

main().catch(console.error);
