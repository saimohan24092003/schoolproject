import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function main() {
  console.log("🟠 Seeding Environmental Management (0680)...");

  // 1. Create Course
  const [course] = await db.insert(schema.courses).values({
    title: "Environmental Management (0680)",
    imageSrc: "/hero.svg",
  }).returning();

  console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

  // 2. Create Units & Lessons (Chapters)
  const curriculum = [
    {
      unit: "Unit 1: Earth Resources",
      lessons: [
        { title: "1.1 Rocks and minerals", desc: "Formation of igneous, sedimentary and metamorphic rocks. Extraction and impact of mining." },
        { title: "1.2 Energy resources", desc: "Fossil fuels, nuclear power, and renewable energy sources like solar, wind, and hydro." }
      ]
    },
    {
      unit: "Unit 2: Agriculture & Water",
      lessons: [
        { title: "2.1 Agriculture", desc: "Global food production, soil conservation, and the impact of modern farming techniques." },
        { title: "2.2 Water management", desc: "The water cycle, water treatment, and managing global water shortages." }
      ]
    },
    {
      unit: "Unit 3: Oceans & Hazards",
      lessons: [
        { title: "3.1 Oceans and fisheries", desc: "Exploitation of marine resources and management of global fisheries." },
        { title: "3.2 Natural hazards", desc: "Causes, impacts, and management of earthquakes, volcanoes, and tropical cyclones." }
      ]
    },
    {
      unit: "Unit 4: Atmosphere & Population",
      lessons: [
        { title: "4.1 The atmosphere", desc: "Atmospheric composition, global warming, ozone depletion, and acid rain." },
        { title: "4.2 Human population", desc: "Population growth, distribution, and the impact of urbanization on the environment." }
      ]
    }
  ];

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];
    const [unit] = await db.insert(schema.units).values({
      title: item.unit,
      description: `Comprehensive guide to ${item.unit}`,
      courseId: course.id,
      order: i + 1,
    }).returning();

    for (let j = 0; j < item.lessons.length; j++) {
      const lessonData = item.lessons[j];
      await db.insert(schema.lessons).values({
        unitId: unit.id,
        title: lessonData.title,
        description: lessonData.desc,
        order: j + 1,
      });
    }
    console.log(`✅ Seeded ${item.unit}`);
  }

  console.log("🟢 Environmental Management seeded successfully!");
}

main().catch(console.error);
