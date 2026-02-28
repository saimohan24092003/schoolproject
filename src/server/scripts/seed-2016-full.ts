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
  { n: 1, t: "B1. Characteristics of living organisms", q: "What are characteristics of all living organisms?", o: ["breathing, photosynthesis, transpiration", "circulation, excretion, nutrition", "digestion, growth, movement", "respiration, reproduction, sensitivity"], a: "D" },
  { n: 2, t: "B2. Cells", q: "The diagram shows an animal cell. Diameter is 25mm, actual is 0.02mm. What is the magnification?", o: ["x25", "x200", "x1250", "x2500"], a: "C" },
  { n: 3, t: "B2. Cells", q: "Which statement about diffusion of water is not correct?", o: ["Diffusion of water takes place only in liquids.", "Relies on random movement of molecules.", "Molecules small enough to diffuse through cell membranes.", "Molecules small enough to diffuse through cell walls."], a: "A" },
  { n: 4, t: "B4. Enzymes", q: "What describes an enzyme?", o: ["a protein that acts as a catalyst", "a protein that acts as a hormone", "a vitamin that acts as a catalyst", "a vitamin that acts as a hormone"], a: "A" },
  { n: 5, t: "B5. Plant nutrition", q: "Which part of a leaf contains the pigment needed for photosynthesis?", o: ["cuticle", "mesophyll cells", "phloem cells", "stomata"], a: "B" },
  { n: 6, t: "B7. Transport", q: "The diagram shows a heart. Which structures are joined by the tendons?", o: ["atrium wall and septum", "atrium wall and valve", "septum and ventricle wall", "valve and ventricle wall"], a: "D" },
  { n: 7, t: "B7. Transport", q: "How is the sugar transported to the rest of the plant?", o: ["phloem, downwards only", "xylem, upwards only", "upwards and downwards in phloem", "upwards and downwards in xylem"], a: "C" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "What is the purpose of respiration?", o: ["enrich atmosphere with oxygen", "release energy for the organism", "supply water for the organism", "take oxygen into lungs"], a: "B" },
  { n: 9, t: "B8. Gas exchange and respiration", q: "Where does most of the oxygen enter the blood?", o: ["an alveolus", "a bronchiole", "a bronchus", "the trachea"], a: "A" },
  { n: 10, t: "B9. Coordination and response", q: "Which person has the highest concentration of adrenaline in their blood?", o: ["Person A", "Person B", "Person C", "Person D"], a: "D" },
  { n: 11, t: "B10. Reproduction", q: "Which statement about sexual reproduction is always correct?", o: ["involves only one parent", "involves fusion of nuclei", "produces genetically identical offspring", "takes place only in animals"], a: "B" },
  { n: 12, t: "B10. Reproduction", q: "When is the next time that sexual intercourse is most likely to result in fertilisation?", o: ["immediately", "one week later", "5 days after menstruation", "14 days after start of menstruation"], a: "D" },
  { n: 13, t: "B12. Ecology", q: "How many consumer levels are there?", o: ["1", "4", "5", "6"], a: "C" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C2. Experimental techniques", q: "What is in beaker 2?", o: ["mixture of element and compound", "mixture of two compounds", "one compound only", "one element only"], a: "B" },
  { n: 15, t: "C3. Atoms, elements and compounds", q: "Which types of substance do C, CO2 and O2 represent?", o: ["C: compound, CO2: compound, O2: element", "C: compound, CO2: element, O2: compound", "C: element, CO2: compound, O2: element", "C: element, CO2: element, O2: compound"], a: "C" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "Which element forms an ionic compound with element P?", o: ["Element Q", "Element R", "Element S", "Element T"], a: "B" },
  { n: 17, t: "C5. Electricity and chemistry", q: "Which statement about the electrolysis is correct?", o: ["green gas given off at X", "electrode Y is anode", "only physical change", "electrolyte is in molten state"], a: "D" },
  { n: 18, t: "C6. Energy changes in reactions", q: "What happens during all endothermic changes?", o: ["gas is produced", "solids melt", "temperature decreases", "colour change"], a: "C" },
  { n: 19, t: "C7. Chemical reactions", q: "Which statement describes a redox reaction?", o: ["acid reacts with base", "only oxidation takes place", "oxygen transferred from one substance to another", "two substances are both reduced"], a: "C" },
  { n: 20, t: "C3. Atoms, elements and compounds", q: "What is X (Hydrogen gas produced)?", o: ["zinc", "zinc carbonate", "zinc hydroxide", "zinc oxide"], a: "A" },
  { n: 21, t: "C8. Acids, bases and salts", q: "Which test is used to identify ammonia?", o: ["glowing splint relights", "damp blue litmus bleached", "damp red litmus turns blue", "limewater turns milky"], a: "C" },
  { n: 22, t: "C9. The Periodic Table", q: "What is the position of this soft metal in the Periodic Table?", o: ["Position A", "Position B", "Position C", "Position D"], a: "A" },
  { n: 23, t: "C9. The Periodic Table", q: "Which statement describes a transition element?", o: ["metal that forms white compounds", "metal with a high melting point", "metal with a low density", "non-metal that forms coloured compounds"], a: "B" },
  { n: 24, t: "C10. Metals", q: "What is the order of reactivity (most to least)?", o: ["R -> P -> Q -> S", "R -> Q -> P -> S", "S -> P -> Q -> R", "S -> Q -> P -> R"], a: "D" },
  { n: 25, t: "C11. Air and water", q: "Which statement about the liquid must be correct (turns pink)?", o: ["contains water", "is acidic", "is anhydrous", "is pure water"], a: "A" },
  { n: 26, t: "C7. Chemical reactions", q: "Which reaction involves combustion?", o: ["calcium carbonate decomposition", "methane + oxygen", "sodium carbonate + acid", "sodium hydroxide + acid"], a: "B" },
  { n: 27, t: "C12. Organic chemistry", q: "What is the name of the type of compound containing only carbon and hydrogen?", o: ["carbohydrate", "carbonate", "hydrocarbon", "hydroxide"], a: "C" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "Which graph shows the speed of the train during the whole journey?", o: ["Graph A", "Graph B", "Graph C", "Graph D"], a: "B" },
  { n: 29, t: "P1. Motion, forces and energy", q: "What is the length of each side of the cube (2700g, 2.7g/cm³)?", o: ["1.0 cm", "10 cm", "100 cm", "1000 cm"], a: "B" },
  { n: 30, t: "P1. Motion, forces and energy", q: "For which energy resource is the Sun not the original source?", o: ["hydroelectric", "natural gas", "nuclear", "waves"], a: "C" },
  { n: 31, t: "P2. Thermal physics", q: "Which row is correct for the escaping molecules and temperature change?", o: ["highest, decreases", "highest, increases", "lowest, decreases", "lowest, increases"], a: "A" },
  { n: 32, t: "P2. Thermal physics", q: "At which temperature are both benzene and glycerine liquid?", o: ["0°C", "50°C", "90°C", "300°C"], a: "B" },
  { n: 33, t: "P2. Thermal physics", q: "What happens to the air as it is heated by the heater?", o: ["density decreases and falls", "density decreases and rises", "density increases and falls", "density increases and rises"], a: "B" },
  { n: 34, t: "P3. Waves", q: "What is the amplitude and wavelength (from diagram)?", o: ["amp: 5.0, wave: 10", "amp: 5.0, wave: 20", "amp: 10, wave: 10", "amp: 10, wave: 20"], a: "B" },
  { n: 35, t: "P3. Waves", q: "Which diagram shows angle of incidence i and refraction r?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "B" },
  { n: 36, t: "P3. Waves", q: "Which type of wave is used by television remote controllers?", o: ["infra-red", "microwaves", "radio", "ultraviolet"], a: "A" },
  { n: 37, t: "P3. Waves", q: "Which type of sound does she make and which distance does she use?", o: ["short, 2x distance", "short, 1/2 distance", "continuous, 2x distance", "continuous, 1/2 distance"], a: "C" },
  { n: 38, t: "P4. Electricity and magnetism", q: "Which changes to R and V must produce a smaller current?", o: ["R: dec, V: dec", "R: dec, V: inc", "R: inc, V: dec", "R: inc, V: inc"], a: "C" },
  { n: 39, t: "P4. Electricity and magnetism", q: "For movement of bubbles to happen, which statement is correct?", o: ["bubbles negative", "bubbles positive", "bubbles opposite charge to student", "bubbles same charge as student"], a: "D" },
  { n: 40, t: "P4. Electricity and magnetism", q: "Which unit is used when stating the value of X, Y and Z?", o: ["X: amp, Y: ohm, Z: volt", "X: amp, Y: volt, Z: ohm", "X: ohm, Y: amp, Z: volt", "X: ohm, Y: volt, Z: amp"], a: "D" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2016 May/June P1 (All 40 Questions)...");

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
      order: q.n + 80, // Offset
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2016 May/June P1 Seeding Complete!");
}

main();
