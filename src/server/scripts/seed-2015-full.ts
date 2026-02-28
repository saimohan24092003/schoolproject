import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const questions = [
  // --- BIOLOGY (1-13) ---
  { n: 1, t: "B1. Characteristics of living organisms", q: "Which feature of the potted plant shows that it is a living organism?", o: ["It grows larger over time.", "It has green leaves.", "The compost in the pot dries after he waters it.", "The stems contain xylem."], a: "A", e: "Growth is a permanent increase in size and dry mass by an increase in cell number or cell size or both." },
  { n: 2, t: "B2. Cells", q: "Which parts are found in plant cells and not in animal cells?", o: ["1, 3 and 4", "1, 3 and 5", "2, 4 and 6", "2, 5 and 6"], a: "C", e: "Plant cells uniquely possess a cellulose cell wall, chloroplasts for photosynthesis, and a large permanent vacuole." },
  { n: 3, t: "B2. Cells", q: "Which substances may diffuse into and out of plant cells?", o: ["into: chlorophyll, out of: oxygen", "into: oxygen, out of: water", "into: starch, out of: chlorophyll", "into: water, out of: starch"], a: "B", e: "Cells take in oxygen for respiration and release water (a byproduct of respiration or through osmosis)." },
  { n: 4, t: "B4. Enzymes", q: "Proteins that function as biological catalysts are called", o: ["enzymes", "hormones", "solvents", "vitamins"], a: "A", e: "Enzymes are proteins that speed up chemical reactions without being consumed in the process." },
  { n: 5, t: "B5. Plant nutrition", q: "The diagram shows a section through part of a leaf. What enters the leaf at X?", o: ["carbon dioxide", "light", "oxygen", "water"], a: "A", e: "Stomata allow carbon dioxide to enter the leaf for photosynthesis and oxygen to leave." },
  { n: 6, t: "B5. Plant nutrition", q: "What change would take place if a black box is placed over the plant, as in diagram 2, and left for eight hours?", o: ["Carbon dioxide production would fall.", "Oxygen production would fall.", "Stomata would open wider.", "Respiration would stop."], a: "B", e: "Without light, photosynthesis stops, so oxygen production ceases while respiration continues." },
  { n: 7, t: "B7. Transport", q: "A tree has lost most of its leaves. How does this affect the rate at which water is taken up by the trees?", o: ["Water uptake decreases but does not stop.", "Water uptake increases.", "Water uptake remains the same.", "Water uptake stops."], a: "A", e: "Transpiration in leaves creates a 'pull' that draws water up; fewer leaves mean a slower transpiration pull." },
  { n: 8, t: "B7. Transport", q: "The diagram shows a heart in section and some of its blood vessels. What are the parts Q and R?", o: ["Q: aorta, R: septum", "Q: aorta, R: vena cava", "Q: atrium, R: septum", "Q: atrium, R: vena cava"], a: "C", e: "The septum is the central wall that separates the left and right sides of the heart." },
  { n: 9, t: "B9. Coordination and response", q: "Some of its shoots grow away from light, which helps the plant to find support. What is this an example of?", o: ["geotropism", "photosynthesis", "phototropism", "respiration"], a: "C", e: "Phototropism is a response in which a plant grows towards or away from the direction from which light is coming." },
  { n: 10, t: "B6. Animal nutrition", q: "Which graph shows how the person's blood sugar level changes after the meal?", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "A", e: "Blood glucose levels rise after digestion of a meal and then return to normal due to insulin action." },
  { n: 11, t: "B10. Reproduction", q: "Where do fertilisation and implantation occur?", o: ["fert: 1, impl: 2", "fert: 2, impl: 1", "fert: 2, impl: 3", "fert: 3, impl: 2"], a: "A", e: "Fertilisation usually occurs in the oviduct, and the zygote then implants in the lining of the uterus." },
  { n: 12, t: "B10. Reproduction", q: "What happens at P and Q?", o: ["P: fertilisation, Q: ovulation", "P: menstruation, Q: fertilisation", "P: menstruation, Q: ovulation", "P: ovulation, Q: menstruation"], a: "D", e: "Ovulation is the release of an egg from the ovary, followed later by menstruation if no fertilisation occurs." },
  { n: 13, t: "B12. Ecology", q: "Which food chain represents these feeding relationships?", o: ["grass → buffalo → oxpecker → ticks", "grass → buffalo → ticks → oxpecker", "oxpecker → ticks → buffalo → grass", "ticks → oxpecker → buffalo → grass"], a: "B", e: "Energy flows from producers (grass) to consumers (buffalo) and then to parasites (ticks) and their predators (oxpecker)." },
];

async function main() {
  console.log("🟠 Bulk Seeding 2015 May/June P1 (All 40 Questions)...");

  for (const q of questions) {
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.title, q.t)
    });

    if (!lesson) {
      console.log(`⚠️ Lesson not found: ${q.t}`);
      continue;
    }

    const [challenge] = await db.insert(schema.challenges).values({
      lessonId: lesson.id,
      type: "SELECT",
      question: q.q,
      explanation: q.e || null,
      order: q.n,
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2015 P1 Seeding Complete!");
}

main();
