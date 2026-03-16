/**
 * Seed: Cambridge IGCSE Hindi as a Second Language (0549)
 *
 * Creates course → units → lessons in DB.
 * Then seeds theory questions from hindi_seeds_0549.json (if it exists).
 *
 * Run: npx tsx --env-file=.env.local src/server/scripts/seed-hindi-0549.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as schema from "@/server/db/schema";
import * as fs from "fs";
import * as path from "path";
import { eq } from "drizzle-orm";
import db from "@/server/db/drizzle";

const SEEDS_FILE = "hindi_seeds_0549.json";

// ── Syllabus ────────────────────────────────────────────────────────────────
const CURRICULUM = [
  {
    unit: "Unit 1: Personal World (व्यक्तिगत संसार)",
    lessons: [
      { title: "1.1 Family & Relationships (परिवार और रिश्ते)", desc: "Talking about family members, relationships, home life and daily routines. Vocabulary for family, household and personal descriptions." },
      { title: "1.2 Identity & Personal Life (पहचान और व्यक्तिगत जीवन)", desc: "Describing yourself, your personality, appearance, hobbies and interests. Personal introductions and lifestyle topics." },
      { title: "1.3 Home & Local Area (घर और स्थानीय क्षेत्र)", desc: "Describing where you live, your home, neighbourhood and local facilities. Housing vocabulary and directions." },
    ],
  },
  {
    unit: "Unit 2: Education & Future Plans (शिक्षा और भविष्य की योजनाएं)",
    lessons: [
      { title: "2.1 School & Education (स्कूल और शिक्षा)", desc: "School subjects, school life, teachers and classroom situations. Expressing opinions about school and learning." },
      { title: "2.2 Work & Career (काम और करियर)", desc: "Jobs, professions, workplace situations and career aspirations. Part-time work and future employment vocabulary." },
      { title: "2.3 Future Plans & Ambitions (भविष्य की योजनाएं)", desc: "Talking about future hopes, plans and ambitions. Using future tense and conditional structures in Hindi." },
    ],
  },
  {
    unit: "Unit 3: Leisure & Lifestyle (अवकाश और जीवन शैली)",
    lessons: [
      { title: "3.1 Free Time & Hobbies (खाली समय और शौक)", desc: "Sports, hobbies, entertainment and leisure activities. Expressing preferences, giving opinions about activities." },
      { title: "3.2 Travel & Transport (यात्रा और परिवहन)", desc: "Modes of transport, holidays, travel experiences. Booking tickets, asking for directions, describing journeys." },
      { title: "3.3 Food & Health (भोजन और स्वास्थ्य)", desc: "Food, diet, restaurants, health and fitness. Describing meals, discussing healthy lifestyles and health problems." },
    ],
  },
  {
    unit: "Unit 4: Society & Environment (समाज और पर्यावरण)",
    lessons: [
      { title: "4.1 Environment & Sustainability (पर्यावरण और स्थिरता)", desc: "Environmental problems, climate change, sustainability. Discussing causes and solutions to environmental issues." },
      { title: "4.2 Technology & Media (प्रौद्योगिकी और मीडिया)", desc: "Social media, internet, mobile technology and its impact. Discussing advantages and disadvantages of modern technology." },
      { title: "4.3 Global & Social Issues (वैश्विक और सामाजिक मुद्दे)", desc: "Poverty, equality, community and global issues. Expressing views on social topics using formal Hindi." },
    ],
  },
  {
    unit: "Unit 5: Reading Skills (पठन कौशल)",
    lessons: [
      { title: "5.1 Reading Comprehension (पठन बोध)", desc: "Strategies for understanding Hindi texts — skimming, scanning, identifying main ideas and supporting details." },
      { title: "5.2 Inference & Implication (अनुमान और निहितार्थ)", desc: "Reading between the lines. Understanding implied meaning, writer's attitude and tone in Hindi texts." },
      { title: "5.3 Summary & Note-Making (सारांश और नोट बनाना)", desc: "Selecting key information and summarising Hindi texts in your own words. Organising notes under headings." },
    ],
  },
  {
    unit: "Unit 6: Writing Skills (लेखन कौशल)",
    lessons: [
      { title: "6.1 Directed Writing (निर्देशित लेखन)", desc: "Writing letters, emails, reports and articles in Hindi. Adapting style, register and format for the given task and audience." },
      { title: "6.2 Narrative & Descriptive Writing (कथात्मक और वर्णनात्मक लेखन)", desc: "Writing engaging stories and vivid descriptions in Hindi. Using literary devices, varied vocabulary and effective structure." },
      { title: "6.3 Argumentative & Discursive Writing (तर्कपूर्ण और विमर्शात्मक लेखन)", desc: "Writing persuasive arguments and balanced discussions in Hindi. Using formal language, connectives and rhetorical devices." },
    ],
  },
  {
    unit: "Unit 7: Listening Skills (श्रवण कौशल — Paper 2)",
    lessons: [
      { title: "7.1 Listening for Gist (मुख्य विचार सुनना)", desc: "Identifying the main topic, purpose and overall message from spoken Hindi. Short announcements, conversations and broadcasts." },
      { title: "7.2 Listening for Detail (विस्तार से सुनना)", desc: "Picking out specific information: names, numbers, times, places and key facts from Hindi audio recordings." },
      { title: "7.3 Extended Listening (विस्तारित श्रवण)", desc: "Understanding longer spoken passages — interviews, discussions, narratives. Inferring meaning and speaker attitude from context." },
    ],
  },
  {
    unit: "Unit 8: Language Accuracy (भाषाई शुद्धता)",
    lessons: [
      { title: "8.1 Vocabulary & Word Choice (शब्द भंडार)", desc: "Building vocabulary across all topics. Synonyms, antonyms, word families and contextual usage in Hindi." },
      { title: "8.2 Grammar & Sentence Structure (व्याकरण और वाक्य संरचना)", desc: "Hindi grammar essentials — tenses, gender, cases, postpositions, pronouns and sentence formation." },
      { title: "8.3 Spelling & Script Accuracy (वर्तनी और लिपि शुद्धता)", desc: "Correct Devanagari script writing, common spelling errors, matras and punctuation in written Hindi." },
    ],
  },
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🟠 Seeding Hindi as a Second Language (0549)...\n");

  // Check if course already exists
  const existing = await db.query.courses.findFirst({
    where: eq(schema.courses.title, "Hindi as a Second Language (0549)"),
  });
  if (existing) {
    console.log(`⚠️  Course already exists (ID: ${existing.id}) — skipping course/unit/lesson creation`);
    console.log("   To re-seed, delete the course from DB first.\n");
  } else {
    const [course] = await db.insert(schema.courses).values({
      title: "Hindi as a Second Language (0549)",
      imageSrc: "/hindi-hero.svg",
    }).returning();
    console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

    for (let i = 0; i < CURRICULUM.length; i++) {
      const item = CURRICULUM[i];
      const [unit] = await db.insert(schema.units).values({
        title: item.unit,
        description: `Cambridge IGCSE Hindi 0549 — ${item.unit}`,
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
      console.log(`  ✅ ${item.unit}`);
    }
    console.log("\n✅ Syllabus seeded.\n");
  }

  // ── Seed theory questions if JSON exists ──────────────────────────────────
  if (!fs.existsSync(SEEDS_FILE)) {
    console.log(`ℹ️  No ${SEEDS_FILE} found — skipping question seeding.`);
    console.log("   Run: python scripts/python/extract_hindi_0549.py  to generate it.");
    return;
  }

  console.log(`📄 Loading ${SEEDS_FILE}...`);
  const papers = JSON.parse(fs.readFileSync(SEEDS_FILE, "utf-8"));
  const allLessons = await db.query.lessons.findMany({ columns: { id: true, title: true } });
  const lessonByTitle = new Map(allLessons.map(l => [l.title, l.id]));

  const existing_q = await db.query.challenges.findMany({
    columns: { id: true, question: true },
    where: eq(schema.challenges.type, "THEORY"),
  });
  const existingSet = new Set(existing_q.map(e => e.question.trim().toLowerCase()));

  let added = 0, skipped = 0, noLesson = 0;

  for (const paper of papers) {
    process.stdout.write(`📝 ${paper.source} (${paper.questions?.length ?? 0}q) `);
    let paperAdded = 0;

    for (const q of (paper.questions ?? [])) {
      const key = (q.question ?? "").trim().toLowerCase();
      if (!key) continue;
      if (existingSet.has(key)) { skipped++; continue; }

      const lessonId = lessonByTitle.get(q.topic);
      if (!lessonId) { noLesson++; continue; }

      existingSet.add(key);
      await db.insert(schema.challenges).values({
        lessonId,
        type: "THEORY",
        topic: q.topic,
        question: q.question,
        markingSchemeAnswer: q.markingSchemeAnswer ?? null,
        totalMarks: q.totalMarks ?? 2,
        imageSrc: null,
        paperRef: paper.source,
        order: added + 1,
        audioSrc: q.audioSrc ?? null,
      });
      added++;
      paperAdded++;
    }
    console.log(`→ +${paperAdded}`);
  }

  console.log(`\n✅ Done! Added: ${added} | Skipped (dup): ${skipped} | No lesson: ${noLesson}`);
}

main().catch(e => { console.error(e); process.exit(1); });
