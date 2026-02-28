import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const ROOT_PATH = "School project - Question Paper & Marking scheme";

async function processFile(filePath: string, type: "qp" | "ms", level: string, subject: string, year: number, variant: string, season: string) {
  console.log(`🤖 AI Processing ${type.toUpperCase()}: [${subject}] ${year} ${season} V${variant}...`);
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfBase64 = pdfBuffer.toString("base64");

  const prompt = type === "qp" 
    ? `Extract all MCQ questions from this IGCSE ${subject} paper. 
       For each question, identify the specific syllabus topic (e.g., "B1. Characteristics", "C3. Atoms", "P1. Motion").
       Return ONLY a JSON array: [{"number": 1, "text": "Question text here", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": 0, "topic": "Topic Name"}]`
    : `Extract the answer key from this Marking Scheme for IGCSE ${subject}. Return ONLY a JSON array of correct letters: [{"number": 1, "answer": "A"}]`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: pdfBase64, mimeType: "application/pdf" } }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    await db.insert(schema.examPapers).values({
      level: level,
      subject: "Combined Science (0653)",
      year: year,
      season: season,
      paperNumber: 1,
      variant: variant,
      title: `${subject} - ${year} ${season.toUpperCase()} ${type.toUpperCase()} Variant ${variant.slice(-1)}`,
      description: `AI Ingested from ${path.basename(filePath)}`,
      content: JSON.stringify({ data, type: type === "qp" ? "MCQ" : "MS" }),
      totalMarks: type === "qp" ? data.length : 0,
    });

    console.log(`✅ Stored ${type.toUpperCase()} in Neon DB for ${subject} ${year} ${season}`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

async function main() {
  const folders = ["Question Paper", "Marking Scheme"];
  const levels = ["O level", "A Level"];

  for (const folderType of folders) {
    for (const level of levels) {
      const currentPath = path.join(ROOT_PATH, folderType, level);
      if (!fs.existsSync(currentPath)) continue;

      const subjects = fs.readdirSync(currentPath).filter(s => s.includes("Combined Science"));
      for (const subject of subjects) {
        const subjectPath = path.join(currentPath, subject);
        if (!fs.statSync(subjectPath).isDirectory()) continue;

        const years = fs.readdirSync(subjectPath);
        for (const year of years) {
          const yearPath = path.join(subjectPath, year);
          if (!fs.statSync(yearPath).isDirectory()) continue;

          // Handle season folders
          const seasons = fs.readdirSync(yearPath);
          for (const season of seasons) {
            const seasonPath = path.join(yearPath, season);
            if (!fs.statSync(seasonPath).isDirectory()) continue;

            const files = fs.readdirSync(seasonPath).filter(f => f.endsWith(".pdf"));
            for (const file of files) {
              const variant = `1${file.replace(".pdf", "")}`;
              
              let normalizedSeason = "june";
              if (season.toLowerCase().includes("march")) normalizedSeason = "march";
              if (season.toLowerCase().includes("november")) normalizedSeason = "november";

              await processFile(
                path.join(seasonPath, file), 
                folderType === "Question Paper" ? "qp" : "ms",
                level === "O level" ? "O-Level" : "A-Level",
                subject, 
                parseInt(year), 
                variant,
                normalizedSeason
              );
            }
          }
        }
      }
    }
  }
  console.log("🏁 Database is now updated with all files!");
}

main();
