import { buildExaminerEvaluationPrompt } from "./prompts";

type ModelInvoker = (prompt: string) => Promise<string>;

export type EvaluationInput = {
  subjectName: string;
  question: string;
  markingScheme: string;
  studentAnswer: string;
  maxMarks: number;
  preferredLanguage?: string;
};

export type EvaluationOutput = {
  awardedMarks: number;
  maxMarks: number;
  isCorrect: boolean;
  correctAnswer: string;
  conceptExplanation: string;
  mistakeExplanation: string;
  improvementSteps: string[];
  example: string;
  examTip: string;
  translatedExplanation: string;
  source: "ai" | "fallback";
};

function normalizeText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonSafely(raw: string): Record<string, unknown> | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || "").trim()).filter(Boolean);
}

function safeOutput(
  parsed: Record<string, unknown>,
  fallbackMaxMarks: number
): EvaluationOutput {
  const awardedMarks = Math.max(
    0,
    Math.min(fallbackMaxMarks, Math.round(Number(parsed.awardedMarks ?? 0)))
  );
  const maxMarks = Math.max(1, Math.round(Number(parsed.maxMarks ?? fallbackMaxMarks)));
  const isCorrect =
    typeof parsed.isCorrect === "boolean"
      ? parsed.isCorrect
      : awardedMarks >= Math.max(1, Math.ceil(maxMarks * 0.6));

  return {
    awardedMarks,
    maxMarks,
    isCorrect,
    correctAnswer: String(parsed.correctAnswer || ""),
    conceptExplanation: String(parsed.conceptExplanation || ""),
    mistakeExplanation: String(parsed.mistakeExplanation || ""),
    improvementSteps: toStringArray(parsed.improvementSteps),
    example: String(parsed.example || ""),
    examTip: String(parsed.examTip || ""),
    translatedExplanation: String(parsed.translatedExplanation || ""),
    source: "ai",
  };
}

function fallbackEvaluate(input: EvaluationInput): EvaluationOutput {
  const answerTokens = new Set(normalizeText(input.studentAnswer).split(" ").filter((x) => x.length > 2));
  const schemeTokens = normalizeText(input.markingScheme).split(" ").filter((x) => x.length > 2);
  const hits = schemeTokens.filter((token) => answerTokens.has(token)).length;
  const ratio = schemeTokens.length > 0 ? hits / schemeTokens.length : 0;
  const awardedMarks = Math.max(0, Math.min(input.maxMarks, Math.round(ratio * input.maxMarks)));
  const isCorrect = awardedMarks >= Math.max(1, Math.ceil(input.maxMarks * 0.6));

  return {
    awardedMarks,
    maxMarks: input.maxMarks,
    isCorrect,
    correctAnswer: input.markingScheme || "Follow official mark scheme points.",
    conceptExplanation: isCorrect
      ? "Good concept coverage."
      : "Your answer is missing some required concept points from the mark scheme.",
    mistakeExplanation: isCorrect
      ? "No major conceptual mistake detected."
      : "You used incomplete scientific points or missed key terms required by the examiner.",
    improvementSteps: [
      "Use precise subject terminology.",
      "Answer point-by-point against the mark scheme.",
      "Add one supporting example.",
    ],
    example: "Write a direct statement, then add one mark-scheme keyword and one short supporting line.",
    examTip: "In IGCSE long answers, short clear points score better than vague paragraphs.",
    translatedExplanation: "",
    source: "fallback",
  };
}

export async function evaluateAnswerWithAI(
  input: EvaluationInput,
  invokeModel: ModelInvoker
): Promise<EvaluationOutput> {
  const prompt = buildExaminerEvaluationPrompt(input);

  try {
    const raw = await invokeModel(prompt);
    const parsed = parseJsonSafely(raw);
    if (!parsed) {
      return fallbackEvaluate(input);
    }
    return safeOutput(parsed, input.maxMarks);
  } catch {
    return fallbackEvaluate(input);
  }
}
