import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const hindiMCQs = [
  {
    number: 1,
    text: "निम्नलिखित में से कौन सा शब्द 'आकाश' का पर्यायवाची है?",
    options: ["जल", "गगन", "भूमि", "पवन"],
    correctAnswer: 1, // गगन
    topic: "Synonyms (पर्यायवाची)"
  },
  {
    number: 2,
    text: "'सफलता' शब्द का विलोम क्या है?",
    options: ["जीत", "विजय", "असफलता", "प्रगति"],
    correctAnswer: 2, // असफलता
    topic: "Antonyms (विलोम)"
  },
  {
    number: 3,
    text: "शुद्ध वर्तनी वाला शब्द चुनिए:",
    options: ["आसीर्वाद", "आशिर्वाद", "आशीर्वाद", "आशिरवाद"],
    correctAnswer: 2,
    topic: "Spelling (वर्तनी)"
  }
];

const main = async () => {
  try {
    console.log("🟠 Seeding O-Level Hindi (0549) papers...");

    const hindiPaper = {
      level: "O-Level",
      subject: "Hindi (0549) ⭐",
      year: 2024,
      season: "june",
      paperNumber: 1,
      variant: "1",
      title: "Hindi (0549) - 2024 P1 MCQ",
      description: "Sample MCQ paper for O-Level Hindi",
      content: JSON.stringify({ questions: hindiMCQs, type: "MCQ" }),
      timeLimit: 60,
      totalMarks: 30
    };

    await db.insert(schema.examPapers).values(hindiPaper);

    console.log("🟢 O-Level Hindi (0549) paper seeded successfully!");
  } catch (error) {
    console.error(error);
    throw new Error("🔴 Failed to seed Hindi papers");
  }
};

main();
