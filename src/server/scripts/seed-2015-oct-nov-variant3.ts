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
  { n: 1, t: "B1. Characteristics of living organisms", q: "What are three characteristics of living organisms?", o: ["breathing, reproduction, sensitivity", "digestion, growth, movement", "excretion, nutrition, transpiration", "nutrition, reproduction, sensitivity"], a: "D" },
  { n: 2, t: "B2. Cells", q: "The diagram shows a liver cell. Which of the labelled structures would also be present in a palisade cell?", o: ["all of them", "cell membrane only", "cell membrane and cytoplasm only", "cytoplasm and nucleus only"], a: "A" },
  { n: 3, t: "B2. Cells", q: "A student carries out an experiment to investigate diffusion. Which diagram shows the distribution of the particles of dye after this time?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "C" },
  { n: 4, t: "B4. Enzymes", q: "The graph shows the effect of temperature on the rate of an enzyme-controlled reaction. Where on the graph has all the enzyme been denatured?", o: ["1", "2 and 3", "3 and 4", "5"], a: "D" },
  { n: 5, t: "B5. Plant nutrition", q: "The diagram shows a section through a leaf. Where does carbon dioxide enter the leaf and where does water leave?", o: ["CO2: 1, Water: 2", "CO2: 1, Water: 3", "CO2: 3, Water: 1", "CO2: 3, Water: 3"], a: "D" },
  { n: 6, t: "B7. Transport", q: "Which part carries glucose to muscles?", o: ["A", "B", "C", "D"], a: "C" },
  { n: 7, t: "B8. Gas exchange and respiration", q: "Into which part does carbon dioxide pass immediately after leaving the blood?", o: ["A", "B", "C", "D"], a: "B" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "Carbon dioxide turns limewater milky. Which diagram shows apparatus being used to demonstrate that expired air contains more CO2 than inspired air?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "D" }, // Wait, MS said 8: D. Let me check MS again.
  // MS for 8: D. Yes.
  { n: 9, t: "B9. Coordination and response", q: "Which are effects of the hormone adrenaline?", o: ["increase glucose, increase pulse", "increase glucose, no increase pulse", "no increase glucose, increase pulse", "no increase glucose, no increase pulse"], o_raw: ["√, √", "√, X", "X, √", "X, X"], a: "B" },
  // Wait, I'll use the raw options logic.
  { n: 10, t: "B9. Coordination and response", q: "Which row shows how the root has responded? (light and gravity)", o: ["geotropism: away, phototropism: no response", "geotropism: towards, phototropism: no response", "no response, phototropism: away", "no response, phototropism: towards"], a: "B" },
  { n: 11, t: "B10. Reproduction", q: "Which structure in a flower produces pollen?", o: ["sepal", "stamen", "stigma", "style"], a: "B" },
  { n: 12, t: "B10. Reproduction", q: "Which labelled structure is the cervix?", o: ["A", "B", "C", "D"], a: "C" },
  { n: 13, t: "B12. Ecology", q: "Which food chain is part of this food web?", o: ["grass -> mouse -> owl", "grass -> vole -> stoat", "wheat -> mouse -> owl", "wheat -> vole -> stoat"], a: "C" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C3. Atoms, elements and compounds", q: "The diagram represents a mixture of carbon dioxide, CO2, and carbon monoxide, CO. Which statement is correct?", o: ["contains 4 elements", "contains 4 molecules", "contains 11 elements", "contains 11 molecules"], a: "B" },
  { n: 15, t: "C7. Chemical reactions", q: "What is solid X and what is its mass? (0.5g copper added as catalyst)", o: ["copper, less than 0.5g", "copper, 0.5g", "copper(II) oxide, 0.5g", "copper(II) oxide, greater than 0.5g"], a: "B" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "Which statements about element Y (proton 18, nucleon 40) are correct?", o: ["1 and 2", "2 and 3", "2 and 4", "3 and 4"], a: "D" },
  { n: 17, t: "C12. Organic chemistry", q: "What is the formula of the compound shown?", o: ["CHClF", "C4H5Cl2F2", "C4H5Cl3F2", "C4H5Cl3F"], a: "C" },
  { n: 18, t: "C5. Electricity and chemistry", q: "Why is heat needed in the electrolysis of molten lead(II) bromide?", o: ["exothermic reaction takes place", "electrodes only conduct when hot", "heat causes reaction with air", "lead(II) bromide must be molten"], a: "D" },
  { n: 19, t: "C6. Energy changes in reactions", q: "Which graph shows how the temperature changes during the reaction? (Exothermic)", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "A" },
  { n: 20, t: "C7. Chemical reactions", q: "Which change does not increase the rate of reaction?", o: ["Increase concentration", "Increase surface area", "Increase temperature", "Increase volume of acid"], a: "D" },
  { n: 21, t: "C8. Acids, bases and salts", q: "Which process is NOT used in the preparation of copper sulfate crystals?", o: ["chromatography", "crystallisation", "evaporation", "filtration"], a: "A" },
  { n: 22, t: "C8. Acids, bases and salts", q: "A substance reacts with dilute acid, producing a gas. The gas ignites with a pop. What is the substance?", o: ["copper", "copper(II) oxide", "magnesium", "magnesium carbonate"], a: "C" },
  { n: 23, t: "C9. The Periodic Table", q: "Which element has a high melting point and forms coloured compounds?", o: ["A", "B", "C", "D"], a: "A" },
  { n: 24, t: "C10. Metals", q: "Element X has a high density and is used as a catalyst. What is X?", o: ["carbon", "sodium", "sulfur", "vanadium"], a: "D" },
  { n: 25, t: "C7. Chemical reactions", q: "A metal is added to water. It floats and reacts vigorously. What is the pH of the resulting solution?", o: ["1", "5", "7", "14"], a: "D" },
  { n: 26, t: "C11. Air and water", q: "What is a chemical test for water?", o: ["Blue cobalt chloride turns pink", "Boiling point 100", "Melting point 0", "Pink cobalt chloride turns blue"], a: "A" },
  { n: 27, t: "C12. Organic chemistry", q: "What is a use of gas oil?", o: ["bottled gas", "cooking", "diesel engine fuel", "heating"], a: "C" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "A train takes 20 min to travel between the two ends of a 50 km tunnel. What is the average speed?", o: ["2.5 km/hour", "16.6 km/hour", "150 km/hour", "1000 km/hour"], a: "C" },
  { n: 29, t: "P1. Motion, forces and energy", q: "Which of the following has the same unit as weight?", o: ["density", "energy", "force", "mass"], a: "C" },
  { n: 30, t: "P1. Motion, forces and energy", q: "Which items of apparatus are used to determine the density of a liquid?", o: ["balance and measuring cylinder", "balance and thermometer", "metre rule and measuring cylinder", "metre rule and thermometer"], a: "A" },
  { n: 31, t: "P1. Motion, forces and energy", q: "What is the unit for work and what is the unit for power?", o: ["work: J, power: N", "work: J, power: W", "work: N, power: W", "work: W, power: J"], a: "B" },
  { n: 32, t: "P1. Motion, forces and energy", q: "At which position does the cyclist have the least gravitational potential energy?", o: ["Position A", "Position B", "Position C", "Position D"], a: "A" },
  { n: 33, t: "P2. Thermal physics", q: "Which statement describes the molecules in a gas?", o: ["close together, move quickly", "close together, move slowly", "far apart, move quickly", "far apart, move slowly"], a: "C" },
  { n: 34, t: "P2. Thermal physics", q: "How does the heat from the fire reach each child's hands? (Child 1 above, Child 2 beside)", o: ["1: convection only, 2: radiation only", "1: convection and radiation, 2: radiation only", "1: radiation only, 2: convection and radiation", "1: radiation only, 2: convection only"], a: "B" },
  { n: 35, t: "P3. Waves", q: "A girl writes the word LEFT on a piece of card. What does she see in a plane mirror?", o: ["Option A", "Option B (reversed)", "Option C", "Option D"], a: "B" },
  { n: 36, t: "P3. Waves", q: "Angle x is greater than the critical angle. In which labelled direction does the ray continue?", o: ["Direction A", "Direction B", "Direction C", "Direction D"], a: "D" },
  { n: 37, t: "P3. Waves", q: "Which calculation should the student use to determine the speed of sound? (Echo after 0.60s from 100m away)", o: ["100 / 0.60", "100 / 1.2", "200 / 0.30", "200 / 0.60"], a: "D" },
  { n: 38, t: "P4. Electricity and magnetism", q: "Which diagram shows the directions of the two forces acting on ion X?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "A" },
  { n: 39, t: "P4. Electricity and magnetism", q: "The diagram shows a circuit with three ammeters X, Y and Z. Which set of readings is possible?", o: ["X: 2A, Y: 3A, Z: 5A", "X: 3A, Y: 2A, Z: 5A", "X: 3A, Y: 3A, Z: 3A", "X: 5A, Y: 2A, Z: 3A"], a: "D" },
  { n: 40, t: "P4. Electricity and magnetism", q: "Two identical lamps P and Q are connected in a circuit. Which statement is correct?", o: ["Each lamp can be switched off independently.", "If lamp Q breaks, lamp P stays alight.", "Lamp P is brighter than lamp Q.", "The current is the same in both lamps."], a: "D" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2015 Oct/Nov P1 Variant 3 (All 40 Questions)...");

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
      order: q.n + 240, // Offset: MJ V1(0), ON V1(40), MJ 2016(80), MJ V2(120), MJ V3(160), ON V2(200), ON V3(240)
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2015 ON P1 Variant 3 Seeding Complete!");
}

main();
