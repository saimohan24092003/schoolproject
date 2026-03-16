import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function main() {
  console.log("🟠 Seeding English First Language (0500)...");

  const [course] = await db.insert(schema.courses).values({
    title: "English First Language (0500)",
    imageSrc: "/hero.svg",
  }).returning();

  console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

  const curriculum = [
    {
      unit: "Unit 1: Reading for Ideas",
      lessons: [
        { title: "1.1 Reading for ideas — purpose and audience", desc: "Identifying the writer's purpose, intended audience and the effect of choices made. Skimming and scanning techniques." },
        { title: "1.2 Reading for ideas — tone, attitude and bias", desc: "Recognising the writer's tone (e.g. ironic, sympathetic, critical). Identifying bias and perspective in non-fiction texts." },
        { title: "1.3 Reading for meaning — inference and deduction", desc: "Reading between the lines. Supporting inferences with textual evidence. Distinguishing fact from opinion." },
        { title: "1.4 Reading for meaning — language and effect", desc: "Analysing how writers use language devices (imagery, repetition, contrast) and their effect on the reader." },
        { title: "1.5 Note-making", desc: "Selecting and organising relevant information under given headings. Avoiding repetition and irrelevant detail. Using own words." },
        { title: "1.6 Summary writing", desc: "Writing a concise summary of key points from one or two texts. Staying within a word limit. Avoiding quotation." },
      ],
    },
    {
      unit: "Unit 2: Directed Writing",
      lessons: [
        { title: "2.1 Directed writing — adapting style and register", desc: "Writing in a specified form (letter, report, speech, article) for a given audience. Adjusting formality and vocabulary." },
        { title: "2.2 Directed writing — selecting and re-using information", desc: "Drawing on a given passage to produce a new text. Transforming information rather than copying." },
      ],
    },
    {
      unit: "Unit 3: Composition",
      lessons: [
        { title: "2.3 Composition — narrative writing", desc: "Writing an engaging story with a clear structure. Developing characters, setting and plot. Using dialogue and varied sentence structure." },
        { title: "2.4 Composition — descriptive writing", desc: "Creating vivid descriptions using sensory detail, figurative language and varied vocabulary. Structuring description effectively." },
        { title: "2.5 Composition — argumentative writing", desc: "Presenting a persuasive argument with a clear stance. Using rhetorical devices, counter-arguments and a logical structure." },
        { title: "2.6 Composition — discursive writing", desc: "Exploring a topic from multiple perspectives. Presenting balanced arguments using formal language and connectives." },
      ],
    },
    {
      unit: "Unit 4: Language & Grammar",
      lessons: [
        { title: "3.1 Vocabulary and word choice", desc: "Selecting precise vocabulary. Using synonyms, connotation and register-appropriate language." },
        { title: "3.2 Sentence structure and variety", desc: "Using simple, compound and complex sentences for effect. Varying openings and length for rhythm and impact." },
        { title: "3.3 Punctuation and paragraphing", desc: "Accurate use of commas, colons, semicolons, dashes and apostrophes. Organising writing into coherent paragraphs." },
        { title: "3.4 Spelling and grammar accuracy", desc: "Common spelling patterns and rules. Subject-verb agreement, tense consistency and pronoun use." },
      ],
    },
  ];

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];
    const [unit] = await db.insert(schema.units).values({
      title: item.unit,
      description: `Cambridge IGCSE English First Language — ${item.unit}`,
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

  console.log("🟢 English First Language (0500) seeded successfully!");
}

main().catch(console.error);
