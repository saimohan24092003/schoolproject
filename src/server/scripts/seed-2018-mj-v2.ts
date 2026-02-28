import dns from "node:dns";
import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

// DNS patch for local DNS blocking of neon.tech
const { Resolver } = dns;
const _origLookup = (dns as any).lookup.bind(dns);
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (hostname && hostname.includes("neon.tech")) {
    const resolver = new Resolver();
    resolver.setServers(["8.8.8.8", "8.8.4.4"]);
    const opts = typeof options === "object" && options !== null ? options : {};
    const returnAll = opts.all === true;
    resolver.resolve4(hostname, (err: any, addresses: string[]) => {
      if (err || !addresses || !addresses.length) return _origLookup(hostname, options, callback);
      const cb = typeof options === "function" ? options : callback;
      if (returnAll) cb(null, addresses.map((a: string) => ({ address: a, family: 4 })));
      else cb(null, addresses[0], 4);
    });
  } else {
    _origLookup(hostname, options, callback);
  }
};

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

// 2018 May/June 0653/12 — Answer key from official MS
// 1C 2D 3C 4D 5A 6B 7B 8C 9A 10D 11C 12D 13A 14A 15D 16C 17A 18D 19D 20C
// 21B 22D 23C 24B 25D 26A 27B 28C 29D 30D 31A 32B 33D 34C 35D 36C 37B 38B 39A 40D

const questions = [
  // --- BIOLOGY (1–13) ---
  { n: 1,  t: "B2. Cells",                          q: "Which pair of structures is found in a plant cell but NOT in an animal cell?", o: ["cell membrane and chloroplasts", "cell membrane and cytoplasm", "cell wall and chloroplasts", "cell wall and cytoplasm"], a: "C" },
  { n: 2,  t: "B4. Enzymes",                        q: "A student investigates the effect of temperature on the digestion of starch by amylase. Which row in the table shows the temperature at which digestion is fastest?", o: ["All tubes remain blue-black throughout", "One tube turns brown at 6 minutes", "One tube turns brown at 4 minutes", "All tubes turn brown immediately"], a: "D" },
  { n: 3,  t: "B6. Animal nutrition",               q: "When biuret reagent is added to a food sample, the mixture turns purple. Which food substance is present?", o: ["fat", "glycerol", "protein", "vitamin"], a: "C" },
  { n: 4,  t: "B5. Plant nutrition",                q: "Which two substances are required for photosynthesis?", o: ["carbon dioxide and glucose", "glucose and oxygen", "oxygen and water", "water and carbon dioxide"], a: "D" },
  { n: 5,  t: "B6. Animal nutrition",               q: "The diagram shows a section through a tooth. Which region is made of the hardest material?", o: ["enamel (outer layer)", "dentine", "cement", "pulp"], a: "A" },
  { n: 6,  t: "B7. Transport",                      q: "The diagram shows a cross-section of a leaf. Through which structure does water enter the leaf from the stem?", o: ["upper epidermis", "xylem", "phloem", "stomata"], a: "B" },
  { n: 7,  t: "B7. Transport",                      q: "When the heart is pumping blood to the lungs, which row correctly shows which valves are open and which are closed?", o: ["atrioventricular valves: closed, semilunar valves to lungs: closed, semilunar valves to body: open, atrioventricular right: closed", "right atrioventricular: closed, left atrioventricular: closed, pulmonary semilunar: open, aortic semilunar: open", "right atrioventricular: open, left atrioventricular: open, pulmonary semilunar: closed, aortic semilunar: closed", "right atrioventricular: open, left atrioventricular: open, pulmonary semilunar: closed, aortic semilunar: open"], a: "B" },
  { n: 8,  t: "B8. Gas exchange and respiration",   q: "Which equation represents aerobic respiration?", o: ["carbon dioxide + oxygen → glucose + water", "carbon dioxide + water → glucose + oxygen", "glucose + oxygen → carbon dioxide + water", "glucose + water → carbon dioxide + oxygen"], a: "C" },
  { n: 9,  t: "B9. Coordination and response",      q: "What is one effect of adrenaline on the body?", o: ["increases blood glucose concentration", "increases the rate of digestion", "maintains body temperature", "slows the heart rate"], a: "A" },
  { n: 10, t: "B10. Reproduction",                  q: "Which row correctly describes sexual reproduction?", o: ["involves one parent, produces identical offspring, no zygote formed", "involves two parents, produces identical offspring, no zygote formed", "involves two parents, produces identical offspring, zygote formed", "involves two parents, produces non-identical offspring, zygote formed"], a: "D" },
  { n: 11, t: "B10. Reproduction",                  q: "Anthers are part of which structure in a flower?", o: ["carpels", "sepals", "stamens", "stigma"], a: "C" },
  { n: 12, t: "B12. Ecology",                       q: "In the food chain: maize → mouse → owl. Which row correctly identifies the roles of each organism?", o: ["maize: consumer, mouse: carnivore, owl: producer", "maize: consumer, mouse: herbivore, owl: carnivore", "maize: producer, mouse: carnivore, owl: herbivore", "maize: producer, mouse: herbivore, owl: carnivore"], a: "D" },
  { n: 13, t: "B12. Ecology",                       q: "Which two gases contribute most to global warming?", o: ["carbon dioxide and methane", "carbon dioxide and nitrogen", "nitrogen and water vapour", "oxygen and methane"], a: "A" },

  // --- CHEMISTRY (14–27) ---
  { n: 14, t: "C3. Atoms, elements and compounds",  q: "The diagrams show particles in different substances P, Q, R, S and T. Which row correctly shows: only separate atoms / only molecules / a mixture of atoms and molecules?", o: ["P and Q and S", "P and Q and T", "Q and R and S", "Q and R and T"], a: "A" },
  { n: 15, t: "C2. Experimental techniques",        q: "Which method is used to separate two miscible liquids that have different boiling points?", o: ["chromatography", "crystallisation", "filtration", "fractional distillation"], a: "D" },
  { n: 16, t: "C3. Atoms, elements and compounds",  q: "Which process is a physical change?", o: ["magnesium reacting with nitric acid", "burning of methane", "evaporating of petroleum", "rusting of iron"], a: "C" },
  { n: 17, t: "C3. Atoms, elements and compounds",  q: "Which statement about the formation of ions is correct?", o: ["Anions are formed when atoms gain electrons.", "Cations are formed when atoms gain electrons.", "Anions are formed when atoms lose electrons.", "Cations are formed when atoms lose protons."], a: "A" },
  { n: 18, t: "C3. Atoms, elements and compounds",  q: "Which compound contains three different elements?", o: ["CO2", "H2O", "O3", "NOCl"], a: "D" },
  { n: 19, t: "C5. Electricity and chemistry",      q: "The diagram shows an electrolysis apparatus. Which label is correct?", o: ["X is the anode", "X is the cathode", "Y is an electrode", "Y is the electrolyte"], a: "D" },
  { n: 20, t: "C6. Energy changes in reactions",    q: "In an endothermic reaction, what must happen?", o: ["a gas is released", "the mass of the mixture decreases", "the temperature of the mixture decreases", "the temperature of the mixture increases"], a: "C" },
  { n: 21, t: "C7. Chemical reactions",             q: "Magnesium reacts with water to form magnesium oxide and hydrogen. Which statement about oxidation and reduction in this reaction is correct?", o: ["Hydrogen is reduced.", "Magnesium is oxidised.", "Magnesium is reduced.", "Water is oxidised."], a: "B" },
  { n: 22, t: "C8. Acids, bases and salts",         q: "A student wants to test for nitrate ions in a solution. Which reagent should be used?", o: ["barium nitrate solution and nitric acid", "silver nitrate solution and nitric acid", "dilute acid and limewater", "sodium hydroxide solution and aluminium foil"], a: "D" },
  { n: 23, t: "C9. The Periodic Table",             q: "In the Periodic Table, element V is in Group I and element W is in Group VII. Which pair will form an anion and a cation when they react?", o: ["V forms the anion, W forms the cation", "V forms the anion, noble gas forms the cation", "W forms the anion, V forms the cation", "noble gas forms the anion, W forms the cation"], a: "C" },
  { n: 24, t: "C10. Metals",                        q: "Which statement about transition metals is NOT correct?", o: ["They can act as catalysts.", "They form colourless compounds.", "They have high densities.", "They have high melting points."], a: "B" },
  { n: 25, t: "C10. Metals",                        q: "Constantan is an alloy made from copper and another metal. What type of substance is constantan?", o: ["a compound", "a molecule", "a salt", "an alloy"], a: "D" },
  { n: 26, t: "C11. Air and water",                 q: "After removing carbon dioxide and oxygen from a sample of clean air, which gases remain?", o: ["nitrogen, noble gases and water vapour", "nitrogen and noble gases only", "nitrogen only", "noble gases and water vapour only"], a: "A" },
  { n: 27, t: "C12. Organic chemistry",             q: "What are the only products of the complete combustion of a hydrocarbon?", o: ["carbon dioxide, carbon monoxide and water", "carbon dioxide and water only", "carbon dioxide only", "carbon monoxide and water only"], a: "B" },

  // --- PHYSICS (28–40) ---
  { n: 28, t: "P1. Motion, forces and energy",      q: "A car travels 60 km in 30 minutes. What is the average speed of the car?", o: ["2 km/h", "30 km/h", "120 km/h", "1800 km/h"], a: "C" },
  { n: 29, t: "P1. Motion, forces and energy",      q: "A block measures 4 cm × 2 cm × 1 cm and has a density of 4 g/cm³. What is the mass of the block?", o: ["0.5 g", "1.0 g", "16 g", "32 g"], a: "D" },
  { n: 30, t: "P1. Motion, forces and energy",      q: "A ball rolls along the ground and stops in mud. Which energy change occurs?", o: ["gravitational potential energy to kinetic energy", "gravitational potential energy to thermal energy", "kinetic energy to gravitational potential energy", "kinetic energy to thermal energy"], a: "D" },
  { n: 31, t: "P1. Motion, forces and energy",      q: "The work done on an object and the distance moved are known. What else can be calculated from this information?", o: ["force", "speed", "time", "weight"], a: "A" },
  { n: 32, t: "P2. Thermal physics",                q: "Water evaporates from an open dish. Which statement about evaporation is correct?", o: ["The surroundings become warmer.", "Evaporation only occurs at the surface of the liquid.", "Evaporation only occurs at one specific temperature.", "The molecules with the least energy escape first."], a: "B" },
  { n: 33, t: "P2. Thermal physics",                q: "Hot air rises above roof tiles and is replaced by cooler air from the surroundings. Which process causes this movement of air?", o: ["concentration", "condensation", "conduction", "convection"], a: "D" },
  { n: 34, t: "P3. Waves",                          q: "A ray of light travels from air into a glass block. What is the angle of refraction?", o: ["the angle between the incident ray and the surface before entering the glass", "the angle of incidence", "the angle between the refracted ray and the normal inside the glass", "the angle between the refracted ray and the surface of the glass"], a: "C" },
  { n: 35, t: "P3. Waves",                          q: "Two parallel rays of light are incident on a converging lens. Through which point do the rays pass after passing through the lens?", o: ["a point above the principal axis near the lens", "a point above the principal axis far from the lens", "a point on the principal axis at the focal point", "a point below the principal axis"], a: "D" },
  { n: 36, t: "P3. Waves",                          q: "Which type of electromagnetic radiation has the smallest wavelength?", o: ["infrared", "microwaves", "ultraviolet", "visible light"], a: "C" },
  { n: 37, t: "P3. Waves",                          q: "A second musical note is described as louder and lower-pitched than the first note. How do the amplitude and frequency of the second note compare with the first?", o: ["greater amplitude and greater frequency", "greater amplitude and smaller frequency", "smaller amplitude and greater frequency", "smaller amplitude and smaller frequency"], a: "B" },
  { n: 38, t: "P4. Electricity and magnetism",      q: "A negatively charged ion X is placed near a positive ion and a negative ion. Which statement correctly describes the forces acting on X?", o: ["X is repelled from both ions.", "X is attracted to the positive ion and repelled from the negative ion.", "X is repelled from the positive ion and attracted to the negative ion.", "X is attracted to both ions."], a: "B" },
  { n: 39, t: "P4. Electricity and magnetism",      q: "A lamp can be dimmed or switched off, and the circuit is protected by a fuse. Which circuit diagram shows this correctly?", o: ["lamp, variable resistor and switch in series, with fuse in series", "lamp and switch in series, variable resistor in parallel, with fuse in series", "lamp in parallel with switch, variable resistor in series, with fuse in series", "lamp and variable resistor in series, switch in parallel across lamp, with fuse"], a: "A" },
  { n: 40, t: "P4. Electricity and magnetism",      q: "Three resistors are connected in a circuit with three ammeters. Ammeter X reads 6 A. What are the readings on ammeters Y and Z?", o: ["Y = 2 A, Z = 4 A", "Y = 3 A, Z = 3 A", "Y = 4 A, Z = 2 A", "Y = 6 A, Z = 6 A"], a: "D" },
];

async function main() {
  console.log("🟠 Seeding 2018 May/June P1 V2 — 0653/12 (40 questions)...");

  for (const q of questions) {
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.title, q.t),
    });

    if (!lesson) {
      console.log(`⚠️  Lesson not found: ${q.t}`);
      continue;
    }

    const [challenge] = await db
      .insert(schema.challenges)
      .values({ lessonId: lesson.id, type: "SELECT", question: q.q, order: q.n + 4500 })
      .returning();

    const options = q.o.map((text, i) => ({
      challengeId: challenge.id,
      text,
      correct: String.fromCharCode(65 + i) === q.a,
    }));

    await db.insert(schema.challengeOptions).values(options);
    console.log(`  ✓ Q${q.n}: ${q.q.slice(0, 50)}...`);
  }

  console.log("🟢 2018 May/June V2 Seeding Complete! (40 questions added)");
}

main();
