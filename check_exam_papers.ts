import "dotenv/config";
import db from "./src/server/db/drizzle";
import { examPapers } from "./src/server/db/schema";
import { count, eq, and } from "drizzle-orm";

async function checkExamPapers() {
  const subject = "Combined Science (0653)";
  const papers = await db.select({
    id: examPapers.id,
    title: examPapers.title,
    subject: examPapers.subject,
    variant: examPapers.variant,
    year: examPapers.year
  })
  .from(examPapers)
  .where(and(
    eq(examPapers.subject, subject),
    eq(examPapers.variant, "qp")
  ));

  console.log(`Found ${papers.length} question papers for ${subject}`);
  console.table(papers);

  if (papers.length > 0) {
    const paper = await db.query.examPapers.findFirst({
      where: eq(examPapers.id, papers[0].id)
    });
    console.log("Sample content length:", paper?.content.length);
    try {
        const content = JSON.parse(paper?.content || "{}");
        const questions = content.questions || (content.data && content.type === "MCQ" ? content.data : []);
        console.log("Questions found in first paper:", Array.isArray(questions) ? questions.length : "Not an array");
    } catch (e) {
        console.log("Failed to parse content JSON");
    }
  }

  process.exit(0);
}

checkExamPapers().catch(err => {
  console.error(err);
  process.exit(1);
});
