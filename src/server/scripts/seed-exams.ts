import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// helps the seeding script read from `.env`
dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);

const db = drizzle(connector, { schema });

// Sample A-Level Business questions
const sampleQuestions = [
  {
    number: 1,
    text: "Define the term 'elastic demand'.",
    marks: 2,
    topic: "Price Elasticity of Demand"
  },
  {
    number: 2,
    text: "Explain two factors that might cause a shift in the supply curve.",
    marks: 4,
    topic: "Supply and Demand"
  },
  {
    number: 3,
    text: "Analyse the impact of inflation on consumer purchasing power.",
    marks: 6,
    topic: "Macroeconomics"
  },
  {
    number: 4,
    text: "Evaluate the effectiveness of monetary policy in controlling inflation.",
    marks: 10,
    topic: "Macroeconomic Policy"
  },
  {
    number: 5,
    text: "Define 'perfect competition' and explain its key characteristics.",
    marks: 4,
    topic: "Market Structures"
  },
  {
    number: 6,
    text: "Analyse the advantages and disadvantages of a monopoly market structure.",
    marks: 8,
    topic: "Market Structures"
  },
  {
    number: 7,
    text: "Explain what is meant by 'economies of scale' and give two examples.",
    marks: 4,
    topic: "Production and Costs"
  },
  {
    number: 8,
    text: "Evaluate the impact of government intervention on market failure.",
    marks: 10,
    topic: "Market Failure"
  }
];

const main = async () => {
  try {
    console.log("🟠 Seeding A-Level Business exam papers...");

    // Clear existing exam data
    await db.delete(schema.aiGradings);
    await db.delete(schema.handwrittenAnswers);
    await db.delete(schema.proctoringLogs);
    await db.delete(schema.gradeHistory);
    await db.delete(schema.examSessions);
    await db.delete(schema.examPapers);

    // Insert sample exam papers for A-Level Business (9609)
    const examPapers = [
      {
        year: 2025,
        season: "march",
        paperNumber: 2,
        variant: "qp",
        title: "Case Study",
        description: "March 2025 Paper 2 - Case Study on retail company expansion",
        content: JSON.stringify({ questions: sampleQuestions.slice(0, 6) }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2025,
        season: "march",
        paperNumber: 2,
        variant: "ms",
        title: "Case Study Mark Scheme",
        description: "Mark scheme for March 2025 Paper 2",
        content: JSON.stringify({ 
          answers: sampleQuestions.slice(0, 6).map(q => ({
            number: q.number,
            modelAnswer: `Model answer for question ${q.number}...`,
            maxMarks: q.marks
          }))
        }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2024,
        season: "june",
        paperNumber: 2,
        variant: "qp",
        title: "Case Study",
        description: "June 2024 Paper 2 - Case Study on manufacturing company",
        content: JSON.stringify({ questions: sampleQuestions.slice(2, 8) }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2024,
        season: "june",
        paperNumber: 2,
        variant: "ms",
        title: "Case Study Mark Scheme",
        description: "Mark scheme for June 2024 Paper 2",
        content: JSON.stringify({ 
          answers: sampleQuestions.slice(2, 8).map(q => ({
            number: q.number,
            modelAnswer: `Model answer for question ${q.number}...`,
            maxMarks: q.marks
          }))
        }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2024,
        season: "november",
        paperNumber: 1,
        variant: "qp",
        title: "Short Answer & Essays",
        description: "November 2024 Paper 1 - Short answer and essay questions",
        content: JSON.stringify({ questions: sampleQuestions }),
        timeLimit: 60,
        totalMarks: 40
      },
      {
        year: 2024,
        season: "november",
        paperNumber: 1,
        variant: "ms",
        title: "Short Answer & Essays Mark Scheme",
        description: "Mark scheme for November 2024 Paper 1",
        content: JSON.stringify({ 
          answers: sampleQuestions.map(q => ({
            number: q.number,
            modelAnswer: `Model answer for question ${q.number}...`,
            maxMarks: q.marks
          }))
        }),
        timeLimit: 60,
        totalMarks: 40
      },
      {
        year: 2023,
        season: "june",
        paperNumber: 2,
        variant: "qp",
        title: "Case Study",
        description: "June 2023 Paper 2 - Case Study on hospitality industry",
        content: JSON.stringify({ questions: sampleQuestions.slice(1, 7) }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2023,
        season: "june",
        paperNumber: 2,
        variant: "ms",
        title: "Case Study Mark Scheme",
        description: "Mark scheme for June 2023 Paper 2",
        content: JSON.stringify({ 
          answers: sampleQuestions.slice(1, 7).map(q => ({
            number: q.number,
            modelAnswer: `Model answer for question ${q.number}...`,
            maxMarks: q.marks
          }))
        }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2022,
        season: "november",
        paperNumber: 3,
        variant: "qp",
        title: "Multiple Choice",
        description: "November 2022 Paper 3 - Multiple choice questions",
        content: JSON.stringify({ 
          questions: [
            { number: 1, text: "What is the formula for price elasticity of demand?", marks: 1, topic: "PED" },
            { number: 2, text: "Which type of market has many small firms?", marks: 1, topic: "Market Structures" },
            { number: 3, text: "What is meant by marginal cost?", marks: 1, topic: "Costs" },
            { number: 4, text: "Define inflation.", marks: 1, topic: "Macroeconomics" },
            { number: 5, text: "What is a tariff?", marks: 1, topic: "Trade" },
          ]
        }),
        timeLimit: 60,
        totalMarks: 70
      },
      {
        year: 2021,
        season: "june",
        paperNumber: 2,
        variant: "qp",
        title: "Case Study",
        description: "June 2021 Paper 2 - Case Study on technology company",
        content: JSON.stringify({ questions: sampleQuestions.slice(0, 6) }),
        timeLimit: 105,
        totalMarks: 100
      },
      {
        year: 2020,
        season: "november",
        paperNumber: 1,
        variant: "qp",
        title: "Short Answer & Essays",
        description: "November 2020 Paper 1 - Short answer and essay questions",
        content: JSON.stringify({ questions: sampleQuestions.slice(2) }),
        timeLimit: 60,
        totalMarks: 40
      },
      {
        year: 2019,
        season: "june",
        paperNumber: 2,
        variant: "qp",
        title: "Case Study",
        description: "June 2019 Paper 2 - Case Study on airline industry",
        content: JSON.stringify({ questions: sampleQuestions.slice(1, 7) }),
        timeLimit: 105,
        totalMarks: 100
      }
    ];

    await db.insert(schema.examPapers).values(examPapers);

    console.log("🟢 Exam papers seeded successfully!");
    console.log(`   - ${examPapers.filter(p => p.variant === "qp").length} question papers`);
    console.log(`   - ${examPapers.filter(p => p.variant === "ms").length} mark schemes`);
  } catch (error) {
    console.error(error);
    throw new Error("🔴 Failed to seed exam papers");
  }
};

main();
