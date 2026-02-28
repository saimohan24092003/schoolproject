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
  } else { _origLookup(hostname, options, callback); }
};

dotenv.config({ path: ".env.local" });
const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

// 2016 Oct/Nov 0653/12 — Answers verified against official MS
// 1C 2C 3A 4B 5D 6B 7D 8D 9B 10A 11D 12D 13D 14C 15C 16C 17D 18B 19A 20B
// 21B 22C 23A 24C 25A 26D 27B 28B 29D 30D 31A 32D 33A 34C 35B 36A 37B 38D 39C 40C

const questions = [
  // --- BIOLOGY (1-13) ---
  { n: 1,  t: "B1. Characteristics of living organisms", q: "A plant bends towards the light. Which characteristics of living organisms does this show?", o: ["movement and nutrition", "movement and respiration", "movement and sensitivity", "sensitivity and respiration"], a: "C" },
  { n: 2,  t: "B3. Movement into and out of cells",       q: "How do molecules move when they are involved in the process of diffusion?", o: ["They all move from a high to a low concentration.", "They all move from a low to a high concentration.", "They all move randomly.", "They show net movement against a concentration gradient."], a: "C" },
  { n: 3,  t: "B2. Cells",                               q: "The diagram shows a typical plant cell as seen under a light microscope. Parts A, B, C and D are labelled. Which part would also be present in a liver cell?", o: ["Part A", "Part B", "Part C", "Part D"], a: "A" },
  { n: 4,  t: "B4. Enzymes",                             q: "A student wants to find out if a solution contains an enzyme. Which chemical should the student use?", o: ["Benedict's solution", "biuret solution", "ethanol", "iodine solution"], a: "B" },
  { n: 5,  t: "B5. Plant nutrition",                     q: "The diagram shows a plant in a container of water with oil on top to prevent evaporation. Initial mass is 296 g; after 2 hours the mass is 292 g. What is the rate of transpiration?", o: ["150 g water/hour", "148 g water/hour", "4 g water/hour", "2 g water/hour"], a: "D" },
  { n: 6,  t: "B6. Animal nutrition",                    q: "A student tests a clear liquid. Benedict's solution gives orange-red colour; iodine gives orange-brown colour. Which nutrients are present?", o: ["reducing sugar: yes, starch: yes", "reducing sugar: yes, starch: no", "reducing sugar: no, starch: yes", "reducing sugar: no, starch: no"], a: "B" },
  { n: 7,  t: "B7. Transport",                           q: "The diagram shows a type of white blood cell with a structural feature missing. Which feature is missing?", o: ["cell membrane", "cell wall", "large vacuole", "nucleus"], a: "D" },
  { n: 8,  t: "B8. Gas exchange and respiration",        q: "What makes up a higher percentage of inspired air compared with expired air?", o: ["carbon dioxide", "nitrogen", "noble gases", "oxygen"], a: "D" },
  { n: 9,  t: "B9. Coordination and response",           q: "Which process in a germinating seed is a tropic response?", o: ["the breaking of the outer skin", "the root tip growing downwards", "the start of photosynthesis", "the uptake of water"], a: "B" },
  { n: 10, t: "B10. Reproduction",                       q: "The diagram shows a section through a flower with parts 1, 2, 3 and 4 labelled. Which row identifies male and female parts correctly?", o: ["male part: 1, female part: 2", "male part: 2, female part: 4", "male part: 3, female part: 1", "male part: 4, female part: 3"], a: "A" },
  { n: 11, t: "B10. Reproduction",                       q: "The diagram shows the male reproductive system with Y and Z labelled. What are parts Y and Z?", o: ["Y: prostate gland, Z: urethra", "Y: urethra, Z: prostate gland", "Y: sperm duct, Z: prostate gland", "Y: sperm duct, Z: urethra"], a: "D" },
  { n: 12, t: "B12. Ecology",                            q: "A farmer chops down a tree to provide firewood. He gets warm when chopping and again when he burns the wood. What is the original source of energy that warms the farmer in both cases?", o: ["photosynthesis by the tree growing the wood", "respiration", "the match used to light the fire", "the Sun"], a: "D" },
  { n: 13, t: "B12. Ecology",                            q: "Deforestation could have which effect?", o: ["a decrease in carbon dioxide in the atmosphere", "an increase in oxygen in the atmosphere", "less likelihood of flooding", "the extinction of species"], a: "D" },

  // --- CHEMISTRY (14-27) ---
  { n: 14, t: "C3. Atoms, elements and compounds",       q: "The diagrams show four different mixtures of gases where different symbols represent different types of atom. Which diagram represents a mixture containing only elements?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "C" },
  { n: 15, t: "C2. Experimental techniques",             q: "Which method is used to separate an insoluble salt from a mixture of the salt and water?", o: ["crystallisation", "distillation", "filtration", "fractional distillation"], a: "C" },
  { n: 16, t: "C2. Experimental techniques",             q: "Which process is a physical change?", o: ["the combustion of methane", "the electrolysis of aqueous copper chloride", "the melting of ice", "the reaction of sodium with water"], a: "C" },
  { n: 17, t: "C3. Atoms, elements and compounds",       q: "Which statement about compounds is correct?", o: ["An ionic compound contains two metallic elements bonded together.", "In an ionic compound, metal ions are negatively charged.", "When metals combine with non-metals, electrons are shared between the atoms.", "When two non-metals combine, molecules are formed."], a: "D" },
  { n: 18, t: "C7. Chemical reactions",                  q: "What does a word equation show? (Table: A=changes yes/speed yes, B=changes yes/speed no, C=changes no/speed yes, D=changes no/speed no)", o: ["shows changes: yes, shows speed: yes", "shows changes: yes, shows speed: no", "shows changes: no, shows speed: yes", "shows changes: no, shows speed: no"], a: "B" },
  { n: 19, t: "C5. Electricity and chemistry",           q: "What are the products of electrolysis of aqueous copper chloride using inert electrodes?", o: ["copper and chlorine", "copper and oxygen", "hydrogen and chlorine", "hydrogen and oxygen"], a: "A" },
  { n: 20, t: "C6. Energy changes in reactions",         q: "The reaction between calcium oxide and water is used to heat food in special food cans. Which type of reaction occurs?", o: ["endothermic", "exothermic", "neutralisation", "precipitation"], a: "B" },
  { n: 21, t: "C7. Chemical reactions",                  q: "Marble chips react with dilute hydrochloric acid producing carbon dioxide. The reaction is tracked on a balance. Which graph correctly shows mass vs time?", o: ["Graph A (mass increasing, levels off)", "Graph B (mass decreasing, levels off)", "Graph C (mass increasing slightly, levels off)", "Graph D (mass decreasing sharply to zero)"], a: "B" },
  { n: 22, t: "C7. Chemical reactions",                  q: "Three powders — Mg, MgO and MgCO3 — are added to dilute sulfuric acid. Which react to produce water?", o: ["Mg: yes, MgO: yes, MgCO3: no", "Mg: yes, MgO: no, MgCO3: no", "Mg: no, MgO: yes, MgCO3: yes", "Mg: no, MgO: no, MgCO3: yes"], a: "C" },
  { n: 23, t: "C8. Acids, bases and salts",              q: "A mixture of ammonium carbonate and ammonium chloride is heated with aqueous sodium hydroxide. Which gas is produced?", o: ["ammonia", "carbon dioxide", "chlorine", "hydrogen chloride"], a: "A" },
  { n: 24, t: "C9. The Periodic Table",                  q: "Which describes a noble gas?", o: ["compound, colourless, does not burn in air", "element, colourless, burns in air", "element, colourless, does not burn in air", "element, green, does not burn in air"], a: "C" },
  { n: 25, t: "C10. Metals",                             q: "Tenorite is a mineral that contains copper oxide. How is copper obtained from tenorite?", o: ["Heat a mixture of tenorite and carbon.", "Pass electricity through solid tenorite.", "React tenorite with a metal that is less reactive than copper.", "React tenorite with hydrochloric acid."], a: "A" },
  { n: 26, t: "C11. Air and water",                      q: "A 100 cm³ sample of air is passed through apparatus removing all CO₂ then all oxygen. What is the volume and composition of gas collected?", o: ["volume: 21 cm³, pure nitrogen", "volume: 21 cm³, nitrogen and other gases", "volume: 79 cm³, pure nitrogen", "volume: 79 cm³, nitrogen and other gases"], a: "D" },
  { n: 27, t: "C12. Organic chemistry",                  q: "What is the main constituent of natural gas?", o: ["ethane", "methane", "nitrogen", "oxygen"], a: "B" },

  // --- PHYSICS (28-40) ---
  { n: 28, t: "P1. Motion, forces and energy",           q: "Graph 1: distance/time graph (horizontal line). Graph 2: speed/time graph (diagonal line upward). Which represents a car that is accelerating?", o: ["graph 1 only", "graph 2 only", "both graphs", "neither graph"], a: "B" },
  { n: 29, t: "P1. Motion, forces and energy",           q: "A 1.0 kg sample of aluminium and a 1.0 kg sample of iron are in different laboratories. Which quantity must be identical for both samples?", o: ["density", "temperature", "volume", "weight"], a: "D" },
  { n: 30, t: "P1. Motion, forces and energy",           q: "A parachutist falls at constant speed. Her kinetic energy does not change. Which form of energy is increasing as she falls?", o: ["chemical energy", "gravitational (potential) energy", "nuclear energy", "thermal energy"], a: "D" },
  { n: 31, t: "P2. Thermal physics",                     q: "A bowl contains warm water that evaporates. Which row describes where evaporation occurs and the effect on temperature of water remaining in the bowl?", o: ["only on the surface, decreases", "only on the surface, no change", "throughout the water, decreases", "throughout the water, no change"], a: "A" },
  { n: 32, t: "P2. Thermal physics",                     q: "An engineer wants to fix a steel washer on a steel rod that is slightly too big. How can the engineer fit the washer onto the rod?", o: ["Cool the washer and push it over the rod.", "Cool the washer and the rod to the same temperature then push together.", "Heat the rod and push it into the hole.", "Heat the washer and place it over the rod."], a: "D" },
  { n: 33, t: "P2. Thermal physics",                     q: "Water in a beaker is heated by an electric heater at one side. Which diagram shows the convection current formed in the water?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "A" },
  { n: 34, t: "P3. Waves",                               q: "The diagram represents a water wave with distances A, B, C and D labelled. Which labelled distance shows the amplitude of the wave?", o: ["Distance A", "Distance B", "Distance C", "Distance D"], a: "C" },
  { n: 35, t: "P3. Waves",                               q: "Three rays of light are incident on a converging lens. Which diagram shows the rays after passing through the lens?", o: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"], a: "B" },
  { n: 36, t: "P3. Waves",                               q: "Which statement about the electromagnetic spectrum is correct?", o: ["Gamma rays have the highest frequency.", "Microwaves have the smallest wavelength.", "Ultraviolet waves have the largest wavelength.", "Visible light has the lowest frequency."], a: "A" },
  { n: 37, t: "P3. Waves",                               q: "A fire alarm is adjusted to produce a louder note of the same pitch. What effect does this have on amplitude and frequency of the sound waves?", o: ["amplitude: larger, frequency: larger", "amplitude: larger, frequency: unchanged", "amplitude: unchanged, frequency: larger", "amplitude: unchanged, frequency: unchanged"], a: "B" },
  { n: 38, t: "P4. Electricity and magnetism",           q: "An ammeter reads 2.0 A and a voltmeter reads 4.0 V. Which row correctly identifies the voltmeter and gives the resistance of the resistor?", o: ["voltmeter: meter 1, resistance: 0.50 Ω", "voltmeter: meter 1, resistance: 2.0 Ω", "voltmeter: meter 2, resistance: 0.50 Ω", "voltmeter: meter 2, resistance: 2.0 Ω"], a: "D" },
  { n: 39, t: "P4. Electricity and magnetism",           q: "A computer's current peaks at 3.1 A on switch-on then settles to 1.0 A in use. Wire safely carries 10.0 A. Which fuse provides greatest protection?", o: ["1.0 A", "3.0 A", "5.0 A", "13.0 A"], a: "C" },
  { n: 40, t: "P4. Electricity and magnetism",           q: "A circuit has battery connected to P in series, Q and R in parallel. Current I₁ flows through P, I₂ through Q, I₃ after Q and R rejoin. Which statement is correct?", o: ["I₁ is equal to I₂ and I₂ is equal to I₃.", "I₁ is larger than I₂ and I₂ is larger than I₃.", "I₁ is larger than I₂ and I₂ is smaller than I₃.", "I₁ is smaller than I₂ and I₂ is larger than I₃."], a: "C" },
];

async function main() {
  console.log("🟠 Seeding 2016 Oct/Nov P1 V2 — 0653/12 (40 questions)...");
  for (const q of questions) {
    const lesson = await db.query.lessons.findFirst({ where: eq(schema.lessons.title, q.t) });
    if (!lesson) { console.log(`⚠️  Lesson not found: ${q.t}`); continue; }
    const [challenge] = await db.insert(schema.challenges).values({
      lessonId: lesson.id, type: "SELECT", question: q.q, order: q.n + 4000,
    }).returning();
    const options = q.o.map((text, i) => ({ challengeId: challenge.id, text, correct: String.fromCharCode(65 + i) === q.a }));
    await db.insert(schema.challengeOptions).values(options);
    console.log(`  ✓ Q${q.n}`);
  }
  console.log("🟢 2016 Oct/Nov V2 Seeding Complete! (40 questions added)");
}
main();
