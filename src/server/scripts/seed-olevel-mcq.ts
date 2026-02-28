import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const oLevelMCQs = [
  {
    number: 1,
    text: "Which of the following is a factor of production?",
    options: ["Money", "Capital", "Profit", "Sales"],
    correctAnswer: 1,
    topic: "Chapter 1: The Basic Economic Problem"
  },
  {
    number: 2,
    text: "What is meant by an 'opportunity cost'?",
    options: ["The cost of the next best alternative forgone", "The total cost of production", "The price paid for a good", "The profit made from a sale"],
    correctAnswer: 0,
    topic: "Chapter 1: The Basic Economic Problem"
  },
  {
    number: 3,
    text: "In a market economy, how are resources allocated?",
    options: ["By the government", "By the price mechanism", "By tradition", "By central planning"],
    correctAnswer: 1,
    topic: "Chapter 2: The Allocation of Resources"
  },
  {
    number: 4,
    text: "Which of these would cause a shift in the demand curve for a product?",
    options: ["A change in the price of the product", "A change in consumer income", "A change in the cost of raw materials", "An improvement in technology"],
    correctAnswer: 1,
    topic: "Chapter 2: The Allocation of Resources"
  },
  {
    number: 5,
    text: "What is the primary aim of a private sector business?",
    options: ["To provide a public service", "To maximize profit", "To reduce unemployment", "To control inflation"],
    correctAnswer: 1,
    topic: "Chapter 3: Business Organizations"
  },
  {
    number: 6,
    text: "Which type of business organization has limited liability?",
    options: ["Sole trader", "Partnership", "Private Limited Company", "Charity"],
    correctAnswer: 2,
    topic: "Chapter 3: Business Organizations"
  }
];

const main = async () => {
  try {
    console.log("🟠 Seeding O-Level Business MCQ papers...");

    const oLevelPaper = {
      year: 2025,
      season: "june",
      paperNumber: 1,
      variant: "qp",
      title: "O-Level Business MCQ (2025)",
      description: "Multiple Choice Questions for O-Level Business Studies",
      content: JSON.stringify({ questions: oLevelMCQs, type: "MCQ" }),
      timeLimit: 45,
      totalMarks: 30
    };

    await db.insert(schema.examPapers).values(oLevelPaper);

    console.log("🟢 O-Level MCQ paper seeded successfully!");
  } catch (error) {
    console.error(error);
    throw new Error("🔴 Failed to seed O-Level exam papers");
  }
};

main();
