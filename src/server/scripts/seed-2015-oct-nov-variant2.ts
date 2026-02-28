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
  { n: 1, t: "B1. Characteristics of living organisms", q: "Which is a characteristic of all living organisms?", o: ["breathing", "eating", "egestion", "movement"], a: "D" },
  { n: 2, t: "B2. Cells", q: "Which process depends on diffusion?", o: ["circulation", "digestion", "gaseous exchange", "phagocytosis"], a: "C" },
  { n: 3, t: "B4. Enzymes", q: "The graph shows the effect of temperature on the rate of an enzyme-controlled reaction. Where on the graph has all the enzyme been denatured?", o: ["1", "2 and 3", "3 and 4", "5"], a: "D" },
  { n: 4, t: "B6. Animal nutrition", q: "What is the main use in the human body of carbohydrate?", o: ["insulating against cold", "making growth possible", "providing energy", "rebuilding damaged tissues"], a: "C" },
  { n: 5, t: "B6. Animal nutrition", q: "Which mineral salt and which vitamin does a child need to produce strong bones?", o: ["calcium / Vit C", "calcium / Vit D", "iron / Vit C", "iron / Vit D"], a: "B" },
  { n: 6, t: "B7. Transport", q: "To ensure that blood will flow to the lungs, which valve must be closed?", o: ["A", "B", "C", "D"], a: "A" },
  { n: 7, t: "B7. Transport", q: "Which part carries glucose to muscles?", o: ["A", "B", "C", "D"], a: "C" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "Into which part does carbon dioxide pass immediately after leaving the blood?", o: ["A", "B", "C", "D"], a: "B" },
  { n: 9, t: "B9. Coordination and response", q: "Which diagram shows the phototropic response of the shoots after 48 hours?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "D" },
  { n: 10, t: "B9. Coordination and response", q: "What effects does the hormone (adrenaline) have on the blood glucose concentration and the heart rate of the athlete?", o: ["both decrease", "glucose decreases, heart rate increases", "glucose increases, heart rate decreases", "both increase"], a: "D" },
  { n: 11, t: "B10. Reproduction", q: "Which structure in a flower produces pollen?", o: ["sepal", "stamen", "stigma", "style"], a: "B" },
  { n: 12, t: "B10. Reproduction", q: "When does the development of a baby begin?", o: ["ejaculation of semen", "fertilisation of the ovum", "implantation in the wall of the uterus", "start of the mother's menstrual cycle"], a: "B" },
  { n: 13, t: "B12. Ecology", q: "Where does respiration occur in the carbon cycle?", o: ["1 only", "2 and 3", "3 and 4", "3 only"], a: "C" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C3. Atoms, elements and compounds", q: "Which diagram represents molecules?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "C" },
  { n: 15, t: "C7. Chemical reactions", q: "What is solid X and what is its mass? (mixture of 0.5g copper and 3g zinc added to excess sulfuric acid)", o: ["copper, less than 0.5g", "copper, 0.5g", "copper(II) oxide, 0.5g", "copper(II) oxide, greater than 0.5g"], a: "B" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "Which statements about element Y (proton 18, nucleon 40) are correct? (1: 40 neutrons, 2: 22 electrons, 3: unreactive, 4: Group 0)", o: ["1 and 2", "2 and 3", "2 and 4", "3 and 4"], a: "D" },
  { n: 17, t: "C12. Organic chemistry", q: "What is the formula of the hydrocarbon shown?", o: ["C2H5", "C3H8", "C4H9", "C4H10"], a: "D" },
  { n: 18, t: "C5. Electricity and chemistry", q: "Why is heat needed in the electrolysis of molten lead(II) bromide?", o: ["exothermic reaction takes place", "electrodes only conduct when hot", "heat causes reaction with air", "lead(II) bromide must be molten"], a: "D" },
  { n: 19, t: "C6. Energy changes in reactions", q: "Which change is the most exothermic? (initial/final temp provided)", o: ["19 -> 30", "20 -> 25", "22 -> 18", "25 -> 14"], a: "A" },
  { n: 20, t: "C7. Chemical reactions", q: "Which method cannot be used to investigate the rate of a chemical reaction?", o: ["Measuring change in mass of catalyst", "Measuring change in mass of reaction mixture", "Measuring time taken for reaction to complete", "Measuring volume of gas produced"], a: "A" },
  { n: 21, t: "C8. Acids, bases and salts", q: "What are the products of the reaction between sulfuric acid and potassium hydroxide?", o: ["potassium hydroxide, carbon dioxide, water", "potassium sulfate, water", "potassium sulfate, carbon dioxide, water", "potassium hydroxide, water"], a: "B" },
  { n: 22, t: "C8. Acids, bases and salts", q: "A substance reacts with dilute acid, producing a gas. The gas ignites with a pop. What is the substance?", o: ["copper", "copper(II) oxide", "magnesium", "magnesium carbonate"], a: "C" },
  { n: 23, t: "C9. The Periodic Table", q: "Which element has a high melting point and forms coloured compounds?", o: ["A", "B", "C", "D"], a: "A" },
  { n: 24, t: "C9. The Periodic Table", q: "Which statement about elements in Period 3 is correct?", o: ["All elements are metals.", "All elements are non-metals.", "Metals are on the left, non-metals are on the right.", "Non-metals are on the left, metals are on the right."], a: "C" },
  { n: 25, t: "C7. Chemical reactions", q: "What is the element? (floats, fizzes, burns with lilac flame)", o: ["copper", "potassium", "sodium", "zinc"], a: "B" },
  { n: 26, t: "C11. Air and water", q: "What is the purpose of the sand in water purification?", o: ["to remove all harmful bacteria", "to remove coloured soluble impurities", "to remove small insoluble particles", "to remove tree branches and other large objects"], a: "C" },
  { n: 27, t: "C12. Organic chemistry", q: "Which statement is not correct for methane, ethane and propane?", o: ["All three are hydrocarbons.", "All three burn.", "Methane is the main constituent of natural gas.", "Propane burns to form CO2 and hydrogen."], a: "D" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "A car travels 60 times around a 3.6 km track in 2.4 hours. What is the average speed?", o: ["1.5 km/h", "90 km/h", "144 km/h", "216 km/h"], a: "B" },
  { n: 29, t: "P1. Motion, forces and energy", q: "Which quantity is measured in newtons?", o: ["density", "energy", "potential difference", "weight"], a: "D" },
  { n: 30, t: "P1. Motion, forces and energy", q: "What should he do to determine the density? (He made a mistake)", o: ["divide mass by volume", "divide mass by weight", "divide volume by mass", "divide volume by weight"], a: "A" },
  { n: 31, t: "P1. Motion, forces and energy", q: "What is the unit for work and what is the unit for power?", o: ["work: J, power: N", "work: J, power: W", "work: N, power: W", "work: W, power: J"], a: "B" },
  { n: 32, t: "P1. Motion, forces and energy", q: "Which quantity will not affect the work done by the person lifting boxes?", o: ["height of platform", "number of boxes", "time taken", "weight of boxes"], a: "C" },
  { n: 33, t: "P2. Thermal physics", q: "Which statement about the molecules of a gas at 0 degC is correct?", o: ["They do not move.", "They move randomly.", "They move around each other in circular orbits.", "They vibrate about fixed positions."], a: "B" },
  { n: 34, t: "P2. Thermal physics", q: "What are the main processes by which heat energy is transferred from the element to the water, and throughout the water?", o: ["conduction / convection", "conduction / radiation", "convection / radiation", "radiation / conduction"], a: "A" },
  { n: 35, t: "P3. Waves", q: "Which path does the light take when the angle of incidence is significantly less than the critical angle?", o: ["Path A", "Path B", "Path C", "Path D"], a: "B" },
  { n: 36, t: "P3. Waves", q: "Which type of wave does P represent, and which type of wave does Q represent? (EM Spectrum)", o: ["microwaves / sound waves", "microwaves / X-rays", "sound waves / microwaves", "X-rays / microwaves"], a: "D" },
  { n: 37, t: "P3. Waves", q: "Which calculation should the student use to determine the speed of sound?", o: ["100 / 0.60", "100 / 1.2", "200 / 0.30", "200 / 0.60"], a: "D" },
  { n: 38, t: "P4. Electricity and magnetism", q: "Which diagram shows the directions of the two forces acting on ion X?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "A" },
  { n: 39, t: "P4. Electricity and magnetism", q: "Which arrangement has the smallest total resistance?", o: ["Arrangement A (parallel 4, 4)", "Arrangement B (series 2, 2)", "Arrangement C (parallel 4, 4, 4)", "Arrangement D (single 4)"], a: "A" },
  { n: 40, t: "P4. Electricity and magnetism", q: "Two identical lamps P and Q are connected in a circuit. Which statement is correct?", o: ["Each lamp can be switched off independently.", "If lamp Q breaks, lamp P stays alight.", "Lamp P is brighter than lamp Q.", "The current is the same in both lamps."], a: "D" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2015 Oct/Nov P1 Variant 2 (All 40 Questions)...");

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
      order: q.n + 200, // Offset: MJ V1(0), ON V1(40), MJ 2016(80), MJ V2(120), MJ V3(160), ON V2(200)
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2015 ON P1 Variant 2 Seeding Complete!");
}

main();
