export const OFFICIAL_0653_TOPICS_2025_2027 = {
  biology: [
    "B1. Characteristics of living organisms",
    "B2. Cells",
    "B3. Movement into and out of cells",
    "B4. Biological molecules",
    "B5. Enzymes",
    "B6. Plant nutrition",
    "B7. Human nutrition",
    "B8. Transport in plants",
    "B9. Transport in animals",
    "B10. Diseases and immunity",
    "B11. Gas exchange in humans",
    "B12. Respiration",
    "B13. Drugs",
    "B14. Reproduction",
    "B15. Organisms and their environment",
    "B16. Human influences on ecosystems",
  ],
  chemistry: [
    "C1. States of matter",
    "C2. Atoms, elements and compounds",
    "C3. Stoichiometry",
    "C4. Electrochemistry",
    "C5. Chemical energetics",
    "C6. Chemical reactions",
    "C7. Acids, bases and salts",
    "C8. The Periodic Table",
    "C9. Metals",
    "C10. Chemistry of the environment",
    "C11. Organic chemistry",
    "C12. Experimental techniques and chemical analysis",
  ],
  physics: [
    "P1. Motion, forces and energy",
    "P2. Thermal physics",
    "P3. Waves",
    "P4. Electricity",
    "P5. Space physics",
  ],
} as const;

// Subtopics per lesson — shared by queries.ts (DB enrichment) and dashboard (fallback display)
export const SYLLABUS_SUBTOPICS_0653: Record<string, string[]> = {
  "B1. Characteristics of living organisms": ["MRS GREN Definitions", "Metabolism Basics", "Excretion vs Egestion"],
  "B2. Cells": ["Cell Structure", "Specialised Cells", "Microscopy Skills", "Cell Organisation"],
  "B3. Movement into and out of cells": ["Diffusion", "Osmosis", "Active Transport", "Surface Area to Volume"],
  "B4. Biological molecules": ["Carbohydrates", "Proteins", "Fats", "Food Tests"],
  "B5. Enzymes": ["Lock and Key Theory", "Temperature Effects", "pH Effects", "Enzyme Rate"],
  "B6. Plant nutrition": ["Photosynthesis Equation", "Leaf Adaptations", "Limiting Factors", "Mineral Ions"],
  "B7. Human nutrition": ["Balanced Diet", "Digestive System", "Absorption", "Digestive Enzymes"],
  "B8. Transport in plants": ["Xylem Structure", "Phloem Translocation", "Transpiration Stream", "Root Hair Absorption"],
  "B9. Transport in animals": ["Heart Structure", "Blood Vessels", "Blood Components", "Coronary Heart Disease"],
  "B10. Diseases and immunity": ["Pathogens", "Transmission", "Body Defences", "Vaccination"],
  "B11. Gas exchange in humans": ["Alveoli Adaptations", "Ventilation Mechanics", "Inhaled vs Exhaled Air", "Smoking Effects"],
  "B12. Respiration": ["Aerobic Equation", "Anaerobic Respiration", "Energy Release", "Respiration vs Breathing"],
  "B13. Drugs": ["Medicinal Drugs", "Antibiotics", "Drug Misuse", "Drug Dependence"],
  "B14. Reproduction": ["Sexual and Asexual", "Human Reproduction", "Plant Reproduction", "Life Cycles"],
  "B15. Organisms and their environment": ["Food Chains and Webs", "Energy Transfer", "Population Dynamics", "Nutrient Cycles"],
  "B16. Human influences on ecosystems": ["Deforestation", "Pollution", "Conservation", "Sustainability"],
  "C1. States of matter": ["Particle Model", "Diffusion", "Melting and Boiling", "Gas Pressure"],
  "C2. Atoms, elements and compounds": ["Atomic Structure", "Ions", "Ionic Bonding", "Covalent Bonding"],
  "C3. Stoichiometry": ["Relative Formula Mass", "Mole Concept", "Equations", "Percentage Yield"],
  "C4. Electrochemistry": ["Electrolysis", "Electrolytes", "Products at Electrodes", "Industrial Electrolysis"],
  "C5. Chemical energetics": ["Exothermic and Endothermic", "Energy Profiles", "Activation Energy", "Bond Energies"],
  "C6. Chemical reactions": ["Rate of Reaction", "Reversible Reactions", "Redox", "Catalysts"],
  "C7. Acids, bases and salts": ["pH and Indicators", "Neutralisation", "Salt Preparation", "Titration Basics"],
  "C8. The Periodic Table": ["Periodic Trends", "Group I", "Group VII", "Noble Gases"],
  "C9. Metals": ["Reactivity Series", "Extraction", "Displacement", "Corrosion"],
  "C10. Chemistry of the environment": ["Air Composition", "Water Treatment", "Pollution", "Greenhouse Gases"],
  "C11. Organic chemistry": ["Hydrocarbons", "Cracking", "Alcohols", "Polymers"],
  "C12. Experimental techniques and chemical analysis": ["Chromatography", "Filtration", "Distillation", "Qualitative Analysis"],
  "P1. Motion, forces and energy": ["Speed/Velocity/Acceleration", "Distance-Time Graphs", "Newton's Second Law (F=ma)", "Kinetic & Potential Energy"],
  "P2. Thermal physics": ["Conduction in Metals", "Convection Currents", "Radiation (Infrared)", "Specific Heat Capacity"],
  "P3. Waves": ["Transverse vs Longitudinal", "Reflection & Refraction", "Electromagnetic Spectrum", "Sound Wave Properties"],
  "P4. Electricity": ["Current and Voltage", "Ohm's Law", "Series and Parallel", "Electrical Safety"],
  "P5. Space physics": ["Solar System", "Planetary Motion", "Stars and Galaxies", "Expansion of the Universe"],
};

export const OFFICIAL_0653_TOPIC_SET = new Set<string>([
  ...OFFICIAL_0653_TOPICS_2025_2027.biology,
  ...OFFICIAL_0653_TOPICS_2025_2027.chemistry,
  ...OFFICIAL_0653_TOPICS_2025_2027.physics,
]);

const TOPIC_ALIAS_0653: Record<string, string> = {
  "B3. Biological molecules": "B4. Biological molecules",
  "B4. Enzymes": "B5. Enzymes",
  "B5. Plant nutrition": "B6. Plant nutrition",
  "B6. Animal nutrition": "B7. Human nutrition",
  "B6. Transport in mammals": "B9. Transport in animals",
  "B7. Transport": "B9. Transport in animals",
  "B8. Gas exchange and respiration": "B11. Gas exchange in humans",
  "B9. Coordination and response": "B10. Diseases and immunity",
  "B10. Reproduction": "B14. Reproduction",
  "B11. Inheritance": "B14. Reproduction",
  "B12. Ecology": "B15. Organisms and their environment",
  "C1. Particulate nature of matter": "C1. States of matter",
  "C2. Experimental techniques": "C12. Experimental techniques and chemical analysis",
  "C3. Atoms, elements and compounds": "C2. Atoms, elements and compounds",
  "C4. Stoichiometry": "C3. Stoichiometry",
  "C5. Electricity and chemistry": "C4. Electrochemistry",
  "C6. Energy changes in reactions": "C5. Chemical energetics",
  "C7. Chemical reactions": "C6. Chemical reactions",
  "C8. Acids, bases and salts": "C7. Acids, bases and salts",
  "C9. The Periodic Table": "C8. The Periodic Table",
  "C10. Metals": "C9. Metals",
  "C11. Air and water": "C10. Chemistry of the environment",
  "C12. Organic chemistry": "C11. Organic chemistry",
  "P4. Electricity and magnetism": "P4. Electricity",
  "P5. Atomic physics": "P5. Space physics",
  "P6. Space physics": "P5. Space physics",
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalize0653Topic(topic: string): string {
  const normalized = normalizeWhitespace(topic);
  if (OFFICIAL_0653_TOPIC_SET.has(normalized)) {
    return normalized;
  }

  if (TOPIC_ALIAS_0653[normalized]) {
    return TOPIC_ALIAS_0653[normalized];
  }

  return normalized;
}

export function isOfficial0653Topic(topic: string): boolean {
  return OFFICIAL_0653_TOPIC_SET.has(normalize0653Topic(topic));
}

const KEYWORD_TOPIC_RULES: Array<{ topic: string; pattern: RegExp }> = [
  {
    topic: "B8. Transport in plants",
    pattern: /\b(xylem|phloem|transpiration|translocation|root hair|stomata|guard cell|turgor)\b/i,
  },
  {
    topic: "B3. Movement into and out of cells",
    pattern: /\b(diffusion|osmosis|active transport|partially permeable|concentration gradient|water potential)\b/i,
  },
  {
    topic: "B10. Diseases and immunity",
    pattern: /\b(pathogen|disease|infection|immunity|immune|antibody|antigen|vaccin|transmission)\b/i,
  },
  {
    topic: "B12. Respiration",
    pattern: /\b(respiration|aerobic|anaerobic|mitochondria|lactic acid|oxygen debt|energy release)\b/i,
  },
  {
    topic: "B13. Drugs",
    pattern: /\b(drug|antibiotic|painkiller|nicotine|alcohol|caffeine|heroin|addiction|dependence|misuse)\b/i,
  },
  {
    topic: "B14. Reproduction",
    pattern: /\b(reproduction|sexual|asexual|fertili[sz]ation|gamete|ovum|sperm|pollination|seed|zygote)\b/i,
  },
  {
    topic: "B15. Organisms and their environment",
    pattern: /\b(organism|ecosystem|habitat|food chain|food web|population|community|energy transfer|pyramid)\b/i,
  },
  {
    topic: "B16. Human influences on ecosystems",
    pattern: /\b(deforestation|pollution|conservation|climate change|global warming|extinction|biodiversity)\b/i,
  },
];

export function infer0653TopicFromQuestion(
  questionText: string,
  existingTopic?: string | null
): string {
  const rawExisting = existingTopic ? normalizeWhitespace(existingTopic) : "";
  if (rawExisting && OFFICIAL_0653_TOPIC_SET.has(rawExisting)) {
    return rawExisting;
  }

  for (const rule of KEYWORD_TOPIC_RULES) {
    if (rule.pattern.test(questionText || "")) {
      return rule.topic;
    }
  }

  const normalizedExisting = existingTopic ? normalize0653Topic(existingTopic) : "";
  if (normalizedExisting && OFFICIAL_0653_TOPIC_SET.has(normalizedExisting)) {
    return normalizedExisting;
  }

  return normalizedExisting;
}
