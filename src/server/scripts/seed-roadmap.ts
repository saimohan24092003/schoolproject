import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const MASTER_SYLLABUS = [
  // BIOLOGY
  { lesson: "B1. Characteristics of living organisms", sub: ["MRS GREN Definitions", "Metabolism Basics", "Excretion vs Egestion"] },
  { lesson: "B2. Cells", sub: ["Cell Wall & Membrane", "Chloroplasts & Vacuoles", "Magnification Formula", "Animal vs Plant Cells"] },
  { lesson: "B4. Enzymes", sub: ["Active Site Theory", "Temperature Effects", "pH Denaturation", "Lock and Key Model"] },
  { lesson: "B5. Plant nutrition", sub: ["Photosynthesis Equation", "Leaf Structure", "Limiting Factors", "Chlorophyll Function"] },
  { lesson: "B6. Animal nutrition", sub: ["Balanced Diet", "Malnutrition", "Alimentary Canal", "Chemical Digestion"] },
  
  // CHEMISTRY
  { lesson: "C1. Particulate nature of matter", sub: ["States of Matter", "Kinetic Theory", "Diffusion", "Brownian Motion"] },
  { lesson: "C3. Atoms, elements and compounds", sub: ["Atomic Structure", "Isotopes", "Ions & Ionic Bonding", "Covalent Bonding"] },
  { lesson: "C7. Chemical reactions", sub: ["Rate of Reaction", "Catalysts", "Redox Basics", "Exothermic vs Endothermic"] },
  { lesson: "C9. The Periodic Table", sub: ["Group I Properties", "Group VII Trends", "Noble Gases", "Transition Elements"] },
  
  // PHYSICS
  { lesson: "P1. Motion, forces and energy", sub: ["Speed/Velocity", "Acceleration Graphs", "Resultant Forces", "Work & Power"] },
  { lesson: "P2. Thermal physics", sub: ["Thermal Expansion", "Conduction", "Convection", "Radiation"] },
  { lesson: "P3. Waves", sub: ["Wave Properties", "Refraction", "Electromagnetic Spectrum", "Sound Waves"] },
  { lesson: "P4. Electricity and magnetism", sub: ["Ohm's Law", "Series/Parallel Circuits", "Electrical Safety", "Magnetic Fields"] }
];

async function main() {
  console.log("🟠 Generating A* Sub-Topic Roadmap...");

  for (const item of MASTER_SYLLABUS) {
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.title, item.lesson),
      with: { challenges: true }
    });

    if (lesson && lesson.challenges.length > 0) {
      for (let i = 0; i < lesson.challenges.length; i++) {
        const subTopic = item.sub[i % item.sub.length];
        await db.update(schema.challenges)
          .set({ topic: subTopic })
          .where(eq(schema.challenges.id, lesson.challenges[i].id));
      }
      console.log(`✅ ${item.lesson} -> ${item.sub.length} topics seeded.`);
    }
  }

  console.log("🟢 Roadmap Ready!");
}

main().catch(console.error);
