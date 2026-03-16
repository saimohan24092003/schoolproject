/**
 * Per-subject configuration for the smart practice system.
 * Defines whether a subject uses MCQ or structured/written answers,
 * and what each level contains.
 */

export type LevelConfig = {
  level: 1 | 2 | 3;
  label: string;
  desc: string;
  xp: string;
  type: "MCQ" | "STRUCTURED";
  markRange?: [number, number]; // min/max marks for question filtering (non-MCQ only)
  gradient: string;
  bg: string;
  border: string;
  text: string;
  btn: string;
};

export type SubjectConfig = {
  code: string;
  name: string;
  hasMCQ: boolean;            // Paper 1 MCQ exists
  answerMode: "mcq_then_theory" | "structured_only";
  levels: LevelConfig[];
};

const MCQ_LEVELS: LevelConfig[] = [
  {
    level: 1, label: "Foundation", xp: "+10 XP / question", type: "MCQ",
    desc: "Core MCQ questions — build understanding of each concept.",
    gradient: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", btn: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    level: 2, label: "Intermediate", xp: "+15 XP / question", type: "MCQ",
    desc: "Exam-style MCQs from Cambridge past papers 2017–2025.",
    gradient: "from-blue-400 to-indigo-500",
    bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700",
  },
  {
    level: 3, label: "Advanced", xp: "+20 XP / question", type: "STRUCTURED",
    desc: "Short-answer theory questions with AI marking against mark schemes.",
    gradient: "from-violet-400 to-purple-600",
    bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", btn: "bg-violet-600 hover:bg-violet-700",
  },
];

const MATHS_LEVELS: LevelConfig[] = [
  {
    level: 1, label: "Foundation", xp: "+10 XP / question", type: "STRUCTURED",
    desc: "1–3 mark questions — basic methods and calculations. Type or upload your working.",
    markRange: [1, 3],
    gradient: "from-blue-400 to-cyan-500",
    bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700",
  },
  {
    level: 2, label: "Intermediate", xp: "+15 XP / question", type: "STRUCTURED",
    desc: "4–6 mark questions — multi-step problem solving from past papers.",
    markRange: [4, 6],
    gradient: "from-indigo-400 to-violet-500",
    bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700",
  },
  {
    level: 3, label: "Advanced", xp: "+20 XP / question", type: "STRUCTURED",
    desc: "7+ mark extended questions — full working required for full marks.",
    markRange: [7, 99],
    gradient: "from-violet-400 to-purple-600",
    bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", btn: "bg-violet-600 hover:bg-violet-700",
  },
];

const ENGLISH_LEVELS: LevelConfig[] = [
  {
    level: 1, label: "Foundation", xp: "+10 XP / question", type: "STRUCTURED",
    desc: "Short reading & directed writing (1–5 marks). Build core skills.",
    markRange: [1, 5],
    gradient: "from-amber-400 to-orange-500",
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", btn: "bg-amber-500 hover:bg-amber-600",
  },
  {
    level: 2, label: "Intermediate", xp: "+15 XP / question", type: "STRUCTURED",
    desc: "Medium comprehension & writing tasks (6–15 marks) from past papers.",
    markRange: [6, 15],
    gradient: "from-orange-400 to-rose-500",
    bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", btn: "bg-orange-500 hover:bg-orange-600",
  },
  {
    level: 3, label: "Advanced", xp: "+20 XP / question", type: "STRUCTURED",
    desc: "Extended composition & analysis (16+ marks) — A*-level writing.",
    markRange: [16, 99],
    gradient: "from-rose-400 to-pink-600",
    bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", btn: "bg-rose-600 hover:bg-rose-700",
  },
];

const EM_LEVELS: LevelConfig[] = [
  {
    level: 1, label: "Foundation", xp: "+10 XP / question", type: "STRUCTURED",
    desc: "Short-answer structured questions (1–3 marks). Core knowledge.",
    markRange: [1, 3],
    gradient: "from-emerald-400 to-green-500",
    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", btn: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    level: 2, label: "Intermediate", xp: "+15 XP / question", type: "STRUCTURED",
    desc: "Data response & explanation questions (4–6 marks) from past papers.",
    markRange: [4, 6],
    gradient: "from-teal-400 to-cyan-500",
    bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", btn: "bg-teal-600 hover:bg-teal-700",
  },
  {
    level: 3, label: "Advanced", xp: "+20 XP / question", type: "STRUCTURED",
    desc: "Extended analysis & evaluation questions (6+ marks). Exam technique.",
    markRange: [6, 99],
    gradient: "from-cyan-400 to-blue-500",
    bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", btn: "bg-cyan-600 hover:bg-cyan-700",
  },
];

const HINDI_LEVELS: LevelConfig[] = [
  {
    level: 1, label: "Foundation", xp: "+10 XP / question", type: "STRUCTURED",
    desc: "Short reading & basic comprehension (1–5 marks). Build core vocabulary.",
    markRange: [1, 5],
    gradient: "from-fuchsia-400 to-pink-500",
    bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-700", btn: "bg-fuchsia-500 hover:bg-fuchsia-600",
  },
  {
    level: 2, label: "Intermediate", xp: "+15 XP / question", type: "STRUCTURED",
    desc: "Medium translation & structured tasks (6–15 marks) from past papers.",
    markRange: [6, 15],
    gradient: "from-pink-400 to-rose-500",
    bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", btn: "bg-pink-500 hover:bg-pink-600",
  },
  {
    level: 3, label: "Advanced", xp: "+20 XP / question", type: "STRUCTURED",
    desc: "Extended writing & essay composition (16+ marks) — A*-level expression.",
    markRange: [16, 99],
    gradient: "from-rose-400 to-red-600",
    bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", btn: "bg-rose-600 hover:bg-rose-700",
  },
];

export const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
  "0653": {
    code: "0653", name: "Combined Science", hasMCQ: true,
    answerMode: "mcq_then_theory", levels: MCQ_LEVELS,
  },
  "0580": {
    code: "0580", name: "Mathematics", hasMCQ: false,
    answerMode: "structured_only", levels: MATHS_LEVELS,
  },
  "0500": {
    code: "0500", name: "English First Language", hasMCQ: false,
    answerMode: "structured_only", levels: ENGLISH_LEVELS,
  },
  "0680": {
    code: "0680", name: "Environmental Management", hasMCQ: false,
    answerMode: "structured_only", levels: EM_LEVELS,
  },
  "0549": {
    code: "0549", name: "Hindi (IGCSE)", hasMCQ: false,
    answerMode: "structured_only", levels: HINDI_LEVELS,
  },
  "3195": {
    code: "3195", name: "Hindi (O Level)", hasMCQ: false,
    answerMode: "structured_only", levels: HINDI_LEVELS,
  },
};

export function getSubjectConfig(code: string): SubjectConfig {
  return SUBJECT_CONFIGS[code] ?? SUBJECT_CONFIGS["0653"];
}

export function subjectHasMCQ(code: string): boolean {
  return getSubjectConfig(code).hasMCQ;
}

export function getLevelConfig(code: string, level: 1 | 2 | 3): LevelConfig {
  return getSubjectConfig(code).levels.find(l => l.level === level) ?? getSubjectConfig(code).levels[0];
}
