import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const EXPLANATIONS = [
  { title: "B1. Characteristics of living organisms", desc: "Living organisms share seven key characteristics: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, and Nutrition (MRS GREN)." },
  { title: "B2. Cells", desc: "Cells are the basic units of life. Plant cells have a cell wall, chloroplasts, and a large vacuole, which animal cells lack. Both have a nucleus, cytoplasm, and cell membrane." },
  { title: "B3. Biological molecules", desc: "Life depends on carbohydrates (for energy), fats (for storage/insulation), and proteins (for growth/repair). Iodine tests for starch, while Benedict's solution tests for reducing sugars." },
  { title: "B4. Enzymes", desc: "Enzymes are biological catalysts that speed up reactions. They have an active site that fits a specific substrate. High temperature or pH changes can denature them, changing their shape." },
  { title: "B5. Plant nutrition", desc: "Plants make food through photosynthesis: Carbon dioxide + Water -> Glucose + Oxygen (in the presence of light and chlorophyll). Leaves are adapted for maximum light absorption and gas exchange." },
  { title: "C1. Particulate nature of matter", desc: "Matter is made of particles. Solids have fixed shapes, liquids take the shape of their container, and gases fill all available space. Kinetic theory explains state changes like melting and boiling." },
  { title: "C3. Atoms, elements and compounds", desc: "Atoms consist of protons and neutrons in the nucleus, with electrons in shells. Elements contain one type of atom, while compounds consist of different atoms chemically bonded together." },
  { title: "P1. Motion, forces and energy", desc: "Speed is distance over time. Velocity includes direction. Acceleration is the rate of change of velocity. Resultant forces cause acceleration according to F=ma." },
  { title: "P4. Electricity and magnetism", desc: "Current (I) is the flow of charge, measured in Amps. Voltage (V) is the push, measured in Volts. Resistance (R) slows current. Relationship: V = I x R." }
];

async function main() {
  console.log("🟠 Seeding topic explanations for Combined Science...");

  for (const item of EXPLANATIONS) {
    await db.update(schema.lessons)
      .set({ description: item.desc })
      .where(eq(schema.lessons.title, item.title));
    console.log(`✅ Updated: ${item.title}`);
  }

  console.log("🟢 Explanations seeded successfully!");
}

main().catch(console.error);
