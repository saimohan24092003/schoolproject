import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // 1. Check exam_papers for 0653 P2
  const papers = await sql`
    SELECT id, year, season, paper_number, variant, title, total_marks,
           LENGTH(content) as content_len
    FROM exam_papers
    WHERE subject = 'Combined Science (0653)'
    ORDER BY year, season, paper_number
  `;
  console.log(`\n=== 0653 EXAM PAPERS in DB (${papers.length} total) ===`);
  const p2papers = papers.filter((p: any) => p.paper_number === 2);
  const p1papers = papers.filter((p: any) => p.paper_number === 1);
  console.log(`Paper 1 (MCQ): ${p1papers.length}`);
  console.log(`Paper 2 (Theory): ${p2papers.length}`);
  if (p2papers.length > 0) {
    console.log("P2 entries:");
    p2papers.forEach((p: any) => console.log(`  id=${p.id} ${p.year} ${p.season} variant=${p.variant} marks=${p.total_marks} content_len=${p.content_len}`));
  }

  // 2. Check challenges table for 0653 THEORY (from theory seeder)
  const thCh = await sql`
    SELECT ch.type, ch.topic, ch.paper_ref, ch.total_marks, COUNT(*) as cnt
    FROM courses c
    JOIN units u ON u.course_id = c.id
    JOIN lessons l ON l.unit_id = u.id
    JOIN challenges ch ON ch.lesson_id = l.id
    WHERE c.id = 2 AND ch.type = 'THEORY'
    GROUP BY ch.type, ch.topic, ch.paper_ref, ch.total_marks
    ORDER BY cnt DESC
    LIMIT 20
  `;
  console.log(`\n=== 0653 THEORY challenges in DB ===`);
  if (thCh.length === 0) {
    console.log("  ❌ NONE — theory questions not seeded for 0653!");
  } else {
    thCh.forEach((r: any) => console.log(`  "${r.topic}" paper_ref="${r.paper_ref}" marks=${r.total_marks}: ${r.cnt}`));
  }

  // 3. Check exam_papers P2 content for question types
  for (const p of p2papers.slice(0, 3)) {
    const row = await sql`SELECT content FROM exam_papers WHERE id = ${p.id}`;
    if (!row[0]) continue;
    try {
      const content = JSON.parse(row[0].content as string);
      const qs = content.questions || content.data || [];
      const mcq = qs.filter((q: any) => Array.isArray(q.options) && q.options.length > 0);
      const theory = qs.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0);
      const withImg = qs.filter((q: any) => q.imageSrc);
      console.log(`\n  P2 ${p.year} ${p.season}: ${qs.length} questions, MCQ=${mcq.length}, THEORY=${theory.length}, with_image=${withImg.length}`);
      if (qs.length > 0) {
        const sample = qs[0];
        console.log(`    Sample Q1: type=${sample.type || 'unknown'} marks=${sample.marks} imageSrc=${sample.imageSrc || 'null'}`);
        console.log(`    Sample text: "${(sample.text || sample.question || "").substring(0, 100)}"`);
      }
    } catch(e) {
      console.log(`  P2 ${p.year} ${p.season}: INVALID JSON in content`);
    }
  }

  // 4. Check extracted_data folder for 0653 P2 files
  const extractedDir = path.join(process.cwd(), "extracted_data");
  if (fs.existsSync(extractedDir)) {
    const files = fs.readdirSync(extractedDir);
    const p2qp = files.filter(f => f.match(/0653_[msw]\d{2}_qp_2[123]\.pdf/i));
    const p2ms = files.filter(f => f.match(/0653_[msw]\d{2}_ms_2[123]\.pdf/i));
    console.log(`\n=== Extracted P2 Question Papers: ${p2qp.length} files ===`);
    p2qp.sort().forEach(f => console.log(`  ${f}`));
    console.log(`=== Extracted P2 Mark Schemes: ${p2ms.length} files ===`);
    p2ms.sort().forEach(f => console.log(`  ${f}`));
  }

  // 5. Check theory_seeds_progress.json for 0653 P2
  const theorySeedsPath = path.join(process.cwd(), "theory_seeds_progress.json");
  if (fs.existsSync(theorySeedsPath)) {
    const seeds = JSON.parse(fs.readFileSync(theorySeedsPath, "utf-8")) as any[];
    const p2seeds = seeds.filter((s: any) => s.source?.match(/0653_[msw]\d{2}_qp_2/i));
    console.log(`\n=== theory_seeds_progress.json: 0653 P2 entries: ${p2seeds.length} ===`);
    let totalQ = 0;
    p2seeds.forEach((s: any) => {
      totalQ += s.questions?.length || 0;
      console.log(`  ${s.source}: ${s.questions?.length || 0} questions`);
    });
    console.log(`  Total questions: ${totalQ}`);
  } else {
    console.log("\n❌ theory_seeds_progress.json not found");
  }

  // 6. Check bulk_seeds_progress.json for 0653 P2
  const bulkPath = path.join(process.cwd(), "bulk_seeds_progress.json");
  if (fs.existsSync(bulkPath)) {
    const bulk = JSON.parse(fs.readFileSync(bulkPath, "utf-8")) as any[];
    const p2bulk = bulk.filter((s: any) => s.source?.match(/0653_[msw]\d{2}_qp_2/i));
    console.log(`\n=== bulk_seeds_progress.json: 0653 P2 entries: ${p2bulk.length} ===`);
  }

  // 7. Check diagrams for 0653
  const diagramsDir = path.join(process.cwd(), "public", "diagrams");
  if (fs.existsSync(diagramsDir)) {
    const diagrams = fs.readdirSync(diagramsDir).filter(f => f.startsWith("0653") && f.endsWith(".png"));
    const p2diagrams = diagrams.filter(f => f.match(/0653_[msw]\d{2}_qp_2/i));
    console.log(`\n=== Diagrams for 0653 P2: ${p2diagrams.length} ===`);
    p2diagrams.sort().forEach(f => console.log(`  ${f}`));
  }
}

main().catch(console.error);
