import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const main = async () => {
  try {
    console.log("🟠 Seeding Combined Science (0653) Syllabus...");

    // 1. Insert Course
    const [course] = await db.insert(schema.courses).values({
      title: "Combined Science (0653)",
      imageSrc: "/hero.svg", // Using an existing svg
    }).returning();

    console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

    // 2. Insert Units
    const units = await db.insert(schema.units).values([
      {
        courseId: course.id,
        title: "Biology",
        description: "B1 to B16",
        order: 1,
      },
      {
        courseId: course.id,
        title: "Chemistry",
        description: "C1 to C12",
        order: 2,
      },
      {
        courseId: course.id,
        title: "Physics",
        description: "P1 to P5",
        order: 3,
      },
    ]).returning();

    const bioUnitId = units[0].id;
    const chemUnitId = units[1].id;
    const physUnitId = units[2].id;

    console.log("✅ Created Units: Biology, Chemistry, Physics");

    // 3. Insert Lessons (Topics)
    const bioLessons = [
      "B1. Characteristics of living organisms",
      "B2. Cells",
      "B3. Movement into and out of cells",
      "B4. Biological molecules",
      "B5. Enzymes",
      "B6. Plant nutrition",
      "B7. Human nutrition",
      "B8. Transport in plants",
      "B9. Transport in animals",
      "B10. Diseases and immunity",
      "B11. Gas exchange in humans",
      "B12. Respiration",
      "B13. Drugs",
      "B14. Reproduction",
      "B15. Organisms and their environment",
      "B16. Human influences on ecosystems",
    ].map((title, index) => ({
      unitId: bioUnitId,
      title,
      order: index + 1,
    }));

    const chemLessons = [
      "C1. States of matter",
      "C2. Atoms, elements and compounds",
      "C3. Stoichiometry",
      "C4. Electrochemistry",
      "C5. Chemical energetics",
      "C6. Chemical reactions",
      "C7. Acids, bases and salts",
      "C8. The Periodic Table",
      "C9. Metals",
      "C10. Chemistry of the environment",
      "C11. Organic chemistry",
      "C12. Experimental techniques and chemical analysis",
    ].map((title, index) => ({
      unitId: chemUnitId,
      title,
      order: index + 1,
    }));

    const physLessons = [
      "P1. Motion, forces and energy",
      "P2. Thermal physics",
      "P3. Waves",
      "P4. Electricity",
      "P5. Space physics",
    ].map((title, index) => ({
      unitId: physUnitId,
      title,
      order: index + 1,
    }));

    await db.insert(schema.lessons).values([
      ...bioLessons,
      ...chemLessons,
      ...physLessons,
    ]);

    console.log("✅ Seeded all Topics (Lessons)");
    console.log("🟢 Combined Science (0653) Syllabus seeding finished");
  } catch (error) {
    console.error(error);
    throw new Error("🔴 Failed to seed Combined Science syllabus");
  }
};

main();
