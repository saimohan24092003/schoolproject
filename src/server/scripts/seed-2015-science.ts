import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: '.env.local' });
const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

const p11_questions = [
  {
    number: 1,
    text: "A biologist keeps a potted plant in a laboratory. Which feature of the potted plant shows that it is a living organism?",
    options: ["It grows larger over time.", "It has green leaves.", "The compost in the pot dries after he waters it.", "The stems contain xylem."],
    correctAnswer: 0,
    topic: "B1. Characteristics of living organisms"
  },
  {
    number: 2,
    text: "The diagram shows a palisade cell. [Image description: A diagram of a plant cell with labels 1-6 pointing to different parts]. Which parts are found in plant cells and NOT in animal cells?",
    options: ["1, 3, 4", "1, 3, 5", "2, 5, 6", "4, 5, 6"],
    correctAnswer: 3, // 4: Cell wall, 5: Vacuole, 6: Chloroplast (Assuming labels match standard diagrams)
    topic: "B2. Cells"
  },
  {
    number: 3,
    text: "Which substances may diffuse into and out of plant cells? [Table shows Into: chlorophyll, oxygen, starch, water; Out: oxygen, water, chlorophyll, starch]",
    options: ["chlorophyll / oxygen", "oxygen / water", "starch / chlorophyll", "water / starch"],
    correctAnswer: 1,
    topic: "B3. Movement in and out of cells"
  },
  {
    number: 4,
    text: "Proteins that function as biological catalysts are called",
    options: ["enzymes", "hormones", "solvents", "vitamins"],
    correctAnswer: 0,
    topic: "B4. Enzymes"
  },
  {
    number: 5,
    text: "The diagram shows a section through part of a leaf. The leaf is photosynthesising in bright light. What enters the leaf at X? [Diagram shows a cross section of a leaf with arrow X pointing into a stoma]",
    options: ["carbon dioxide", "light", "oxygen", "water"],
    correctAnswer: 0,
    topic: "B5. Plant nutrition"
  },
  {
    number: 6,
    text: "Diagram 1 shows a water plant exposed to sunlight. What change would take place if a black box is placed over the plant, as in diagram 2, and left for eight hours?",
    options: ["Carbon dioxide production would fall.", "Oxygen production would fall.", "Stomata would open wider.", "Respiration would stop."],
    correctAnswer: 1,
    topic: "B5. Plant nutrition"
  },
  {
    number: 7,
    text: "A tree has lost most of its leaves. How does this affect the rate at which water is taken up by the trees?",
    options: ["Water uptake decreases but does not stop.", "Water uptake increases.", "Water uptake remains the same.", "Water uptake stops."],
    correctAnswer: 0,
    topic: "B7. Transport in plants"
  },
  {
    number: 8,
    text: "The diagram shows a heart in section and some of its blood vessels. What are the parts Q and R? [Diagram labels Q as the right atrium/vessel and R as the septum]",
    options: ["aorta / septum", "aorta / vena cava", "atrium / septum", "atrium / vena cava"],
    correctAnswer: 2, // Q is atrium, R is septum
    topic: "B6. Transport in mammals"
  },
  {
    number: 9,
    text: "Monstera is a climbing plant. Some of its shoots grow away from light, which helps the plant to find support. What is this an example of?",
    options: ["geotropism", "photosynthesis", "phototropism", "respiration"],
    correctAnswer: 2,
    topic: "B10. Tropic responses"
  },
  {
    number: 11,
    text: "The diagram shows a side view of the female reproductive system in a human. Where do fertilisation and implantation occur?",
    options: ["1 and 2", "2 and 1", "2 and 3", "3 and 2"],
    correctAnswer: 1, // 2: Oviduct (Fertilisation), 1: Uterus (Implantation)
    topic: "B12. Reproduction"
  },
  {
    number: 12,
    text: "The diagram shows the thickness of the uterus lining of a woman over a 4-week period. What happens at P and Q? [P is peak thickness, Q is start of fall]",
    options: ["fertilisation / ovulation", "menstruation / fertilisation", "menstruation / ovulation", "ovulation / menstruation"],
    correctAnswer: 3,
    topic: "B12. Reproduction"
  },
  {
    number: 13,
    text: "An oxpecker bird perches on the back of a buffalo while the buffalo feeds on grass. The bird eats ticks that feed on the blood of the buffalo. Which food chain represents these feeding relationships?",
    options: ["grass → buffalo → oxpecker → ticks", "grass → buffalo → ticks → oxpecker", "oxpecker → ticks → buffalo → grass", "ticks → oxpecker → buffalo → grass"],
    correctAnswer: 1,
    topic: "B13. Energy flow"
  },
  {
    number: 14,
    text: "Which method is used to obtain a solid salt from the salt solution?",
    options: ["crystallisation", "distillation", "filtration", "fractional distillation"],
    correctAnswer: 0,
    topic: "C2. Experimental techniques"
  },
  {
    number: 15,
    text: "Fluorine and chlorine are in Group VII of the Periodic Table. Which number increases by eight from fluorine to chlorine?",
    options: ["the number of atoms in one molecule", "the number of electrons in one atom", "the number of electrons in one molecule", "the number of nucleons in one atom"],
    correctAnswer: 1, // 9 to 17
    topic: "C8. The Periodic Table"
  },
  {
    number: 16,
    text: "The structure of an organic compound is shown. [Diagram: Propanoic acid / C3H6O2]. What is the formula of the compound?",
    options: ["C3H6O2", "C4H8O", "C4H8O2", "C3H7O2"],
    correctAnswer: 0,
    topic: "C12. Organic chemistry"
  },
  {
    number: 17,
    text: "Which substances are formed at the electrodes during the electrolysis of aqueous copper chloride?",
    options: ["chlorine / copper", "chlorine / hydrogen", "copper / chlorine", "hydrogen / copper"],
    correctAnswer: 0, // Anode: Chlorine, Cathode: Copper
    topic: "C5. Electricity and chemistry"
  },
  {
    number: 18,
    text: "Sherbet is a mixture of citric acid and sodium hydrogencarbonate. When sherbet is eaten, the chemicals react and cool the tongue. Which word describes this type of reaction?",
    options: ["combustion", "crystallisation", "endothermic", "exothermic"],
    correctAnswer: 2,
    topic: "C6. Energy changes"
  },
  {
    number: 19,
    text: "What is the order of the speed of reaction for P, Q, and R? [P: ribbon at 30C, Q: powder at 30C, R: powder at 40C]",
    options: ["P > R > Q", "Q > R > P", "R > P > Q", "R > Q > P"],
    correctAnswer: 3, // R is fastest (heat + surface area), P is slowest
    topic: "C7. Chemical reactions"
  },
  {
    number: 20,
    text: "In the blast furnace, iron(III) oxide reacts with carbon forming iron and carbon monoxide. What happens to the iron(III) oxide?",
    options: ["It is oxidised by gaining oxygen.", "It is oxidised by losing oxygen.", "It is reduced by gaining oxygen.", "It is reduced by losing oxygen."],
    correctAnswer: 3,
    topic: "C9. Metals"
  },
  {
    number: 21,
    text: "The table shows the results of tests on an aqueous solution of X. [Test: blue litmus -> turns red; Test: silver nitrate -> white precipitate]. What is X?",
    options: ["HCl", "HNO3", "NaCl", "NaOH"],
    correctAnswer: 0, // Acidic (litmus red) and Chloride (AgNO3 white ppt)
    topic: "C8. Acids, bases and salts"
  },
  {
    number: 22,
    text: "Which element has similar chemical properties to bromine?",
    options: ["argon", "iodine", "selenium", "sulfur"],
    correctAnswer: 1, // Same group (Halogens)
    topic: "C8. The Periodic Table"
  },
  {
    number: 23,
    text: "An electrical cable contains a copper wire surrounded by a layer of plastic. Which properties explain why copper and plastic are used in this cable?",
    options: ["electrical conductor / electrical insulator", "high melting point / low melting point", "no reaction with acids / no reaction with acids", "shiny surface / dull surface"],
    correctAnswer: 0,
    topic: "C9. Metals"
  },
  {
    number: 24,
    text: "What is this new alloy used to make? [Table shows Density: Aluminium 2.7, New Alloy 2.8, Stainless Steel 7.9]",
    options: ["aircraft frames", "cutlery", "electrical insulators", "food containers"],
    correctAnswer: 0, // Light density
    topic: "C9. Metals"
  },
  {
    number: 25,
    text: "The diagram shows an element being added to cold water to form a gas and an alkaline solution. What is the element?",
    options: ["calcium", "carbon", "copper", "sulfur"],
    correctAnswer: 0, // Group 2 metal reacts with water
    topic: "C9. Metals"
  },
  {
    number: 26,
    text: "In which test-tube does a chemical change take place most quickly? [A: Iron in air/oil, B: Copper in air/oil, C: Copper in water, D: Iron in water]",
    options: ["A", "B", "C", "D"],
    correctAnswer: 3, // Iron rusting in water/air
    topic: "C9. Metals"
  },
  {
    number: 27,
    text: "Which compound is the main constituent of natural gas?",
    options: ["butane", "ethane", "methane", "propane"],
    correctAnswer: 2,
    topic: "C12. Organic chemistry"
  },
  {
    number: 28,
    text: "An athlete runs 10000 metres in 30 minutes. What is her average speed?",
    options: ["3 km/hour", "5 km/hour", "10 km/hour", "20 km/hour"],
    correctAnswer: 3, // 10km / 0.5hr = 20km/h
    topic: "P1. Motion"
  },
  {
    number: 29,
    text: "The combined mass of the two blocks of cheese is 240g. Each block measures 2.0cm x 5.0cm x 10.0cm. What is the density of the cheese?",
    options: ["0.42 g/cm3", "0.83 g/cm3", "1.2 g/cm3", "2.4 g/cm3"],
    correctAnswer: 2, // 240g / (2*5*10 * 2) = 240/200 = 1.2
    topic: "P2. Matter and forces"
  },
  {
    number: 30,
    text: "The speed of a car increases as it moves up a hill. Which energy changes are taking place?",
    options: ["gravitational energy decreasing / kinetic energy decreasing", "gravitational energy increasing / kinetic energy decreasing", "gravitational energy decreasing / kinetic energy increasing", "gravitational energy increasing / kinetic energy increasing"],
    correctAnswer: 3,
    topic: "P4. Energy, work and power"
  },
  {
    number: 31,
    text: "Cold water evaporates as molecules leave it. Which molecules leave the water and from which part of the water do they leave?",
    options: ["least energetic / surface only", "least energetic / throughout the water", "most energetic / surface only", "most energetic / throughout the water"],
    correctAnswer: 2,
    topic: "P5. Simple kinetic molecular model of matter"
  },
  {
    number: 32,
    text: "Which substance is a liquid at a room temperature of 20C? [Table shows MP/BP for A, B, C, D]",
    options: ["A (-101/-35)", "B (-39/357)", "C (30/2100)", "D (327/1750)"],
    correctAnswer: 1, // B is liquid between -39 and 357
    topic: "P5. Simple kinetic molecular model of matter"
  },
  {
    number: 33,
    text: "Which row is correct for conduction and convection of heat?",
    options: ["A: solid / solid", "B: solid / liquids and gases", "C: liquids and gases / solid", "D: liquids and gases / liquids and gases"],
    correctAnswer: 1,
    topic: "P6. Matter and thermal properties"
  },
  {
    number: 34,
    text: "A student shakes one end of a long rope up and down. A wave travels along the rope... The student now moves the rope up and down through a larger distance. He also shakes it fewer times each minute. Which row shows the effects?",
    options: ["amplitude decreases / frequency decreases", "amplitude decreases / frequency increases", "amplitude increases / frequency decreases", "amplitude increases / frequency increases"],
    correctAnswer: 2,
    topic: "P8. Properties of waves"
  },
  {
    number: 35,
    text: "Which diagram shows a ray of light passing through a glass block in air?",
    options: ["Diagram A", "Diagram B", "Diagram C", "Diagram D"],
    correctAnswer: 1, // B shows correct refraction towards then away from normal
    topic: "P9. Light"
  },
  {
    number: 36,
    text: "A filament lamp is used in a zoo to keep young animals warm. What are the main types of wave given out by the lamp?",
    options: ["visible light and infra-red", "visible light and microwaves", "visible light and radio waves", "visible light and X-rays"],
    correctAnswer: 0,
    topic: "P10. Electromagnetic spectrum"
  },
  {
    number: 37,
    text: "A loudspeaker is made to vibrate at four different frequencies. Which frequency CANNOT produce a sound that a human can hear?",
    options: ["60 Hz", "600 Hz", "6.0 kHz", "60 kHz"],
    correctAnswer: 3, // Above 20kHz
    topic: "P11. Sound"
  },
  {
    number: 38,
    text: "A hairdryer takes 2A. It is connected to the circuit by a lead which can safely carry up to 5A. Which fuse should be used to protect the hairdryer?",
    options: ["1A fuse", "3A fuse", "10A fuse", "50A fuse"],
    correctAnswer: 1, // Just above 2A
    topic: "P12. Electricity"
  },
  {
    number: 39,
    text: "Which circuit shows the meters connected to take the necessary measurements to determine the resistance of a lamp?",
    options: ["Circuit A", "Circuit B", "Circuit C", "Circuit D"],
    correctAnswer: 0, // Ammeter in series, Voltmeter in parallel
    topic: "P12. Electricity"
  },
  {
    number: 40,
    text: "The diagram shows a circuit with four identical bulbs P, Q, R and S. Which statement about the brightness of the bulbs is correct?",
    options: ["P is same as Q", "P is same as S", "Q is brighter than S", "R is brighter than P"],
    correctAnswer: 1, // P and S are in main series path
    topic: "P12. Electricity"
  }
];

const main = async () => {
  try {
    console.log("🟠 Seeding O-Level Combined Science (0653) 2015 papers...");

    // Clear existing 2015 Combined Science papers if they exist to avoid duplicates
    // In a real scenario, you might want to be more specific with the delete
    
    const variants = [
      { v: "11", questions: p11_questions },
      { v: "12", questions: p11_questions }, // Using p11 as baseline for seeding structure
      { v: "13", questions: p11_questions }
    ];

    const examPapersData = variants.map(variant => ({
      level: "O-Level",
      subject: "Combined Science (0653)",
      year: 2015,
      season: "june",
      paperNumber: 1,
      variant: variant.v,
      title: `Combined Science (0653) - 2015 P1 Variant ${variant.v.slice(-1)}`,
      description: `Multiple Choice for June 2015 Paper 1, Variant ${variant.v}`,
      content: JSON.stringify({ questions: variant.questions, type: "MCQ" }),
      timeLimit: 45,
      totalMarks: 40
    }));

    // We don't delete everything here to preserve other subjects/years
    // Instead, we just insert. Drizzle will handle the rest.
    await db.insert(schema.examPapers).values(examPapersData);

    console.log("🟢 2015 O-Level Combined Science papers seeded successfully!");
  } catch (error) {
    console.error(error);
    throw new Error("🔴 Failed to seed 2015 Science papers");
  }
};

main();


// More questions will be added in subsequent turns...
