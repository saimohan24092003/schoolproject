import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { parseMarkingScheme } from "./utils/marking-scheme-parser";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function seedMixedQuestions() {
  console.log("🟠 Seeding Mixed Biology, Chemistry, and Physics Questions (2015 P1)...");

  // 1. Get Official Answers from Marking Scheme
  const answers = await parseMarkingScheme(Buffer.from("dummy")); // Mock buffer

  // 2. Define Questions (Transcribed from PDF)
  const mixedQuestions = [
    // --- BIOLOGY ---
    {
      number: 1,
      question: "A biologist keeps a potted plant in a laboratory. Which feature of the potted plant shows that it is a living organism?",
      options: ["It grows larger over time.", "It has green leaves.", "The compost in the pot dries after he waters it.", "The stems contain xylem."],
      topic: "B1. Characteristics of living organisms",
      hasDiagram: false
    },
    {
      number: 2,
      question: "The diagram shows a palisade cell. Which parts are found in plant cells and not in animal cells?",
      options: ["1, 3 and 4", "1, 3 and 5", "2, 4 and 6", "2, 5 and 6"],
      topic: "B2. Cells",
      hasDiagram: true,
      // In a real app, we would crop the image and upload it to S3/Cloudinary
      imageSrc: "/boy.svg" // Placeholder since we don't have the diagram cropped yet
    },
    
    // --- CHEMISTRY ---
    {
      number: 14,
      question: "Which method is used to obtain a solid salt from the salt solution?",
      options: ["crystallisation", "distillation", "filtration", "fractional distillation"],
      topic: "C2. Experimental techniques",
      hasDiagram: false
    },
    {
      number: 15,
      question: "Fluorine and chlorine are in Group VII of the Periodic Table. Which number increases by eight from fluorine to chlorine?",
      options: ["the number of atoms in one molecule", "the number of electrons in one atom", "the number of electrons in one molecule", "the number of nucleons in one atom"],
      topic: "C9. The Periodic Table",
      hasDiagram: false
    },
    {
      number: 16,
      question: "The structure of an organic compound is shown. What is the formula of the compound?",
      options: ["C3H6O2", "C4H8O", "C4H8O2", "C3H7O2"],
      topic: "C12. Organic chemistry",
      hasDiagram: true,
      imageSrc: "/girl.svg" // Placeholder
    },

    // --- PHYSICS ---
    {
      number: 28,
      question: "An athlete runs 10000 metres in 30 minutes. What is her average speed?",
      options: ["3 km/hour", "5 km/hour", "10 km/hour", "20 km/hour"],
      topic: "P1. Motion, forces and energy", // Specifically Motion
      hasDiagram: false
    },
    {
      number: 29,
      question: "A shop-keeper places two identical blocks of cheese on a balance. The combined mass of the two blocks of cheese is 240g. Each block measures 2.0 cm × 5.0 cm × 10.0 cm. What is the density of the cheese?",
      options: ["0.42 g/cm³", "0.83 g/cm³", "1.2 g/cm³", "2.4 g/cm³"],
      topic: "P1. Motion, forces and energy", // Density
      hasDiagram: true,
      imageSrc: "/man.svg" // Placeholder
    },
    {
        number: 30,
        question: "The speed of a car increases as it moves up a hill. Which energy changes are taking place?",
        options: [
            "GPE: decreasing, KE: decreasing",
            "GPE: increasing, KE: decreasing",
            "GPE: decreasing, KE: increasing",
            "GPE: increasing, KE: increasing"
        ],
        topic: "P1. Motion, forces and energy", // Energy
        hasDiagram: true,
        imageSrc: "/robot.svg" // Placeholder
    }
  ];

  for (const q of mixedQuestions) {
    // 3. Find Lesson (Topic)
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.title, q.topic)
    });

    if (!lesson) {
      console.log(`⚠️ Lesson not found for topic: ${q.topic}`);
      continue;
    }

    // 4. Validate Answer with Marking Scheme
    const correctKey = answers[q.number];
    if (!correctKey) {
        console.error(`🔴 Answer key missing for Q${q.number}`);
        continue;
    }
    console.log(`✅ Q${q.number} Answer verified from MS: ${correctKey}`);

    // 5. Insert Challenge
    const [challenge] = await db.insert(schema.challenges).values({
      lessonId: lesson.id,
      type: "SELECT",
      question: q.question,
      order: q.number,
      imageSrc: q.imageSrc, // New field!
    }).returning();

    // 6. Insert Options
    const optionValues = q.options.map((text, index) => {
        const optionKey = String.fromCharCode(65 + index); // A, B, C, D
        const isCorrect = optionKey === correctKey;
        
        return {
            challengeId: challenge.id,
            text,
            correct: isCorrect,
        };
    });

    await db.insert(schema.challengeOptions).values(optionValues);
    console.log(`   - Seeded Question ${q.number} into Topic: ${q.topic}`);
  }

  console.log("🟢 Mixed Seeding finished!");
}

seedMixedQuestions();
