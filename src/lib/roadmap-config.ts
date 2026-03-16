/**
 * IGCSE A* Roadmap — Level 1-50 configuration
 *
 * Each level is a practice session drawn from real past papers matched to the
 * current Cambridge IGCSE syllabus (2023-2025 spec).
 *
 * Design rules:
 *  - Levels 1-16:  Foundation — single topic, MCQ (Paper 2 questions), recent papers first
 *  - Levels 17-33: Intermediate — mixed topics, MCQ harder, 2019-2025 full range
 *  - Levels 34-46: Advanced — theory/structured (Paper 4 style), per-unit mixed
 *  - Levels 47-48: Mixed paper simulations (cross-topic MCQ blitz)
 *  - Level 49:     Full Paper 2 simulation (40 MCQ, 45 min equivalent)
 *  - Level 50:     Full Paper 4 simulation (structured, 8-10 Qs, 75 min)
 *
 * For subjects with no MCQ (0500, 0580, 0680), all levels use structured questions
 * with marks ranges increasing per tier.
 */

export type QuestionMode = "MCQ" | "THEORY" | "MIX";
export type PaperPref   = "P2" | "P4" | "both";

export interface RoadmapLevel {
  level:          number;            // 1-50
  title:          string;            // Short label shown on roadmap card
  milestone?:     string;            // Shown when this level is unlocked
  topicFilter:    string[];          // Topic names to draw questions from ([] = all)
  questionType:   QuestionMode;
  questionCount:  number;            // How many questions per session
  yearRange:      [number, number];  // e.g. [2022, 2025] — prefer recent papers
  markRange?:     [number, number];  // For theory difficulty (min, max marks per Q)
  paperNumbers?:  number[];          // Paper 2 = [2], Paper 4 = [4]
  xpReward:       number;            // Flat XP for completing this level
  paperPref:      PaperPref;         // Which paper preference this level suits
  unit:           "Biology" | "Chemistry" | "Physics" | "Mixed" | "All";
}

// ─── 0653 Combined Science ────────────────────────────────────────────────────
export const CS_0653_ROADMAP: RoadmapLevel[] = [
  // ── TIER 1: Foundation Biology (L1-6) ───────────────────────────────────
  {
    level: 1, title: "Cell Structure", unit: "Biology",
    milestone: "Welcome to Biology! Let's start with the basics.",
    topicFilter: ["B1. Cell Structure and Organisation"],
    questionType: "MCQ", questionCount: 10, yearRange: [2022, 2025],
    paperNumbers: [2], xpReward: 100, paperPref: "P2",
  },
  {
    level: 2, title: "Biological Molecules", unit: "Biology",
    topicFilter: ["B2. Biological Molecules"],
    questionType: "MCQ", questionCount: 10, yearRange: [2021, 2025],
    paperNumbers: [2], xpReward: 100, paperPref: "P2",
  },
  {
    level: 3, title: "Enzymes", unit: "Biology",
    topicFilter: ["B3. Enzymes"],
    questionType: "MCQ", questionCount: 10, yearRange: [2020, 2025],
    paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 4, title: "Plant Nutrition", unit: "Biology",
    topicFilter: ["B4. Plant Nutrition"],
    questionType: "MCQ", questionCount: 10, yearRange: [2020, 2025],
    paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 5, title: "Animal Nutrition", unit: "Biology",
    topicFilter: ["B5. Animal Nutrition"],
    questionType: "MCQ", questionCount: 10, yearRange: [2019, 2025],
    paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 6, title: "Transport in Plants & Animals", unit: "Biology",
    topicFilter: ["B6. Plant Transport", "B7. Human Gas Exchange"],
    questionType: "MCQ", questionCount: 10, yearRange: [2019, 2025],
    paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  // ── TIER 1: Foundation Chemistry (L7-12) ────────────────────────────────
  {
    level: 7, title: "States of Matter", unit: "Chemistry",
    milestone: "Biology Foundation done! Starting Chemistry.",
    topicFilter: ["C1. States of Matter"],
    questionType: "MCQ", questionCount: 10, yearRange: [2022, 2025],
    paperNumbers: [2], xpReward: 100, paperPref: "P2",
  },
  {
    level: 8, title: "Atomic Structure", unit: "Chemistry",
    topicFilter: ["C2. Atomic Structure"],
    questionType: "MCQ", questionCount: 10, yearRange: [2021, 2025],
    paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 9, title: "Chemical Bonding", unit: "Chemistry",
    topicFilter: ["C3. Chemical Bonding"],
    questionType: "MCQ", questionCount: 10, yearRange: [2020, 2025],
    paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 10, title: "Stoichiometry & Formulae", unit: "Chemistry",
    topicFilter: ["C4. Stoichiometry", "C5. Electricity and Chemistry"],
    questionType: "MCQ", questionCount: 10, yearRange: [2019, 2025],
    paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 11, title: "Chemical Energetics", unit: "Chemistry",
    topicFilter: ["C6. Chemical Energetics"],
    questionType: "MCQ", questionCount: 10, yearRange: [2019, 2025],
    paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 12, title: "Reaction Rates & Equilibrium", unit: "Chemistry",
    topicFilter: ["C7. Chemical Reactions", "C8. Acids, Bases and Salts"],
    questionType: "MCQ", questionCount: 10, yearRange: [2019, 2025],
    paperNumbers: [2], xpReward: 130, paperPref: "P2",
  },
  // ── TIER 1: Foundation Physics (L13-16) ─────────────────────────────────
  {
    level: 13, title: "Motion & Forces", unit: "Physics",
    milestone: "Chemistry Foundation done! Starting Physics.",
    topicFilter: ["P1. Motion", "P2. Forces"],
    questionType: "MCQ", questionCount: 10, yearRange: [2022, 2025],
    paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 14, title: "Energy", unit: "Physics",
    topicFilter: ["P3. Energy"],
    questionType: "MCQ", questionCount: 10, yearRange: [2021, 2025],
    paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 15, title: "Waves & Light", unit: "Physics",
    topicFilter: ["P4. Waves", "P5. Light"],
    questionType: "MCQ", questionCount: 10, yearRange: [2020, 2025],
    paperNumbers: [2], xpReward: 130, paperPref: "P2",
  },
  {
    level: 16, title: "Electricity & Magnetism", unit: "Physics",
    topicFilter: ["P6. Electricity", "P7. Magnetism"],
    questionType: "MCQ", questionCount: 10, yearRange: [2019, 2025],
    paperNumbers: [2], xpReward: 140, paperPref: "P2",
    milestone: "Tier 1 Foundation complete! You know the basics — keep going!",
  },

  // ── TIER 2: Intermediate Biology (L17-22) ───────────────────────────────
  {
    level: 17, title: "Respiration & Excretion", unit: "Biology",
    topicFilter: ["B8. Respiration", "B9. Excretion"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 150, paperPref: "P2",
  },
  {
    level: 18, title: "Coordination & Response", unit: "Biology",
    topicFilter: ["B10. Coordination and Response"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 150, paperPref: "P2",
  },
  {
    level: 19, title: "Reproduction", unit: "Biology",
    topicFilter: ["B11. Reproduction"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 160, paperPref: "P2",
  },
  {
    level: 20, title: "Inheritance & Variation", unit: "Biology",
    topicFilter: ["B12. Inheritance"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 170, paperPref: "P2",
  },
  {
    level: 21, title: "Ecology", unit: "Biology",
    topicFilter: ["B13. Ecology"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 170, paperPref: "P2",
  },
  {
    level: 22, title: "Biology — Mixed Past Papers", unit: "Biology",
    topicFilter: [], // all bio topics
    questionType: "MCQ", questionCount: 15, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 200, paperPref: "both",
  },
  // ── TIER 2: Intermediate Chemistry (L23-28) ─────────────────────────────
  {
    level: 23, title: "Organic Chemistry", unit: "Chemistry",
    topicFilter: ["C9. Organic Chemistry"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 160, paperPref: "P2",
  },
  {
    level: 24, title: "Experimental Techniques", unit: "Chemistry",
    topicFilter: ["C10. Experimental Techniques"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 160, paperPref: "P2",
  },
  {
    level: 25, title: "Metals & Reactivity", unit: "Chemistry",
    topicFilter: ["C11. Metals"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 170, paperPref: "P2",
  },
  {
    level: 26, title: "Chemistry — Mixed Past Papers", unit: "Chemistry",
    topicFilter: [],
    questionType: "MCQ", questionCount: 15, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 200, paperPref: "both",
  },
  // ── TIER 2: Intermediate Physics (L27-33) ───────────────────────────────
  {
    level: 27, title: "Thermal Physics", unit: "Physics",
    topicFilter: ["P8. Thermal Physics"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 160, paperPref: "P2",
  },
  {
    level: 28, title: "Nuclear Physics", unit: "Physics",
    topicFilter: ["P9. Nuclear Physics"],
    questionType: "MCQ", questionCount: 10, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 180, paperPref: "P2",
  },
  {
    level: 29, title: "Physics — Mixed Past Papers", unit: "Physics",
    topicFilter: [],
    questionType: "MCQ", questionCount: 15, yearRange: [2017, 2025],
    paperNumbers: [2], xpReward: 200, paperPref: "both",
  },
  {
    level: 30, title: "Full Subject MCQ — 2017-2020", unit: "Mixed",
    milestone: "Halfway to A*! Tier 2 complete — now the real challenge begins.",
    topicFilter: [],
    questionType: "MCQ", questionCount: 20, yearRange: [2017, 2020],
    paperNumbers: [2], xpReward: 250, paperPref: "P2",
  },

  // ── TIER 3: Advanced — Theory / Paper 4 Style (L31-46) ──────────────────
  {
    level: 31, title: "Bio Theory — Cells & Molecules", unit: "Biology",
    topicFilter: ["B1. Cell Structure and Organisation", "B2. Biological Molecules", "B3. Enzymes"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 6], paperNumbers: [4], xpReward: 200, paperPref: "P4",
  },
  {
    level: 32, title: "Bio Theory — Nutrition & Transport", unit: "Biology",
    topicFilter: ["B4. Plant Nutrition", "B5. Animal Nutrition", "B6. Plant Transport"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 8], paperNumbers: [4], xpReward: 210, paperPref: "P4",
  },
  {
    level: 33, title: "Bio Theory — Respiration & Excretion", unit: "Biology",
    topicFilter: ["B8. Respiration", "B9. Excretion"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 8], paperNumbers: [4], xpReward: 220, paperPref: "P4",
  },
  {
    level: 34, title: "Bio Theory — Genetics & Ecology", unit: "Biology",
    topicFilter: ["B12. Inheritance", "B13. Ecology"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 230, paperPref: "P4",
  },
  {
    level: 35, title: "Chem Theory — Bonding & Structure", unit: "Chemistry",
    topicFilter: ["C2. Atomic Structure", "C3. Chemical Bonding"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 6], paperNumbers: [4], xpReward: 200, paperPref: "P4",
  },
  {
    level: 36, title: "Chem Theory — Reactions & Energy", unit: "Chemistry",
    topicFilter: ["C6. Chemical Energetics", "C7. Chemical Reactions"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 8], paperNumbers: [4], xpReward: 220, paperPref: "P4",
  },
  {
    level: 37, title: "Chem Theory — Acids & Organic", unit: "Chemistry",
    topicFilter: ["C8. Acids, Bases and Salts", "C9. Organic Chemistry"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 230, paperPref: "P4",
  },
  {
    level: 38, title: "Physics Theory — Forces & Motion", unit: "Physics",
    topicFilter: ["P1. Motion", "P2. Forces", "P3. Energy"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 6], paperNumbers: [4], xpReward: 210, paperPref: "P4",
  },
  {
    level: 39, title: "Physics Theory — Waves & Light", unit: "Physics",
    topicFilter: ["P4. Waves", "P5. Light"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 8], paperNumbers: [4], xpReward: 220, paperPref: "P4",
  },
  {
    level: 40, title: "Physics Theory — Electricity & Magnetism", unit: "Physics",
    topicFilter: ["P6. Electricity", "P7. Magnetism"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 230, paperPref: "P4",
  },
  {
    level: 41, title: "Physics Theory — Thermal & Nuclear", unit: "Physics",
    topicFilter: ["P8. Thermal Physics", "P9. Nuclear Physics"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 240, paperPref: "P4",
  },
  {
    level: 42, title: "Biology Theory — Mixed Paper 4", unit: "Biology",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [2, 10], paperNumbers: [4], xpReward: 260, paperPref: "P4",
  },
  {
    level: 43, title: "Chemistry Theory — Mixed Paper 4", unit: "Chemistry",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [2, 10], paperNumbers: [4], xpReward: 260, paperPref: "P4",
  },
  {
    level: 44, title: "Physics Theory — Mixed Paper 4", unit: "Physics",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [2, 10], paperNumbers: [4], xpReward: 260, paperPref: "P4",
  },
  {
    level: 45, title: "All-Subject Theory Blitz", unit: "Mixed",
    milestone: "Advanced Theory unlocked! You're nearly at A* level.",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2020, 2025],
    markRange: [3, 12], paperNumbers: [4], xpReward: 300, paperPref: "P4",
  },
  {
    level: 46, title: "High-Stakes Mixed Questions", unit: "Mixed",
    topicFilter: [],
    questionType: "MIX", questionCount: 12, yearRange: [2022, 2025],
    paperNumbers: [2, 4], xpReward: 300, paperPref: "both",
  },

  // ── TIER 4: Exam Simulation (L47-50) ────────────────────────────────────
  {
    level: 47, title: "Paper 2 Blitz — 2021-2023", unit: "Mixed",
    topicFilter: [],
    questionType: "MCQ", questionCount: 20, yearRange: [2021, 2023],
    paperNumbers: [2], xpReward: 350, paperPref: "P2",
  },
  {
    level: 48, title: "Paper 2 Blitz — 2023-2025", unit: "Mixed",
    topicFilter: [],
    questionType: "MCQ", questionCount: 20, yearRange: [2023, 2025],
    paperNumbers: [2], xpReward: 350, paperPref: "P2",
  },
  {
    level: 49, title: "Full Paper 2 Simulation", unit: "Mixed",
    milestone: "One level from A*. This is the real deal!",
    topicFilter: [],
    questionType: "MCQ", questionCount: 40, yearRange: [2024, 2025],
    paperNumbers: [2], xpReward: 500, paperPref: "P2",
  },
  {
    level: 50, title: "Full Paper 4 Simulation — A* Target", unit: "Mixed",
    milestone: "🎉 Level 50! You have completed the full A* preparation roadmap!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2024, 2025],
    markRange: [2, 20], paperNumbers: [4], xpReward: 1000, paperPref: "P4",
  },
];

// ─── 0580 Mathematics ─────────────────────────────────────────────────────────
export const MATH_0580_ROADMAP: RoadmapLevel[] = [
  // ── TIER 1: Foundation — Number & Algebra (L1-8) ────────────────────────
  {
    level: 1, title: "Types of Numbers", unit: "All",
    milestone: "Welcome to IGCSE Mathematics — let's build from the ground up.",
    topicFilter: ["1.1 Types of numbers"],
    questionType: "THEORY", questionCount: 8, yearRange: [2022, 2025],
    markRange: [1, 4], paperNumbers: [2], xpReward: 100, paperPref: "P2",
  },
  {
    level: 2, title: "Fractions, Decimals & Percentages", unit: "All",
    topicFilter: ["1.2 Fractions, decimals and percentages"],
    questionType: "THEORY", questionCount: 8, yearRange: [2021, 2025],
    markRange: [1, 4], paperNumbers: [2], xpReward: 100, paperPref: "P2",
  },
  {
    level: 3, title: "Powers, Roots & Estimation", unit: "All",
    topicFilter: ["1.3 Powers and roots", "1.5 Estimation and bounds"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 5], paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 4, title: "Ratio, Proportion & Speed", unit: "All",
    topicFilter: ["1.4 Ratio and proportion", "1.6 Speed, distance and time"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 5], paperNumbers: [2], xpReward: 110, paperPref: "P2",
  },
  {
    level: 5, title: "Algebraic Manipulation", unit: "All",
    topicFilter: ["2.1 Algebraic manipulation"],
    questionType: "THEORY", questionCount: 8, yearRange: [2021, 2025],
    markRange: [2, 5], paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 6, title: "Solving Equations & Inequalities", unit: "All",
    topicFilter: ["2.2 Solving equations", "2.3 Inequalities"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 6], paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 7, title: "Sequences & Functions", unit: "All",
    topicFilter: ["2.4 Sequences", "2.5 Functions"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [2, 6], paperNumbers: [2], xpReward: 130, paperPref: "P2",
  },
  {
    level: 8, title: "Graphs of Functions", unit: "All",
    topicFilter: ["2.6 Graphs of functions", "3.1 Straight-line graphs"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 6], paperNumbers: [2], xpReward: 140, paperPref: "P2",
    milestone: "Number & Algebra Foundation done! Moving into Geometry.",
  },
  // ── TIER 1: Foundation — Geometry & Mensuration (L9-14) ─────────────────
  {
    level: 9, title: "Coordinate Geometry", unit: "All",
    topicFilter: ["3.2 Distance and midpoint", "3.3 Graphs in real-life contexts"],
    questionType: "THEORY", questionCount: 8, yearRange: [2021, 2025],
    markRange: [2, 5], paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 10, title: "Angles, Lines & Triangles", unit: "All",
    topicFilter: ["4.1 Angles and lines", "4.2 Triangles and quadrilaterals"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 5], paperNumbers: [2], xpReward: 120, paperPref: "P2",
  },
  {
    level: 11, title: "Circles & Constructions", unit: "All",
    topicFilter: ["4.3 Circles", "4.4 Constructions and loci"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [2, 6], paperNumbers: [2], xpReward: 130, paperPref: "P2",
  },
  {
    level: 12, title: "Perimeter, Area & Volume", unit: "All",
    topicFilter: ["5.1 Perimeter and area", "5.2 Volume and surface area"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 6], paperNumbers: [2], xpReward: 130, paperPref: "P2",
  },
  {
    level: 13, title: "Similar Shapes & Right-Angle Trigonometry", unit: "All",
    topicFilter: ["5.3 Similar shapes", "6.1 Right-angled triangles"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 7], paperNumbers: [2], xpReward: 140, paperPref: "P2",
  },
  {
    level: 14, title: "Sine & Cosine Rules", unit: "All",
    topicFilter: ["6.2 Sine and cosine rules", "6.3 Trigonometric graphs"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 7], paperNumbers: [2], xpReward: 150, paperPref: "P2",
    milestone: "Geometry Foundation done! Starting Statistics.",
  },
  // ── TIER 1: Foundation — Stats & Probability (L15-16) ───────────────────
  {
    level: 15, title: "Probability", unit: "All",
    topicFilter: ["8.1 Probability"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 6], paperNumbers: [2], xpReward: 140, paperPref: "P2",
  },
  {
    level: 16, title: "Statistics & Diagrams", unit: "All",
    topicFilter: ["8.2 Statistical diagrams", "8.3 Measures of central tendency", "8.4 Spread and correlation"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 6], paperNumbers: [2], xpReward: 150, paperPref: "P2",
    milestone: "Tier 1 Foundation complete! Now for the harder Paper 4 questions.",
  },
  // ── TIER 2: Intermediate — Mixed Paper 2 (L17-26) ───────────────────────
  {
    level: 17, title: "Number — Paper 4 Style", unit: "All",
    topicFilter: ["1.1 Types of numbers", "1.2 Fractions, decimals and percentages", "1.3 Powers and roots"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 8], paperNumbers: [4], xpReward: 160, paperPref: "P4",
  },
  {
    level: 18, title: "Ratio, Speed & Estimation — P4", unit: "All",
    topicFilter: ["1.4 Ratio and proportion", "1.5 Estimation and bounds", "1.6 Speed, distance and time"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 8], paperNumbers: [4], xpReward: 160, paperPref: "P4",
  },
  {
    level: 19, title: "Algebra — Paper 4 Style", unit: "All",
    topicFilter: ["2.1 Algebraic manipulation", "2.2 Solving equations", "2.3 Inequalities"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 8], paperNumbers: [4], xpReward: 170, paperPref: "P4",
  },
  {
    level: 20, title: "Sequences, Functions & Graphs — P4", unit: "All",
    topicFilter: ["2.4 Sequences", "2.5 Functions", "2.6 Graphs of functions"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 180, paperPref: "P4",
  },
  {
    level: 21, title: "Coordinate Geometry — P4", unit: "All",
    topicFilter: ["3.1 Straight-line graphs", "3.2 Distance and midpoint", "3.3 Graphs in real-life contexts"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 8], paperNumbers: [4], xpReward: 180, paperPref: "P4",
  },
  {
    level: 22, title: "Geometry — Angles & Circles — P4", unit: "All",
    topicFilter: ["4.1 Angles and lines", "4.2 Triangles and quadrilaterals", "4.3 Circles"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 190, paperPref: "P4",
  },
  {
    level: 23, title: "Mensuration — P4", unit: "All",
    topicFilter: ["5.1 Perimeter and area", "5.2 Volume and surface area", "5.3 Similar shapes"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 190, paperPref: "P4",
  },
  {
    level: 24, title: "Trigonometry — P4", unit: "All",
    topicFilter: ["6.1 Right-angled triangles", "6.2 Sine and cosine rules", "6.3 Trigonometric graphs", "6.4 3D trigonometry"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 200, paperPref: "P4",
  },
  {
    level: 25, title: "Transformations & Vectors — P4", unit: "All",
    topicFilter: ["7.1 Transformations", "7.2 Vectors", "7.3 Vector geometry"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 210, paperPref: "P4",
  },
  {
    level: 26, title: "Statistics & Probability — P4", unit: "All",
    topicFilter: ["8.1 Probability", "8.2 Statistical diagrams", "8.3 Measures of central tendency", "8.4 Spread and correlation"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [4], xpReward: 210, paperPref: "P4",
    milestone: "Halfway there! All topics covered once. Now for mixed practice.",
  },
  // ── TIER 3: Advanced — Mixed cross-topic (L27-46) ────────────────────────
  {
    level: 27, title: "Mixed Number & Algebra", unit: "All",
    topicFilter: ["1.1 Types of numbers", "1.4 Ratio and proportion", "2.1 Algebraic manipulation", "2.2 Solving equations"],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2025],
    markRange: [2, 10], paperNumbers: [2, 4], xpReward: 220, paperPref: "both",
  },
  {
    level: 28, title: "Mixed Geometry & Mensuration", unit: "All",
    topicFilter: ["4.1 Angles and lines", "4.3 Circles", "5.1 Perimeter and area", "5.2 Volume and surface area"],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2025],
    markRange: [2, 10], paperNumbers: [2, 4], xpReward: 220, paperPref: "both",
  },
  {
    level: 29, title: "Mixed Graphs & Functions", unit: "All",
    topicFilter: ["2.5 Functions", "2.6 Graphs of functions", "3.1 Straight-line graphs"],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2025],
    markRange: [3, 12], paperNumbers: [4], xpReward: 230, paperPref: "P4",
  },
  {
    level: 30, title: "Mixed Trigonometry & Vectors", unit: "All",
    topicFilter: ["6.1 Right-angled triangles", "6.2 Sine and cosine rules", "7.2 Vectors", "7.3 Vector geometry"],
    questionType: "THEORY", questionCount: 10, yearRange: [2018, 2025],
    markRange: [3, 12], paperNumbers: [4], xpReward: 240, paperPref: "P4",
  },
  {
    level: 31, title: "Paper 2 Full Mix — 2020-2022", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 12, yearRange: [2020, 2022],
    markRange: [1, 8], paperNumbers: [2], xpReward: 260, paperPref: "P2",
  },
  {
    level: 32, title: "Paper 2 Full Mix — 2023-2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 12, yearRange: [2023, 2025],
    markRange: [1, 8], paperNumbers: [2], xpReward: 280, paperPref: "P2",
  },
  {
    level: 33, title: "Paper 4 Full Mix — 2020-2022", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2020, 2022],
    markRange: [2, 12], paperNumbers: [4], xpReward: 300, paperPref: "P4",
  },
  {
    level: 34, title: "Paper 4 Full Mix — 2023-2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2023, 2025],
    markRange: [2, 12], paperNumbers: [4], xpReward: 320, paperPref: "P4",
    milestone: "Advanced stage complete! Final exam simulations ahead.",
  },
  // ── TIER 4: Exam Simulations (L35-50) ────────────────────────────────────
  {
    level: 35, title: "Number Mastery Sprint", unit: "All",
    topicFilter: ["1.1 Types of numbers", "1.2 Fractions, decimals and percentages", "1.3 Powers and roots", "1.4 Ratio and proportion", "1.5 Estimation and bounds", "1.6 Speed, distance and time"],
    questionType: "THEORY", questionCount: 12, yearRange: [2017, 2025],
    markRange: [1, 8], paperNumbers: [2, 4], xpReward: 280, paperPref: "both",
  },
  {
    level: 36, title: "Algebra Mastery Sprint", unit: "All",
    topicFilter: ["2.1 Algebraic manipulation", "2.2 Solving equations", "2.3 Inequalities", "2.4 Sequences", "2.5 Functions", "2.6 Graphs of functions"],
    questionType: "THEORY", questionCount: 12, yearRange: [2017, 2025],
    markRange: [2, 10], paperNumbers: [2, 4], xpReward: 290, paperPref: "both",
  },
  {
    level: 37, title: "Geometry Mastery Sprint", unit: "All",
    topicFilter: ["4.1 Angles and lines", "4.2 Triangles and quadrilaterals", "4.3 Circles", "4.4 Constructions and loci"],
    questionType: "THEORY", questionCount: 12, yearRange: [2017, 2025],
    markRange: [2, 10], paperNumbers: [2, 4], xpReward: 290, paperPref: "both",
  },
  {
    level: 38, title: "Trigonometry Mastery Sprint", unit: "All",
    topicFilter: ["6.1 Right-angled triangles", "6.2 Sine and cosine rules", "6.3 Trigonometric graphs", "6.4 3D trigonometry"],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [3, 12], paperNumbers: [2, 4], xpReward: 300, paperPref: "both",
  },
  {
    level: 39, title: "Stats & Probability Mastery Sprint", unit: "All",
    topicFilter: ["8.1 Probability", "8.2 Statistical diagrams", "8.3 Measures of central tendency", "8.4 Spread and correlation"],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [2, 10], paperNumbers: [2, 4], xpReward: 300, paperPref: "both",
  },
  {
    level: 40, title: "Vectors & Transformations Sprint", unit: "All",
    topicFilter: ["7.1 Transformations", "7.2 Vectors", "7.3 Vector geometry"],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [3, 12], paperNumbers: [4], xpReward: 310, paperPref: "P4",
  },
  {
    level: 41, title: "Mensuration Deep Dive", unit: "All",
    topicFilter: ["5.1 Perimeter and area", "5.2 Volume and surface area", "5.3 Similar shapes"],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [3, 12], paperNumbers: [4], xpReward: 310, paperPref: "P4",
  },
  {
    level: 42, title: "Hardest Paper 2 Questions", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 12, yearRange: [2021, 2025],
    markRange: [4, 10], paperNumbers: [2], xpReward: 330, paperPref: "P2",
  },
  {
    level: 43, title: "Hardest Paper 4 Questions", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2021, 2025],
    markRange: [6, 20], paperNumbers: [4], xpReward: 350, paperPref: "P4",
  },
  {
    level: 44, title: "Cross-Paper Mixed Blitz I", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 12, yearRange: [2020, 2023],
    markRange: [2, 12], paperNumbers: [2, 4], xpReward: 360, paperPref: "both",
  },
  {
    level: 45, title: "Cross-Paper Mixed Blitz II", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 12, yearRange: [2022, 2025],
    markRange: [2, 12], paperNumbers: [2, 4], xpReward: 380, paperPref: "both",
    milestone: "Almost there — one final simulation to go!",
  },
  {
    level: 46, title: "Paper 2 Simulation — 2024/2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 15, yearRange: [2024, 2025],
    markRange: [1, 8], paperNumbers: [2], xpReward: 400, paperPref: "P2",
  },
  {
    level: 47, title: "Paper 4 Simulation — 2024/2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2024, 2025],
    markRange: [4, 20], paperNumbers: [4], xpReward: 450, paperPref: "P4",
  },
  {
    level: 48, title: "Full Paper 2 Sprint — All Years", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 15, yearRange: [2017, 2025],
    markRange: [1, 8], paperNumbers: [2], xpReward: 450, paperPref: "P2",
  },
  {
    level: 49, title: "Full Paper 4 Sprint — All Years", unit: "All",
    milestone: "One level from A*!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2025],
    markRange: [4, 20], paperNumbers: [4], xpReward: 500, paperPref: "P4",
  },
  {
    level: 50, title: "A* Final Challenge — Paper 4", unit: "All",
    milestone: "🎉 Level 50! You have completed the full A* Maths preparation roadmap!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 12, yearRange: [2023, 2025],
    markRange: [6, 20], paperNumbers: [4], xpReward: 1000, paperPref: "P4",
  },
];

// ─── 0500 English First Language ──────────────────────────────────────────────
export const ENG_0500_ROADMAP: RoadmapLevel[] = [
  // ── TIER 1: Reading Foundation (L1-10) ──────────────────────────────────
  {
    level: 1, title: "Reading for Purpose & Audience", unit: "All",
    milestone: "Welcome to IGCSE English! Let's master reading skills first.",
    topicFilter: ["1.1 Reading for ideas — purpose and audience"],
    questionType: "THEORY", questionCount: 6, yearRange: [2022, 2025],
    markRange: [1, 5], paperNumbers: [1], xpReward: 100, paperPref: "P2",
  },
  {
    level: 2, title: "Tone, Attitude & Bias", unit: "All",
    topicFilter: ["1.2 Reading for ideas — tone, attitude and bias"],
    questionType: "THEORY", questionCount: 6, yearRange: [2021, 2025],
    markRange: [2, 6], paperNumbers: [1], xpReward: 110, paperPref: "P2",
  },
  {
    level: 3, title: "Inference & Deduction", unit: "All",
    topicFilter: ["1.3 Reading for meaning — inference and deduction"],
    questionType: "THEORY", questionCount: 6, yearRange: [2021, 2025],
    markRange: [2, 6], paperNumbers: [1], xpReward: 120, paperPref: "P2",
  },
  {
    level: 4, title: "Language & Effect", unit: "All",
    topicFilter: ["1.4 Reading for meaning — language and effect"],
    questionType: "THEORY", questionCount: 6, yearRange: [2020, 2025],
    markRange: [3, 8], paperNumbers: [1], xpReward: 130, paperPref: "P2",
  },
  {
    level: 5, title: "Note-Making", unit: "All",
    topicFilter: ["1.5 Note-making"],
    questionType: "THEORY", questionCount: 6, yearRange: [2020, 2025],
    markRange: [5, 15], paperNumbers: [1], xpReward: 140, paperPref: "P2",
  },
  {
    level: 6, title: "Summary Writing", unit: "All",
    topicFilter: ["1.6 Summary writing"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2025],
    markRange: [8, 15], paperNumbers: [1], xpReward: 150, paperPref: "P2",
    milestone: "Reading skills done! Moving to Writing.",
  },
  // ── TIER 2: Writing Foundation (L7-16) ──────────────────────────────────
  {
    level: 7, title: "Directed Writing — Style & Register", unit: "All",
    topicFilter: ["2.1 Directed writing — adapting style and register"],
    questionType: "THEORY", questionCount: 5, yearRange: [2022, 2025],
    markRange: [10, 20], paperNumbers: [2], xpReward: 160, paperPref: "P4",
  },
  {
    level: 8, title: "Directed Writing — Selecting Information", unit: "All",
    topicFilter: ["2.2 Directed writing — selecting and re-using information"],
    questionType: "THEORY", questionCount: 5, yearRange: [2021, 2025],
    markRange: [10, 20], paperNumbers: [2], xpReward: 170, paperPref: "P4",
  },
  {
    level: 9, title: "Narrative Writing", unit: "All",
    topicFilter: ["2.3 Composition — narrative writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2020, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 180, paperPref: "P4",
  },
  {
    level: 10, title: "Descriptive Writing", unit: "All",
    topicFilter: ["2.4 Composition — descriptive writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2020, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 190, paperPref: "P4",
  },
  {
    level: 11, title: "Argumentative Writing", unit: "All",
    topicFilter: ["2.5 Composition — argumentative writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 200, paperPref: "P4",
  },
  {
    level: 12, title: "Discursive Writing", unit: "All",
    topicFilter: ["2.6 Composition — discursive writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 210, paperPref: "P4",
    milestone: "Writing Foundation done! Now for mixed practice.",
  },
  // ── TIER 3: Intermediate — Mixed reading + writing (L13-30) ─────────────
  {
    level: 13, title: "Reading Mix — Purpose, Tone & Inference", unit: "All",
    topicFilter: ["1.1 Reading for ideas — purpose and audience", "1.2 Reading for ideas — tone, attitude and bias", "1.3 Reading for meaning — inference and deduction"],
    questionType: "THEORY", questionCount: 7, yearRange: [2019, 2025],
    markRange: [2, 8], paperNumbers: [1], xpReward: 200, paperPref: "P2",
  },
  {
    level: 14, title: "Reading Mix — Language, Note-Making & Summary", unit: "All",
    topicFilter: ["1.4 Reading for meaning — language and effect", "1.5 Note-making", "1.6 Summary writing"],
    questionType: "THEORY", questionCount: 7, yearRange: [2018, 2025],
    markRange: [3, 15], paperNumbers: [1], xpReward: 210, paperPref: "P2",
  },
  {
    level: 15, title: "Directed Writing — Full Mix", unit: "All",
    topicFilter: ["2.1 Directed writing — adapting style and register", "2.2 Directed writing — selecting and re-using information"],
    questionType: "THEORY", questionCount: 6, yearRange: [2018, 2025],
    markRange: [10, 20], paperNumbers: [2], xpReward: 220, paperPref: "P4",
  },
  {
    level: 16, title: "Composition — All Types", unit: "All",
    topicFilter: ["2.3 Composition — narrative writing", "2.4 Composition — descriptive writing", "2.5 Composition — argumentative writing", "2.6 Composition — discursive writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2017, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 250, paperPref: "P4",
    milestone: "Halfway to A*! Now targeting exam-style questions.",
  },
  // ── TIER 4: Advanced — Full Paper Practice (L17-50) ─────────────────────
  {
    level: 17, title: "Paper 1 Reading — 2017-2019", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2019],
    markRange: [1, 15], paperNumbers: [1], xpReward: 250, paperPref: "P2",
  },
  {
    level: 18, title: "Paper 1 Reading — 2020-2022", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2022],
    markRange: [1, 15], paperNumbers: [1], xpReward: 260, paperPref: "P2",
  },
  {
    level: 19, title: "Paper 1 Reading — 2023-2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 8, yearRange: [2023, 2025],
    markRange: [1, 15], paperNumbers: [1], xpReward: 280, paperPref: "P2",
  },
  {
    level: 20, title: "Paper 2 Writing — 2017-2019", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 5, yearRange: [2017, 2019],
    markRange: [10, 25], paperNumbers: [2], xpReward: 280, paperPref: "P4",
  },
  {
    level: 21, title: "Paper 2 Writing — 2020-2022", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 5, yearRange: [2020, 2022],
    markRange: [10, 25], paperNumbers: [2], xpReward: 300, paperPref: "P4",
  },
  {
    level: 22, title: "Paper 2 Writing — 2023-2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 5, yearRange: [2023, 2025],
    markRange: [10, 25], paperNumbers: [2], xpReward: 320, paperPref: "P4",
  },
  {
    level: 23, title: "Inference Sprint — All Years", unit: "All",
    topicFilter: ["1.3 Reading for meaning — inference and deduction", "1.4 Reading for meaning — language and effect"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [2, 8], paperNumbers: [1], xpReward: 280, paperPref: "P2",
  },
  {
    level: 24, title: "Summary Sprint — All Years", unit: "All",
    topicFilter: ["1.5 Note-making", "1.6 Summary writing"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [5, 15], paperNumbers: [1], xpReward: 290, paperPref: "P2",
  },
  {
    level: 25, title: "Directed Writing Sprint", unit: "All",
    topicFilter: ["2.1 Directed writing — adapting style and register", "2.2 Directed writing — selecting and re-using information"],
    questionType: "THEORY", questionCount: 6, yearRange: [2017, 2025],
    markRange: [10, 20], paperNumbers: [2], xpReward: 300, paperPref: "P4",
  },
  {
    level: 26, title: "Narrative & Descriptive Sprint", unit: "All",
    topicFilter: ["2.3 Composition — narrative writing", "2.4 Composition — descriptive writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2017, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 310, paperPref: "P4",
  },
  {
    level: 27, title: "Argumentative & Discursive Sprint", unit: "All",
    topicFilter: ["2.5 Composition — argumentative writing", "2.6 Composition — discursive writing"],
    questionType: "THEORY", questionCount: 5, yearRange: [2017, 2025],
    markRange: [15, 25], paperNumbers: [2], xpReward: 320, paperPref: "P4",
    milestone: "Near A*! Final simulations ahead.",
  },
  {
    level: 28, title: "Full Mix — Reading & Writing I", unit: "All",
    topicFilter: [],
    questionType: "MIX", questionCount: 8, yearRange: [2019, 2022],
    markRange: [1, 25], paperNumbers: [1, 2], xpReward: 350, paperPref: "both",
  },
  {
    level: 29, title: "Full Mix — Reading & Writing II", unit: "All",
    topicFilter: [],
    questionType: "MIX", questionCount: 8, yearRange: [2022, 2025],
    markRange: [1, 25], paperNumbers: [1, 2], xpReward: 380, paperPref: "both",
  },
  {
    level: 30, title: "A* Final — Paper 1 Simulation", unit: "All",
    milestone: "Level 30 reached!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2023, 2025],
    markRange: [1, 15], paperNumbers: [1], xpReward: 400, paperPref: "P2",
  },
  // L31-50: Revisit weak spots + exam polish
  ...Array.from({ length: 20 }, (_, i) => ({
    level: 31 + i,
    title: `Revision Round ${i + 1}`,
    unit: "All" as const,
    topicFilter: [] as string[],
    questionType: "MIX" as QuestionMode,
    questionCount: 8,
    yearRange: [2017, 2025] as [number, number],
    markRange: [1, 25] as [number, number],
    paperNumbers: [1, 2],
    xpReward: 300 + i * 10,
    paperPref: "both" as PaperPref,
    ...(i === 19 ? { milestone: "🎉 Level 50! English A* preparation complete!" } : {}),
  })),
];

// ─── 0680 Environmental Management ────────────────────────────────────────────
export const EM_0680_ROADMAP: RoadmapLevel[] = [
  // ── TIER 1: Foundation (L1-8) ────────────────────────────────────────────
  {
    level: 1, title: "Rocks & Minerals", unit: "All",
    milestone: "Welcome to Environmental Management! Let's start with the Earth.",
    topicFilter: ["1.1 Rocks and minerals"],
    questionType: "THEORY", questionCount: 8, yearRange: [2022, 2025],
    markRange: [1, 5], paperNumbers: [1], xpReward: 100, paperPref: "P2",
  },
  {
    level: 2, title: "Energy Resources", unit: "All",
    topicFilter: ["1.2 Energy resources"],
    questionType: "THEORY", questionCount: 8, yearRange: [2021, 2025],
    markRange: [2, 6], paperNumbers: [1], xpReward: 110, paperPref: "P2",
  },
  {
    level: 3, title: "Agriculture", unit: "All",
    topicFilter: ["2.1 Agriculture"],
    questionType: "THEORY", questionCount: 8, yearRange: [2021, 2025],
    markRange: [2, 6], paperNumbers: [1], xpReward: 120, paperPref: "P2",
  },
  {
    level: 4, title: "Water Management", unit: "All",
    topicFilter: ["2.2 Water management"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 6], paperNumbers: [1], xpReward: 120, paperPref: "P2",
  },
  {
    level: 5, title: "Oceans & Fisheries", unit: "All",
    topicFilter: ["3.1 Oceans and fisheries"],
    questionType: "THEORY", questionCount: 8, yearRange: [2020, 2025],
    markRange: [2, 7], paperNumbers: [1], xpReward: 130, paperPref: "P2",
  },
  {
    level: 6, title: "Natural Hazards", unit: "All",
    topicFilter: ["3.2 Natural hazards"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [2, 7], paperNumbers: [1], xpReward: 130, paperPref: "P2",
  },
  {
    level: 7, title: "The Atmosphere", unit: "All",
    topicFilter: ["4.1 The atmosphere"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [2, 8], paperNumbers: [1], xpReward: 140, paperPref: "P2",
  },
  {
    level: 8, title: "Human Population", unit: "All",
    topicFilter: ["4.2 Human population"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [2, 8], paperNumbers: [1], xpReward: 150, paperPref: "P2",
    milestone: "Foundation done! Now for deeper Paper 2 questions.",
  },
  // ── TIER 2: Intermediate — Paper 2 style (L9-24) ─────────────────────────
  {
    level: 9, title: "Rocks & Energy — Paper 2", unit: "All",
    topicFilter: ["1.1 Rocks and minerals", "1.2 Energy resources"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 10], paperNumbers: [2], xpReward: 160, paperPref: "P4",
  },
  {
    level: 10, title: "Agriculture & Water — Paper 2", unit: "All",
    topicFilter: ["2.1 Agriculture", "2.2 Water management"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2025],
    markRange: [3, 10], paperNumbers: [2], xpReward: 170, paperPref: "P4",
  },
  {
    level: 11, title: "Oceans & Hazards — Paper 2", unit: "All",
    topicFilter: ["3.1 Oceans and fisheries", "3.2 Natural hazards"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 10], paperNumbers: [2], xpReward: 180, paperPref: "P4",
  },
  {
    level: 12, title: "Atmosphere & Population — Paper 2", unit: "All",
    topicFilter: ["4.1 The atmosphere", "4.2 Human population"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [3, 10], paperNumbers: [2], xpReward: 190, paperPref: "P4",
  },
  {
    level: 13, title: "Energy & Water Cross-Topic", unit: "All",
    topicFilter: ["1.2 Energy resources", "2.2 Water management"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [2], xpReward: 200, paperPref: "P4",
  },
  {
    level: 14, title: "Agriculture & Fisheries Cross-Topic", unit: "All",
    topicFilter: ["2.1 Agriculture", "3.1 Oceans and fisheries"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [3, 10], paperNumbers: [2], xpReward: 200, paperPref: "P4",
  },
  {
    level: 15, title: "Full Paper 1 Mix — 2017-2020", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2020],
    markRange: [1, 8], paperNumbers: [1], xpReward: 220, paperPref: "P2",
  },
  {
    level: 16, title: "Full Paper 1 Mix — 2021-2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2021, 2025],
    markRange: [1, 8], paperNumbers: [1], xpReward: 240, paperPref: "P2",
    milestone: "Halfway! Now tackling longer extended-answer questions.",
  },
  // ── TIER 3: Advanced (L17-40) ─────────────────────────────────────────────
  {
    level: 17, title: "Extended: Rocks & Energy", unit: "All",
    topicFilter: ["1.1 Rocks and minerals", "1.2 Energy resources"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [5, 15], paperNumbers: [2], xpReward: 260, paperPref: "P4",
  },
  {
    level: 18, title: "Extended: Agriculture & Water", unit: "All",
    topicFilter: ["2.1 Agriculture", "2.2 Water management"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [5, 15], paperNumbers: [2], xpReward: 270, paperPref: "P4",
  },
  {
    level: 19, title: "Extended: Oceans & Hazards", unit: "All",
    topicFilter: ["3.1 Oceans and fisheries", "3.2 Natural hazards"],
    questionType: "THEORY", questionCount: 8, yearRange: [2018, 2025],
    markRange: [5, 15], paperNumbers: [2], xpReward: 280, paperPref: "P4",
  },
  {
    level: 20, title: "Extended: Atmosphere & Population", unit: "All",
    topicFilter: ["4.1 The atmosphere", "4.2 Human population"],
    questionType: "THEORY", questionCount: 8, yearRange: [2017, 2025],
    markRange: [5, 15], paperNumbers: [2], xpReward: 290, paperPref: "P4",
  },
  {
    level: 21, title: "Full Paper 2 Mix — 2017-2020", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2017, 2020],
    markRange: [2, 15], paperNumbers: [2], xpReward: 300, paperPref: "P4",
  },
  {
    level: 22, title: "Full Paper 2 Mix — 2021-2023", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2021, 2023],
    markRange: [2, 15], paperNumbers: [2], xpReward: 320, paperPref: "P4",
  },
  {
    level: 23, title: "Full Paper 2 Mix — 2024-2025", unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2024, 2025],
    markRange: [2, 15], paperNumbers: [2], xpReward: 340, paperPref: "P4",
    milestone: "Advanced stage done! Final exam simulations.",
  },
  {
    level: 24, title: "Cross-Paper All Topics I", unit: "All",
    topicFilter: [],
    questionType: "MIX", questionCount: 10, yearRange: [2019, 2022],
    markRange: [1, 15], paperNumbers: [1, 2], xpReward: 340, paperPref: "both",
  },
  // ── TIER 4: Exam Simulations (L25-50) ────────────────────────────────────
  ...Array.from({ length: 26 }, (_, i) => ({
    level: 25 + i,
    title: `Exam Simulation ${i + 1}`,
    unit: "All" as const,
    topicFilter: [] as string[],
    questionType: "MIX" as QuestionMode,
    questionCount: 10,
    yearRange: [2017, 2025] as [number, number],
    markRange: [1, 15] as [number, number],
    paperNumbers: [1, 2],
    xpReward: 320 + i * 15,
    paperPref: (i % 2 === 0 ? "P2" : "P4") as PaperPref,
    ...(i === 25 ? { milestone: "🎉 Level 50! Environmental Management A* complete!" } : {}),
  })),
];

// ─── 0549 Hindi as a Second Language ─────────────────────────────────────────
// Paper 1: Reading & Writing (50 marks) | Paper 2: Listening (30 marks)
// Levels 1-16: Reading foundations | 17-30: Writing skills | 31-42: Listening | 43-50: Full sim
export const HINDI_0549_ROADMAP: RoadmapLevel[] = [
  // ── TIER 1: Reading Foundations (L1-8) ──────────────────────────────────
  { level: 1,  title: "Reading Comprehension Basics",   unit: "All",
    milestone: "Start your Hindi A* journey!",
    topicFilter: ["5.1 Reading Comprehension (पठन बोध)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 100, paperPref: "P2" },
  { level: 2,  title: "Personal World Reading",          unit: "All",
    topicFilter: ["1.1 Family & Relationships (परिवार और रिश्ते)", "1.2 Identity & Personal Life (पहचान और व्यक्तिगत जीवन)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 100, paperPref: "P2" },
  { level: 3,  title: "School & Education Topics",       unit: "All",
    topicFilter: ["2.1 School & Education (स्कूल और शिक्षा)", "2.2 Work & Career (काम और करियर)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 100, paperPref: "P2" },
  { level: 4,  title: "Leisure & Travel Reading",        unit: "All",
    topicFilter: ["3.1 Free Time & Hobbies (खाली समय और शौक)", "3.2 Travel & Transport (यात्रा और परिवहन)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 100, paperPref: "P2" },
  { level: 5,  title: "Environment & Technology",        unit: "All",
    topicFilter: ["4.1 Environment & Sustainability (पर्यावरण और स्थिरता)", "4.2 Technology & Media (प्रौद्योगिकी और मीडिया)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 4], xpReward: 120, paperPref: "P2" },
  { level: 6,  title: "Inference & Implication",         unit: "All",
    topicFilter: ["5.2 Inference & Implication (अनुमान और निहितार्थ)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [2, 4], xpReward: 130, paperPref: "P2" },
  { level: 7,  title: "Summary & Note-Making",           unit: "All",
    topicFilter: ["5.3 Summary & Note-Making (सारांश और नोट बनाना)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [3, 6], xpReward: 140, paperPref: "P2" },
  { level: 8,  title: "Reading Skills Mixed",            unit: "All",
    milestone: "Reading foundations complete!",
    topicFilter: ["5.1 Reading Comprehension (पठन बोध)", "5.2 Inference & Implication (अनुमान और निहितार्थ)", "5.3 Summary & Note-Making (सारांश और नोट बनाना)"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2024],
    markRange: [2, 6], xpReward: 150, paperPref: "P2" },

  // ── TIER 2: Writing Skills (L9-20) ──────────────────────────────────────
  { level: 9,  title: "Directed Writing — Letters",      unit: "All",
    topicFilter: ["6.1 Directed Writing (निर्देशित लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [4, 8], xpReward: 150, paperPref: "P2" },
  { level: 10, title: "Directed Writing — Emails",       unit: "All",
    topicFilter: ["6.1 Directed Writing (निर्देशित लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [4, 8], xpReward: 150, paperPref: "P2" },
  { level: 11, title: "Narrative Writing",               unit: "All",
    topicFilter: ["6.2 Narrative & Descriptive Writing (कथात्मक और वर्णनात्मक लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [4, 10], xpReward: 160, paperPref: "P2" },
  { level: 12, title: "Descriptive Writing",             unit: "All",
    topicFilter: ["6.2 Narrative & Descriptive Writing (कथात्मक और वर्णनात्मक लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [4, 10], xpReward: 160, paperPref: "P2" },
  { level: 13, title: "Argumentative Writing",           unit: "All",
    topicFilter: ["6.3 Argumentative & Discursive Writing (तर्कपूर्ण और विमर्शात्मक लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [5, 10], xpReward: 170, paperPref: "P2" },
  { level: 14, title: "Future Plans Writing",            unit: "All",
    topicFilter: ["2.3 Future Plans & Ambitions (भविष्य की योजनाएं)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [3, 8], xpReward: 160, paperPref: "P2" },
  { level: 15, title: "Food, Health & Lifestyle",        unit: "All",
    topicFilter: ["3.3 Food & Health (भोजन और स्वास्थ्य)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [2, 6], xpReward: 150, paperPref: "P2" },
  { level: 16, title: "Social Issues Writing",           unit: "All",
    milestone: "Writing Tier 1 complete!",
    topicFilter: ["4.3 Global & Social Issues (वैश्विक और सामाजिक मुद्दे)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [3, 8], xpReward: 170, paperPref: "P2" },

  // ── TIER 3: Language Accuracy (L17-24) ───────────────────────────────────
  { level: 17, title: "Vocabulary & Word Choice",        unit: "All",
    topicFilter: ["8.1 Vocabulary & Word Choice (शब्द भंडार)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 150, paperPref: "P2" },
  { level: 18, title: "Grammar & Tense",                 unit: "All",
    topicFilter: ["8.2 Grammar & Sentence Structure (व्याकरण और वाक्य संरचना)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 150, paperPref: "P2" },
  { level: 19, title: "Spelling & Script",               unit: "All",
    topicFilter: ["8.3 Spelling & Script Accuracy (वर्तनी और लिपि शुद्धता)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 2], xpReward: 140, paperPref: "P2" },
  { level: 20, title: "Language Mixed Drill",            unit: "All",
    milestone: "Language accuracy tier done!",
    topicFilter: ["8.1 Vocabulary & Word Choice (शब्द भंडार)", "8.2 Grammar & Sentence Structure (व्याकरण और वाक्य संरचना)"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2024],
    markRange: [1, 4], xpReward: 160, paperPref: "P2" },

  // ── TIER 4: Listening Skills (L21-34) ────────────────────────────────────
  { level: 21, title: "Listening for Gist",              unit: "All",
    milestone: "Paper 2 Listening begins!",
    topicFilter: ["7.1 Listening for Gist (मुख्य विचार सुनना)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [1, 2], xpReward: 150, paperPref: "P2" },
  { level: 22, title: "Listening for Detail",            unit: "All",
    topicFilter: ["7.2 Listening for Detail (विस्तार से सुनना)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [1, 3], xpReward: 150, paperPref: "P2" },
  { level: 23, title: "Extended Listening",              unit: "All",
    topicFilter: ["7.3 Extended Listening (विस्तारित श्रवण)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [2, 4], xpReward: 160, paperPref: "P2" },
  { level: 24, title: "Listening Mixed Session",         unit: "All",
    milestone: "Listening skills unlocked!",
    topicFilter: ["7.1 Listening for Gist (मुख्य विचार सुनना)", "7.2 Listening for Detail (विस्तार से सुनना)", "7.3 Extended Listening (विस्तारित श्रवण)"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2024],
    markRange: [1, 4], xpReward: 170, paperPref: "P2" },

  // ── TIER 5: Advanced Mixed (L25-40) ──────────────────────────────────────
  ...Array.from({ length: 16 }, (_, i) => ({
    level: 25 + i,
    title: [
      "Home & Local Area", "Personal Identity Deep Dive", "Education Discussion",
      "Career & Ambition", "Travel Narratives", "Health & Lifestyle",
      "Environment Essay", "Technology Impact", "Social Issues Debate",
      "Reading Under Pressure", "Writing Timed Practice", "Grammar Intensive",
      "Vocabulary Expansion", "Mixed Reading Session", "Mixed Writing Session", "Full Language Drill",
    ][i],
    unit: "All" as const,
    topicFilter: [] as string[],
    questionType: "THEORY" as QuestionMode,
    questionCount: 8,
    yearRange: [2019, 2024] as [number, number],
    markRange: [2, 8] as [number, number],
    xpReward: 180 + i * 5,
    paperPref: "both" as PaperPref,
    ...(i === 15 ? { milestone: "Advanced level reached!" } : {}),
  })),

  // ── TIER 6: Exam Simulation (L41-50) ─────────────────────────────────────
  { level: 41, title: "Paper 1 Section A Sim",           unit: "All",
    topicFilter: ["5.1 Reading Comprehension (पठन बोध)", "5.2 Inference & Implication (अनुमान और निहितार्थ)"],
    questionType: "THEORY", questionCount: 8, yearRange: [2019, 2024],
    markRange: [2, 6], xpReward: 250, paperPref: "P2" },
  { level: 42, title: "Paper 1 Section B Sim",           unit: "All",
    topicFilter: ["5.3 Summary & Note-Making (सारांश और नोट बनाना)", "6.1 Directed Writing (निर्देशित लेखन)"],
    questionType: "THEORY", questionCount: 6, yearRange: [2019, 2024],
    markRange: [4, 10], xpReward: 260, paperPref: "P2" },
  { level: 43, title: "Paper 1 Section C Sim",           unit: "All",
    topicFilter: ["6.2 Narrative & Descriptive Writing (कथात्मक और वर्णनात्मक लेखन)", "6.3 Argumentative & Discursive Writing (तर्कपूर्ण और विमर्शात्मक लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [5, 12], xpReward: 270, paperPref: "P2" },
  { level: 44, title: "Paper 2 Full Listening Sim",      unit: "All",
    milestone: "Listening paper simulation!",
    topicFilter: ["7.1 Listening for Gist (मुख्य विचार सुनना)", "7.2 Listening for Detail (विस्तार से सुनना)", "7.3 Extended Listening (विस्तारित श्रवण)"],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2024],
    markRange: [1, 4], xpReward: 280, paperPref: "P2" },
  { level: 45, title: "Speed Reading Challenge",         unit: "All",
    topicFilter: ["5.1 Reading Comprehension (पठन बोध)"],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2024],
    markRange: [1, 4], xpReward: 280, paperPref: "P2" },
  { level: 46, title: "Extended Writing Challenge",      unit: "All",
    topicFilter: ["6.1 Directed Writing (निर्देशित लेखन)", "6.2 Narrative & Descriptive Writing (कथात्मक और वर्णनात्मक लेखन)", "6.3 Argumentative & Discursive Writing (तर्कपूर्ण और विमर्शात्मक लेखन)"],
    questionType: "THEORY", questionCount: 5, yearRange: [2019, 2024],
    markRange: [6, 15], xpReward: 290, paperPref: "P2" },
  { level: 47, title: "Mixed All Topics",                unit: "All",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2024],
    markRange: [2, 8], xpReward: 300, paperPref: "both" },
  { level: 48, title: "Mock Paper 1 Simulation",         unit: "All",
    milestone: "Mock Paper 1 unlocked!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2024],
    markRange: [2, 10], xpReward: 350, paperPref: "P2" },
  { level: 49, title: "Mock Paper 2 Simulation",         unit: "All",
    milestone: "Mock Paper 2 unlocked!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 10, yearRange: [2019, 2024],
    markRange: [1, 5], xpReward: 350, paperPref: "P2" },
  { level: 50, title: "A* Final Exam Simulation",        unit: "All",
    milestone: "You have completed all 50 levels! A* ready!",
    topicFilter: [],
    questionType: "THEORY", questionCount: 15, yearRange: [2019, 2024],
    markRange: [1, 12], xpReward: 500, paperPref: "both" },
];

// ─── Roadmap registry (per subject) ──────────────────────────────────────────
export const ROADMAP_BY_SUBJECT: Record<string, RoadmapLevel[]> = {
  "0653": CS_0653_ROADMAP,
  "0580": MATH_0580_ROADMAP,
  "0500": ENG_0500_ROADMAP,
  "0680": EM_0680_ROADMAP,
  "0549": HINDI_0549_ROADMAP,
};

export function getRoadmapForSubject(subjectCode: string): RoadmapLevel[] {
  return ROADMAP_BY_SUBJECT[subjectCode] ?? CS_0653_ROADMAP;
}

export function getRoadmapLevel(subjectCode: string, level: number): RoadmapLevel | undefined {
  return getRoadmapForSubject(subjectCode).find(r => r.level === level);
}

/** Returns the level number the student should do next */
export function getNextIncompleteLevel(
  subjectCode: string,
  completedLevels: Set<number>,
  startLevel = 1
): number {
  const roadmap = getRoadmapForSubject(subjectCode);
  for (const r of roadmap) {
    if (r.level >= startLevel && !completedLevels.has(r.level)) return r.level;
  }
  return 50; // all done — revisit final level
}

/** Milestones shown as badges/celebrations */
export function getMilestoneForLevel(subjectCode: string, level: number): string | undefined {
  return getRoadmapLevel(subjectCode, level)?.milestone;
}
