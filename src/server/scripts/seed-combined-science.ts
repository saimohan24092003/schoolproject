import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const combinedScienceMCQs = [
  {
    number: 1,
    text: "Which structure is present in a plant cell but not in an animal cell?",
    options: ["Cell membrane", "Cell wall", "Cytoplasm", "Nucleus"],
    correctAnswer: 1, // Cell wall
    topic: "B1. Characteristics of living organisms"
  },
  {
    number: 2,
    text: "What is the function of the red blood cells?",
    options: ["Carrying oxygen", "Clotting blood", "Fighting infection", "Producing antibodies"],
    correctAnswer: 0, // Carrying oxygen
    topic: "B6. Transport in mammals"
  },
  {
    number: 3,
    text: "Which of these is a balanced chemical equation for the formation of water?",
    options: ["H2 + O2 → H2O", "2H2 + O2 → 2H2O", "H + O → HO", "2H + O2 → H2O2"],
    correctAnswer: 1,
    topic: "C4. Stoichiometry"
  },
  {
    number: 4,
    text: "What is the chemical symbol for Sodium?",
    options: ["S", "So", "Na", "Ni"],
    correctAnswer: 2,
    topic: "C3. Atoms, elements and compounds"
  },
  {
    number: 5,
    text: "Which of the following is a unit of work?",
    options: ["Newton", "Joule", "Watt", "Pascal"],
    correctAnswer: 1,
    topic: "P4. Energy, work and power"
  },
  {
    number: 6,
    text: "A car travels 100m in 5 seconds. What is its average speed?",
    options: ["10 m/s", "20 m/s", "50 m/s", "500 m/s"],
    correctAnswer: 1,
    topic: "P1. Motion"
  }
];

const main = async () => {
  try {
    console.log("🟠 Seeding O-Level Combined Science (0653) MCQ papers...");

    const variants = [1, 2, 3];
    const examPapers = variants.map(v => ({
      level: "O-Level",
      subject: "Combined Science (0653)",
      year: 2015,
      season: "june",
      paperNumber: 1,
      variant: `1${v}`, // 11, 12, 13
      title: `Combined Science (0653) - 2015 P1 Variant ${v}`,
      description: `Multiple Choice (Core) for June 2015 Paper 1, Variant ${v}`,
      content: JSON.stringify({ questions: combinedScienceMCQs, type: "MCQ" }),
      timeLimit: 45,
      totalMarks: 40
    }));

    await db.insert(schema.examPapers).values(examPapers);

    console.log("🟢 O-Level Combined Science (0653) papers seeded successfully!");
    console.log(`   - Seeded ${variants.length} MCQ variant papers`);
  } catch (error) {
    console.error(error);
    throw new Error("🔴 Failed to seed Combined Science papers");
  }
};

main();
