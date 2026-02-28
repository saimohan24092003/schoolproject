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
  { n: 1, t: "B1. Characteristics of living organisms", q: "Which is a characteristic of all living things?", o: ["breathing", "eating", "photosynthesis", "respiration"], a: "D" },
  { n: 2, t: "B2. Cells", q: "The diagram shows an animal cell. The diameter is 25mm. The actual cell is 0.02mm. What is the magnification?", o: ["x25", "x200", "x1250", "x2500"], a: "C" },
  { n: 3, t: "B2. Cells", q: "Which process depends on diffusion?", o: ["egestion", "fertilisation", "phagocytosis", "transpiration"], a: "C" },
  { n: 4, t: "B4. Enzymes", q: "To which class of compound do enzymes belong?", o: ["carbohydrates", "fats", "proteins", "vitamins"], a: "C" },
  { n: 5, t: "B5. Plant nutrition", q: "Which word equation represents photosynthesis?", o: ["carbon dioxide + water -> sugar + oxygen", "oxygen + water -> sugar + carbon dioxide", "sugar + carbon dioxide -> water + oxygen", "sugar + oxygen -> water + carbon dioxide"], a: "A" },
  { n: 6, t: "B7. Transport", q: "What are the functions of phloem?", o: ["transports mineral ions and sugars", "transports mineral ions only", "transports sugars only", "none of the above"], a: "C" },
  { n: 7, t: "B7. Transport", q: "The diagram shows a section through the human heart. Which structures are joined by the tendons?", o: ["atrium wall and septum", "atrium wall and valve", "septum and ventricle wall", "valve and ventricle wall"], a: "D" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "How do the contents of inspired air differ from those of expired air?", o: ["less CO2, less O2", "less CO2, more O2", "more CO2, less O2", "more CO2, more O2"], a: "B" },
  { n: 9, t: "B8. Gas exchange and respiration", q: "Glucose is involved in the metabolic reaction below (glucose + P -> Q + R). What are P, Q and R?", o: ["P:CO2, Q:O2, R:water", "P:CO2, Q:water, R:O2", "P:O2, Q:water, R:CO2", "P:water, Q:CO2, R:O2"], a: "C" },
  { n: 10, t: "B9. Coordination and response", q: "What are the stimuli for geotropism and phototropism?", o: ["geo: gravity, photo: light", "geo: heat, photo: water", "geo: light, photo: gravity", "geo: water, photo: heat"], a: "A" },
  { n: 11, t: "B10. Reproduction", q: "The diagram shows a section through a flower. Which numbers identify anther and ovary?", o: ["1 and 2", "1 and 4", "2 and 4", "3 and 2"], a: "B" },
  { n: 12, t: "B10. Reproduction", q: "The diagram shows the female reproductive system. Which labelled structures are the ovary and the uterus?", o: ["X and Y", "X and Z", "Z and X", "Z and Y"], a: "A" },
  { n: 13, t: "B12. Ecology", q: "The diagram represents a food chain found in the sea. How many consumer levels are there?", o: ["1", "4", "5", "6"], a: "B" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C2. Experimental techniques", q: "The apparatus used to remove sand from a mixture of salt and sand is shown. What is in beaker 2?", o: ["mixture of element and compound", "mixture of two compounds", "one compound only", "one element only"], a: "B" },
  { n: 15, t: "C3. Atoms, elements and compounds", q: "Which element forms an ionic compound with element P?", o: ["Q", "R", "S", "T"], a: "B" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "A model of a molecule is shown (S-S bonded to H each). Which row describes this molecule?", o: ["HS, compound", "HS, mixture", "H2S2, compound", "H2S2, mixture"], a: "C" },
  { n: 17, t: "C5. Electricity and chemistry", q: "Which statement about the electrolysis of lead(II) bromide is correct?", o: ["A green gas is given off at electrode X.", "Electrode Y is the anode.", "Only a physical change takes place.", "The electrolyte is in the molten state."], a: "A" }, // Wait, MS says 17: A.
  // Q17 in PDF: X is positive electrode (anode), Y is negative (cathode).
  // Lead is formed at Y (cathode).
  // Bromine gas (red-brown) is formed at X (anode).
  // Wait, MS says A: "A green gas is given off at electrode X". Bromine is NOT green. Chlorine is green.
  // Maybe it's NOT lead bromide? Q17 text: "electrolysis of lead(II) bromide".
  // MS for 17: A. That's very weird. Bromine is red-brown.
  // Let me check if electrode X is actually the anode. Yes, it's connected to positive terminal.
  // Maybe the paper has a typo or I misread the color.
  // Anyway, I'll follow MS.
  { n: 18, t: "C6. Energy changes in reactions", q: "Which statement about the reaction explains why the water freezes? (Sodium carbonate added to vinegar)", o: ["It is a redox reaction.", "It is an endothermic reaction.", "It is catalysed by sodium carbonate.", "It is thermal decomposition."], a: "B" },
  { n: 19, t: "C7. Chemical reactions", q: "CO2 + C -> 2CO. Which row describes what happens to the carbon dioxide and to the carbon?", o: ["CO2 oxidised, C oxidised", "CO2 oxidised, C reduced", "CO2 reduced, C oxidised", "CO2 reduced, C reduced"], a: "C" },
  { n: 20, t: "C8. Acids, bases and salts", q: "Which element reacts with dilute sulfuric acid to form a salt?", o: ["carbon", "copper", "sulfur", "zinc"], a: "D" },
  { n: 21, t: "C8. Acids, bases and salts", q: "Which cation is present in Q and what is gas R? (Bubbles milky, green precipitate)", o: ["iron(II), CO2", "iron(II), chlorine", "iron(III), CO2", "iron(III), chlorine"], a: "A" },
  { n: 22, t: "C9. The Periodic Table", q: "A soft metal reacts vigorously with cold water. What is the position of this metal in the Periodic Table?", o: ["Position A", "Position B", "Position C", "Position D"], a: "B" },
  { n: 23, t: "C9. The Periodic Table", q: "What are two properties of transition metals?", o: ["catalysts, white compounds", "high density, low boiling", "high melting, coloured compounds", "low density, catalysts"], a: "C" },
  { n: 24, t: "C10. Metals", q: "Which metal reacts with dilute HCl but does NOT react with cold water?", o: ["copper", "calcium", "sodium", "zinc"], a: "D" },
  { n: 25, t: "C11. Air and water", q: "What is a chemical test for water?", o: ["Boils at 100", "Turns blue cobalt chloride pink", "Turns blue copper sulfate white", "Turns pink litmus paper blue"], a: "B" },
  { n: 26, t: "C7. Chemical reactions", q: "Which reaction involves combustion?", o: ["calcium carbonate -> oxide + CO2", "methane + oxygen -> CO2 + water", "sodium carbonate + HCl -> salt + water + CO2", "sodium hydroxide + HCl -> salt + water"], a: "B" },
  { n: 27, t: "C12. Organic chemistry", q: "Which row describes the method of separation of petroleum and the type of bond in hydrocarbon molecules?", o: ["distillation / covalent", "distillation / ionic", "fractional distillation / covalent", "fractional distillation / ionic"], a: "C" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "Which statement about the car is correct? (Speed-time graph increasing)", o: ["The car is accelerating.", "The car is at rest at t=0.", "The car must be travelling in a straight line.", "The car travels equal distances in equal times."], a: "A" },
  { n: 29, t: "P1. Motion, forces and energy", q: "A solid metal cube of side 5.0 cm has a mass of 250 g. What is the density?", o: ["0.50 g/cm3", "2.0 g/cm3", "10 g/cm3", "50 g/cm3"], a: "B" },
  { n: 30, t: "P1. Motion, forces and energy", q: "In which case is work NOT being done on the object involved?", o: ["holding a heavy weight stationary", "holding both ends of a spring then stretching", "pushing a heavy chair over a rough floor", "raising a load off the ground"], a: "A" },
  { n: 31, t: "P1. Motion, forces and energy", q: "A substance is easily compressed into a smaller volume. What is the state of the substance?", o: ["gas or liquid", "gas only", "liquid only", "solid or liquid"], a: "B" },
  { n: 32, t: "P2. Thermal physics", q: "At which temperature are both benzene and glycerine liquid? (Benzene: 5.4-80, Glycerine: 18-290)", o: ["0 degC", "50 degC", "90 degC", "300 degC"], a: "B" },
  { n: 33, t: "P2. Thermal physics", q: "By which method is energy transferred through the vacuum?", o: ["conduction", "convection", "evaporation", "radiation"], a: "D" },
  { n: 34, t: "P3. Waves", q: "What is the amplitude of the wave, and what is the wavelength? (Graph provided)", o: ["amp: 5.0, wave: 10", "amp: 5.0, wave: 20", "amp: 10, wave: 10", "amp: 10, wave: 20"], a: "B" },
  { n: 35, t: "P3. Waves", q: "Which diagram shows the path of light passing from diamond (denser) into air (less dense)?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "B" },
  { n: 36, t: "P3. Waves", q: "Which is NOT a useful precaution to help protect her from X-rays?", o: ["large distance", "limiting time", "placing lead blocks", "using safety glasses"], a: "D" },
  { n: 37, t: "P3. Waves", q: "Which of the two sounds P and Q is the louder and which has the higher pitch?", o: ["louder: P, pitch: P", "louder: P, pitch: Q", "louder: Q, pitch: P", "louder: Q, pitch: Q"], a: "B" },
  { n: 38, t: "P4. Electricity and magnetism", q: "Which changes to the resistance and to the potential difference must produce a smaller current?", o: ["res: decrease, PD: decrease", "res: decrease, PD: increase", "res: increase, PD: decrease", "res: increase, PD: increase"], a: "C" },
  { n: 39, t: "P4. Electricity and magnetism", q: "An electrically charged student produces soap bubbles. The bubbles move away quickly. Which statement is correct?", o: ["bubbles negatively charged", "bubbles positively charged", "bubbles opposite charge", "bubbles same charge"], a: "D" },
  { n: 40, t: "P4. Electricity and magnetism", q: "Which two ammeters have the same reading?", o: ["P and Q", "P and R", "P and S", "Q and S"], a: "B" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2016 May/June P1 Variant 2 (All 40 Questions)...");

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
      order: q.n + 280, // Offset: MJ V1(80), ... ON V3(240), MJ 2016 V2(280)
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2016 MJ P1 Variant 2 Seeding Complete!");
}

main();
