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
