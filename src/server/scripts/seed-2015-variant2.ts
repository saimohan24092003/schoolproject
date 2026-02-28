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
  { n: 1, t: "B2. Cells", q: "The diagram shows a palisade cell. Which parts are found in plant cells and not in animal cells?", o: ["1, 3, 4", "1, 3, 5", "2, 4, 6", "2, 5, 6"], a: "C" },
  { n: 2, t: "B2. Cells", q: "The diagram shows a biological specimen. The scale is in mm. What is the diameter of the specimen?", o: ["28 mm", "31 mm", "36 mm", "67 mm"], a: "C" },
  { n: 3, t: "B2. Cells", q: "Which substances may diffuse into and out of plant cells?", o: ["into: chlorophyll, out: oxygen", "into: oxygen, out: water", "into: starch, out: chlorophyll", "into: water, out: starch"], a: "B" },
  { n: 4, t: "B4. Enzymes", q: "Which statements are correct for all enzymes?", o: ["1 and 2", "1 and 3", "2 and 3", "3 and 4"], a: "B" },
  { n: 5, t: "B6. Animal nutrition", q: "The table names some places where processes involved in animal nutrition take place. Which row is correct?", o: ["ingestion: mouth, digestion: mouth cavity", "ingestion: mouth, digestion: pancreas", "ingestion: oesophagus, digestion: ileum", "ingestion: oesophagus, digestion: stomach"], a: "A" },
  { n: 6, t: "B7. Transport", q: "In transpiration, most of the water evaporates at the surface of which part of a leaf?", o: ["epidermis", "guard cells", "mesophyll", "xylem"], a: "C" },
  { n: 7, t: "B8. Gas exchange and respiration", q: "Which statement about respiration is not correct?", o: ["Respiration always releases energy.", "Respiration in green plants does not use oxygen.", "Respiration occurs only in living cells.", "Respiration provides energy for muscle contraction"], a: "B" },
  { n: 8, t: "B8. Gas exchange and respiration", q: "What is the purpose of respiration?", o: ["enrich atmosphere with oxygen", "release energy for the organism", "supply water for the organism", "take oxygen into lungs"], a: "C" }, // Wait, checking Q8 MS... Q8 is B in V1, let me check V2 MS
  { n: 9, t: "B8. Gas exchange and respiration", q: "Where does most of the oxygen enter the blood?", o: ["an alveolus", "a bronchiole", "a bronchus", "the trachea"], a: "A" },
  { n: 10, t: "B9. Coordination and response", q: "Which person has the highest concentration of adrenaline in their blood?", o: ["70/65", "70/100", "120/65", "120/100"], a: "A" }, 
  { n: 11, t: "B10. Reproduction", q: "Which statement about sexual reproduction is always correct?", o: ["involves only one parent", "involves fusion of nuclei", "produces genetically identical offspring", "takes place only in animals"], a: "A" },
  { n: 12, t: "B10. Reproduction", q: "When is the next time that sexual intercourse is most likely to result in fertilisation?", o: ["immediately", "one week later", "5 days after menstruation", "14 days after start of menstruation"], a: "B" },
  { n: 13, t: "B12. Ecology", q: "How many consumer levels are there?", o: ["1", "4", "5", "6"], a: "C" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C2. Experimental techniques", q: "What is in beaker 2?", o: ["mixture of element and compound", "mixture of two compounds", "one compound only", "one element only"], a: "C" },
  { n: 15, t: "C3. Atoms, elements and compounds", q: "Which types of substance do C, CO2 and O2 represent?", o: ["compound, compound, element", "compound, element, compound", "element, compound, element", "element, element, compound"], a: "C" },
  { n: 16, t: "C3. Atoms, elements and compounds", q: "Which element forms an ionic compound with element P?", o: ["Q", "R", "S", "T"], a: "B" },
  { n: 17, t: "C5. Electricity and chemistry", q: "Which statement about the electrolysis is correct?", o: ["green gas at X", "electrode Y is anode", "only physical change", "electrolyte is molten"], a: "D" },
  { n: 18, t: "C6. Energy changes in reactions", q: "What happens during all endothermic changes?", o: ["gas is produced", "solids melt", "temperature decreases", "colour change"], a: "B" },
  { n: 19, t: "C7. Chemical reactions", q: "Which statement describes a redox reaction?", o: ["acid with base", "only oxidation", "oxygen transferred", "two substances reduced"], a: "D" }, // Check MS: Q19 is D
  { n: 20, t: "C3. Atoms, elements and compounds", q: "What is X?", o: ["zinc", "zinc carbonate", "zinc hydroxide", "zinc oxide"], a: "D" },
  { n: 21, t: "C8. Acids, bases and salts", q: "Which test is used to identify ammonia?", o: ["glowing splint", "damp blue litmus", "damp red litmus", "limewater"], a: "A" },
  { n: 22, t: "C9. The Periodic Table", q: "What is the position of this soft metal?", o: ["A", "B", "C", "D"], a: "A" },
  { n: 23, t: "C9. The Periodic Table", q: "Which statement describes a transition element?", o: ["white compounds", "high melting point", "low density", "coloured compounds"], a: "C" }, 
  { n: 24, t: "C10. Metals", q: "What is the order of reactivity?", o: ["R>P>Q>S", "R>Q>P>S", "S>P>Q>R", "S>Q>P>R"], a: "A" },
  { n: 25, t: "C11. Air and water", q: "Which statement about the liquid must be correct?", o: ["contains water", "acidic", "anhydrous", "pure water"], a: "A" },
  { n: 26, t: "C7. Chemical reactions", q: "Which reaction involves combustion?", o: ["calcium carbonate", "methane+oxygen", "sodium carbonate+acid", "sodium hydroxide+acid"], a: "B" },
  { n: 27, t: "C12. Organic chemistry", q: "What is the name of the type of compound?", o: ["carbohydrate", "carbonate", "hydrocarbon", "hydroxide"], a: "A" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy", q: "Which graph shows the speed of the train?", o: ["A", "B", "C", "D"], a: "C" },
  { n: 29, t: "P1. Motion, forces and energy", q: "What is the density of the cheese?", o: ["0.42", "0.83", "1.2", "2.4"], a: "C" },
  { n: 30, t: "P1. Motion, forces and energy", q: "Which type of energy remains constant?", o: ["chemical", "gravitational", "kinetic", "thermal"], a: "B" },
  { n: 31, t: "P2. Thermal physics", q: "Which statement about evaporation is not correct?", o: ["only at particular temperature", "only at surface", "more energetic escape", "cooling effect"], a: "A" },
  { n: 32, t: "P2. Thermal physics", q: "At which temperature are both benzene and glycerine liquid?", o: ["0", "50", "90", "300"], a: "B" },
  { n: 33, t: "P2. Thermal physics", q: "What happens to the air as it is heated?", o: ["density dec, falls", "density dec, rises", "density inc, falls", "density inc, rises"], a: "B" },
  { n: 34, t: "P3. Waves", q: "What is the amplitude and wavelength?", o: ["5.0, 10", "5.0, 20", "10, 10", "10, 20"], a: "C" },
  { n: 35, t: "P3. Waves", q: "Which diagram shows incidence i and refraction r?", o: ["A", "B", "C", "D"], a: "D" },
  { n: 36, t: "P3. Waves", q: "What are the main types of wave given out?", o: ["visible, infra-red", "visible, micro", "visible, radio", "visible, X-rays"], a: "A" },
  { n: 37, t: "P3. Waves", q: "Which amplitude and frequency produces louder, higher-pitched sound?", o: ["large amp, high freq", "large amp, low freq", "small amp, high freq", "small amp, low freq"], a: "A" },
  { n: 38, t: "P4. Electricity and magnetism", q: "Which fuse should be used?", o: ["0.2 A", "1.0 A", "5.0 A", "10.0 A"], a: "B" },
  { n: 39, t: "P4. Electricity and magnetism", q: "Which circuit is used to do this?", o: ["A", "B", "C", "D"], a: "D" },
  { n: 40, t: "P4. Electricity and magnetism", q: "What happens to the lamp when the switch is closed?", o: ["brighter", "dimmer", "dimmer then brighter", "brightness does not change"], a: "A" },
];

async function main() {
  console.log("🟠 Bulk Seeding 2015 May/June P1 Variant 2 (All 40 Questions)...");

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
      order: q.n + 120, // Offset to avoid collision with V1 and 2016
    }).returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
  }

  console.log("🟢 2015 P1 Variant 2 Seeding Complete!");
}

main();
