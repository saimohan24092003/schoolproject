import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

dotenv.config({ path: '.env.local' });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const questions = [
  // --- BIOLOGY (1-12) ---
  { n: 1, t: "B5. Plant nutrition", q: "Which process produces an element that is excreted?", o: ["fertilisation", "photosynthesis", "respiration", "transpiration"], a: "B" },
  { n: 2, t: "B2. Cells", q: "The diagram shows a palisade cell. Which parts are found in plant cells and not in animal cells?", o: ["1, 3 and 4", "1, 3 and 5", "2, 4 and 6", "2, 5 and 6"], a: "C" },
  { n: 3, t: "B2. Cells", q: "Which substances may diffuse into and out of plant cells?", o: ["into: chlorophyll, out: oxygen", "into: oxygen, out: water", "into: starch, out: chlorophyll", "into: water, out: starch"], a: "B" },
  { n: 4, t: "B4. Enzymes", q: "When an apple is cut, the cut surface quickly turns brown. This is due to enzyme action. Which action destroys the enzyme?", o: ["brushing with strong sugar solution", "cutting into smaller pieces", "dipping in boiling water", "dipping in cold water"], a: "C" },
  { n: 5, t: "B6. Animal nutrition", q: "Which nutrients are needed in the diet to produce strong bones?", o: ["calcium and iron", "calcium and vitamin D", "iron and vitamin C", "iron and vitamin D"], a: "B" },
  { n: 6, t: "B5. Plant nutrition", q: "The diagram shows a section through a leaf. Where are there cells that contain the light-absorbing structures?", o: ["A and B", "A and C", "B and C", "B and D"], a: "C" },
  { n: 7, t: "B7. Transport", q: "The diagram represents the human heart and associated blood vessels. Which blood vessel carries deoxygenated blood away from the heart?", o: ["A", "B", "C", "D"], a: "B" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "Which word is missing from the equation for a chemical reaction which takes place in living cells? (carbon dioxide + ...... -> oxygen + glucose)", o: ["enzyme", "fat", "starch", "water"], a: "D" },
  { n: 9, t: "B9. Coordination and response", q: "Where in the body are hormones destroyed?", o: ["gall bladder", "kidney", "liver", "pancreas"], a: "C" },
  { n: 10, t: "B9. Coordination and response", q: "Which graph shows how the person's blood sugar level changes after the meal?", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "A" },
  { n: 11, t: "B10. Reproduction", q: "The diagram shows a section through a flower. Which row correctly identifies the labelled parts of the flower?", o: ["P: anther, Q: ovary, R: stigma", "P: anther, Q: stigma, R: ovary", "P: stamen, Q: carpel, R: sepal", "P: stamen, Q: sepal, R: carpel"], a: "B" },
  { n: 12, t: "B10. Reproduction", q: "Where do fertilisation and implantation occur?", o: ["fert: 1, impl: 2", "fert: 2, impl: 1", "fert: 2, impl: 3", "fert: 3, impl: 2"], a: "B" },

  // --- CHEMISTRY (13-27) ---
  { n: 13, t: "C11. Air and water", q: "When fossil fuels are burnt, what is released?", o: ["energy, CO2 and oxygen", "energy and CO2 only", "energy and oxygen only", "CO2 and oxygen only"], a: "B" },
  { n: 14, t: "C3. Atoms, elements and compounds", q: "How many atoms are in each of these molecules (water, ethanol, methane)?", o: ["water: 2, ethanol: 3, methane: 2", "water: 2, ethanol: 4, methane: 5", "water: 3, ethanol: 3, methane: 2", "water: 3, ethanol: 9, methane: 5"], a: "D" },
  { n: 15, t: "C2. Experimental techniques", q: "Which method is used to determine the number of dyes present in ink?", o: ["chromatography", "crystallisation", "distillation", "filtration"], a: "A" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "Fluorine and chlorine are in Group VII of the Periodic Table. Which number increases by eight from fluorine to chlorine?", o: ["number of atoms in one molecule", "number of electrons in one atom", "number of electrons in one molecule", "number of nucleons in one atom"], a: "B" },
  { n: 17, t: "C3. Atoms, elements and compounds", q: "What is the formula of sodium nitrate?", o: ["NaN3O", "NaNO3", "SN3O", "SNO3"], a: "B" },
  { n: 18, t: "C5. Electricity and chemistry", q: "Copper is deposited on the ......2...... when electricity is passed through the solution. Which words correctly complete the gaps?", o: ["gap 1: electrode, gap 2: anode", "gap 1: electrode, gap 2: cathode", "gap 1: electrolyte, gap 2: anode", "gap 1: electrolyte, gap 2: cathode"], a: "D" },
  { n: 19, t: "C6. Energy changes in reactions", q: "Which change must take place in an endothermic reaction?", o: ["Bubbles of gas are released.", "The mass decreases.", "The temperature decreases.", "The temperature increases."], a: "C" },
  { n: 20, t: "C7. Chemical reactions", q: "What is the order of the speed of reaction?", o: ["P -> R -> Q", "Q -> R -> P", "R -> P -> Q", "R -> Q -> P"], a: "D" },
  { n: 21, t: "C10. Metals", q: "Which two substances are oxidised in the blast furnace?", o: ["carbon and carbon monoxide", "carbon monoxide and carbon dioxide", "iron and carbon dioxide", "iron and iron oxide"], a: "A" },
  { n: 22, t: "C8. Acids, bases and salts", q: "What is X? (test with blue litmus turns red, silver nitrate forms white precipitate)", o: ["HCl", "HNO3", "NaCl", "NaOH"], a: "A" },
  { n: 23, t: "C10. Metals", q: "Which properties are shown by chromium?", o: ["high melting point, low density, acts as catalyst", "high melting point, low density", "low density, acts as catalyst", "high melting point, acts as catalyst"], a: "A" },
  { n: 24, t: "C3. Atoms, elements and compounds", q: "What is this new alloy used to make?", o: ["aircraft frames", "cutlery", "electrical insulators", "food containers"], a: "A" },
  { n: 25, t: "C7. Chemical reactions", q: "The diagram shows an element being added to cold water to form a gas and an alkaline solution. What is the element?", o: ["calcium", "carbon", "copper", "sulfur"], a: "A" },
  { n: 26, t: "C12. Organic chemistry", q: "Which process does not produce carbon dioxide?", o: ["combustion of coal", "reaction of calcium carbonate with HCl", "respiration", "rusting of iron"], a: "D" },
  { n: 27, t: "C12. Organic chemistry", q: "Which gas is the main constituent of natural gas?", o: ["carbon dioxide", "methane", "nitrogen", "oxygen"], a: "B" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "A student travels 6.0 km at a steady speed. She completes her journey in 5.0 minutes. What is her speed?", o: ["1.2 m/s", "20 m/s", "30 m/s", "50 m/s"], a: "B" },
  { n: 29, t: "P1. Motion, forces and energy", q: "What is the density of the cheese?", o: ["0.42 g/cm3", "0.83 g/cm3", "1.2 g/cm3", "2.4 g/cm3"], a: "C" },
  { n: 30, t: "P1. Motion, forces and energy", q: "In which form is the energy stored in petrol and in a box of matches?", o: ["petrol: chemical, box: chemical", "petrol: chemical, box: thermal", "petrol: kinetic, box: chemical", "petrol: kinetic, box: thermal"], a: "A" },
  { n: 31, t: "P2. Thermal physics", q: "A container of milk is wrapped in a wet cloth. Air blows over the cloth. Which statement is correct?", o: ["temp falls because less energetic escape", "temp falls because more energetic escape", "temp rises because less energetic escape", "temp rises because more energetic escape"], a: "B" },
  { n: 32, t: "P2. Thermal physics", q: "Which graph shows how its temperature changes with time (pure solid heated until all liquid)?", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "D" },
  { n: 33, t: "P2. Thermal physics", q: "Which row is correct for conduction and convection of heat?", o: ["cond: in solid, conv: in solid", "cond: in solid, conv: only in liquids/gases", "cond: only in liquids/gases, conv: in solid", "cond: only in liquids/gases, conv: only in liquids/gases"], a: "B" },
  { n: 34, t: "P3. Waves", q: "Waves cause a small boat to move regularly up and down. A student calculates the number of times that the boat moves up and down in one second. Which wave property has he calculated?", o: ["amplitude", "frequency", "speed", "wavelength"], a: "B" },
  { n: 35, t: "P3. Waves", q: "What is the angle of reflection of the ray when it is reflected from the mirror?", o: ["40 deg", "50 deg", "80 deg", "100 deg"], a: "A" },
  { n: 36, t: "P3. Waves", q: "What are the main types of wave given out by the lamp?", o: ["visible light and infra-red", "visible light and microwaves", "visible light and radio waves", "visible light and X-rays"], a: "A" },
  { n: 37, t: "P3. Waves", q: "A whistle produces a sound that dogs can hear. It cannot be heard by humans. What is a possible frequency?", o: ["0.025 kHz", "0.25 kHz", "2.5 kHz", "25 kHz"], a: "D" },
  { n: 38, t: "P4. Electricity and magnetism", q: "The current in the air conditioner is 9.0A and the current in the television is 2.0A. Which fuse should be connected at X?", o: ["1 A", "3 A", "7 A", "13 A"], a: "D" },
  { n: 39, t: "P4. Electricity and magnetism", q: "Which statement about the circuit is true?", o: ["ammeter and voltmeter should change places", "circuit is correct", "voltmeter should be in position X", "voltmeter should be in position Y"], a: "B" },
  { n: 40, t: "P4. Electricity and magnetism", q: "The diagrams show different arrangements of identical resistors. Which arrangement has the least resistance?", o: ["Arrangement A", "Arrangement B", "Arrangement C", "Arrangement D"], a: "C" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2015 May/June P1 Variant 3 (All 40 Questions)...");

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
      order: q.n + 160, // Offset to avoid collision with V1 (0), V2 (120), ON (40), 2016 (80)
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2015 P1 Variant 3 Seeding Complete!");
}

main();
