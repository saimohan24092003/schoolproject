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
  { n: 1, t: "B4. Enzymes", q: "Where on the graph has all the enzyme been denatured?", o: ["1", "2 and 3", "3 and 4", "5"], a: "D" },
  { n: 2, t: "B1. Characteristics of living organisms", q: "Which statement describes nutrition and respiration in plants?", o: ["Plants respire only when not undergoing nutrition.", "Plants respire using photosynthesis.", "Plants undergo nutrition and respiration at the same time.", "Plants undergo nutrition only when not respiring."], a: "C" },
  { n: 3, t: "B2. Cells", q: "Which feature tells him that he is looking at plant cells?", o: ["cells surrounded by membranes", "cytoplasm with granules", "green dots visible inside", "dark dot inside"], a: "C" },
  { n: 4, t: "B3. Biological molecules", q: "Which substances are present in the food sample tested?", o: ["protein, sugar, starch", "protein, sugar", "protein", "sugar, starch"], a: "C" },
  { n: 5, t: "B6. Animal nutrition", q: "Which chemical is produced from digestion of a fat?", o: ["amino acid", "glycerol", "glycogen", "sugar"], a: "B" },
  { n: 6, t: "B5. Plant nutrition", q: "Which graph shows how atmospheric humidity affects the rate of transpiration?", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "C" },
  { n: 7, t: "B7. Transport", q: "Which part carries glucose to muscles?", o: ["Part A", "Part B", "Part C", "Part D"], a: "C" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "Into which part does carbon dioxide pass immediately after leaving the blood?", o: ["Part A", "Part B", "Part C", "Part D"], a: "B" },
  { n: 9, t: "B9. Coordination and response", q: "Which row describes the stimulus and response in a plant process?", o: ["geotropism: gravity -> root down", "geotropism: light -> shoot up", "phototropism: gravity -> shoot down", "phototropism: light -> root up"], a: "A" },
  { n: 10, t: "B9. Coordination and response", q: "Which row is correct for the hormone adrenaline?", o: ["lowered, decreased, kidney", "lowered, decreased, liver", "raised, increased, kidney", "raised, increased, liver"], a: "D" },
  { n: 11, t: "B10. Reproduction", q: "Which structure in a flower produces pollen?", o: ["sepal", "stamen", "stigma", "style"], a: "B" },
  { n: 12, t: "B10. Reproduction", q: "Where in the female human reproductive system is the hormone oestrogen produced?", o: ["cervix", "ovary", "uterus", "vagina"], a: "B" },
  { n: 13, t: "B12. Ecology", q: "Why does fresh sewage reduce the fish population in the river?", o: ["brings organisms that feed on fish", "bacteria that reduce oxygen concentration", "decreases growth of algae", "water too cloudy for fish to see"], a: "B" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C3. Atoms, elements and compounds", q: "Which statement about atoms and molecules is correct?", o: ["Atoms gain/lose electrons to become molecules.", "Atoms of same element contain same number of molecules.", "Molecules are the simplest unit of an atom.", "Molecules contain atoms which are covalently bonded."], a: "D" },
  { n: 15, t: "C2. Experimental techniques", q: "What is solid X and what is its mass?", o: ["copper, < 0.5g", "copper, 0.5g", "copper(II) oxide, 0.5g", "copper(II) oxide, > 0.5g"], a: "B" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "Which statements about element Y (proton 18, nucleon 40) are correct?", o: ["1 and 2", "2 and 3", "2 and 4", "3 and 4"], a: "D" },
  { n: 17, t: "C12. Organic chemistry", q: "What is the formula of this compound?", o: ["C3H5O3", "C3H6O3", "C3H8O", "C3H8O3"], a: "D" },
  { n: 18, t: "C5. Electricity and chemistry", q: "Why is heat needed for the lamp to give out light?", o: ["exothermic reaction", "electrodes only conduct when hot", "heat causes lead(II) bromide to react with air", "lead(II) bromide must be molten"], a: "D" },
  { n: 19, t: "C6. Energy changes in reactions", q: "An explosive squeak is heard. Which statement is correct?", o: ["acidic gas is formed", "energy is released", "hydrogen is reduced", "platinum is oxidised"], a: "B" },
  { n: 20, t: "C7. Chemical reactions", q: "Which statement is correct for Mg + H2O -> MgO + H2?", o: ["hydrogen gas is reduced", "magnesium is oxidised", "magnesium is reduced", "water is oxidised"], a: "B" },
  { n: 21, t: "C8. Acids, bases and salts", q: "What is X?", o: ["copper(II) carbonate", "copper(II) chloride", "iron(II) carbonate", "iron(II) chloride"], a: "A" },
  { n: 22, t: "C8. Acids, bases and salts", q: "What is the substance that produces a pop when tested with a lighted splint?", o: ["copper", "copper(II) oxide", "magnesium", "magnesium carbonate"], a: "C" },
  { n: 23, t: "C9. The Periodic Table", q: "Which element has a high melting point and forms coloured compounds?", o: ["Element A", "Element B", "Element C", "Element D"], a: "A" },
  { n: 24, t: "C9. The Periodic Table", q: "Which trend is observed going down Group VII?", o: ["same physical state", "colour becomes lighter", "reactivity decreases", "state changes solid to liquid to gas"], a: "C" },
  { n: 25, t: "C10. Metals", q: "Which element is less reactive than hydrogen?", o: ["copper", "iron", "magnesium", "zinc"], a: "A" },
  { n: 26, t: "C11. Air and water", q: "What are the approximate percentages by volume of nitrogen and oxygen in clean air?", o: ["1, 99", "20, 80", "80, 20", "99, 1"], a: "C" },
  { n: 27, t: "C12. Organic chemistry", q: "Which method is used to separate these hydrocarbons?", o: ["crystallisation", "distillation", "filtration", "fractional distillation"], a: "D" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "Which graph is the speed / time graph for the car moving at constant speed?", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "A" },
  { n: 29, t: "P1. Motion, forces and energy", q: "Which statement about mass and weight is correct?", o: ["both are forces", "mass is a force, weight is not", "neither is a force", "weight is a force, mass is not"], a: "D" },
  { n: 30, t: "P1. Motion, forces and energy", q: "What is its density (75g, 15cm³)?", o: ["0.20 g/cm³", "5.0 g/cm³", "60 g/cm³", "90 g/cm³"], a: "B" },
  { n: 31, t: "P1. Motion, forces and energy", q: "What is the unit for work and what is the unit for power?", o: ["J, N", "J, W", "N, W", "W, J"], a: "B" },
  { n: 32, t: "P1. Motion, forces and energy", q: "Which energy change takes place when a block of wood slows down?", o: ["chemical to kinetic", "GPE to kinetic", "GPE to thermal", "kinetic to thermal"], a: "D" },
  { n: 33, t: "P2. Thermal physics", q: "What is the name for this change of state and how does the temperature change?", o: ["condensation, decreases", "condensation, increases", "evaporation, decreases", "evaporation, increases"], a: "C" },
  { n: 34, t: "P2. Thermal physics", q: "Why is concrete laid in sections with gaps filled with soft tar?", o: ["allow for expansion and contraction", "allow tar to radiate heat", "increase density", "reduce mass"], a: "A" },
  { n: 35, t: "P2. Thermal physics", q: "The reading of which thermometer changes, and why?", o: ["X, cool air rises", "X, warm air rises", "Y, cool air falls", "Y, warm air falls"], a: "C" },
  { n: 36, t: "P3. Waves", q: "Which labelled line shows the direction of the ray after it leaves the lens?", o: ["Line A", "Line B", "Line C", "Line D"], a: "B" },
  { n: 37, t: "P3. Waves", q: "Which calculation should the student use to determine the speed of sound?", o: ["100 / 0.60", "100 / 1.2", "200 / 0.30", "200 / 0.60"], a: "D" },
  { n: 38, t: "P4. Electricity and magnetism", q: "Which diagram shows the directions of the two forces acting on ion X?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "A" },
  { n: 39, t: "P4. Electricity and magnetism", q: "Which statement is correct for the parallel resistors?", o: ["current in P = Q", "current in P > R", "current in Q > S", "current in R = S"], a: "B" },
  { n: 40, t: "P4. Electricity and magnetism", q: "Which statement is correct for the identical lamps P and Q?", o: ["switched off independently", "if Q breaks, P stays alight", "P is brighter than Q", "current is same in both"], a: "D" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2015 Oct/Nov P1 (All 40 Questions)...");

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
      order: q.n + 40, // Offset to avoid overlapping order with May/June
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2015 Oct/Nov P1 Seeding Complete!");
}

main();
