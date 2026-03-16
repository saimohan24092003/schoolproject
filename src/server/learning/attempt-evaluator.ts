import type { EvaluationOutput } from "@/server/ai/evaluation-pipeline";
import { evaluateAnswerWithAI } from "@/server/ai/evaluation-pipeline";
import { invokeGeminiJson } from "@/server/ai/gemini-adapters";

import { getSubjectName } from "./subject-catalog";
import type { SubjectCode } from "./types";

type SessionQuestionForEval = {
  subjectCode: string;
  questionText: string;
  markingScheme: string | null;
  marks: number;
  optionsJson: string | null;
  correctAnswer: string | null;
};

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateMcq(
  question: SessionQuestionForEval,
  answer: string
): EvaluationOutput {
  const correct = normalize(question.correctAnswer || "");
  const isCorrect = normalize(answer) === correct && correct.length > 0;
  const maxMarks = Math.max(1, Number(question.marks || 1));

  return {
    awardedMarks: isCorrect ? maxMarks : 0,
    maxMarks,
    isCorrect,
    correctAnswer: question.correctAnswer || "",
    conceptExplanation: isCorrect
      ? "Correct choice. Your understanding matches the expected concept."
      : "Your option does not match the correct concept tested in this question.",
    mistakeExplanation: isCorrect
      ? "No conceptual mistake detected."
      : "Recheck key terms in the stem and eliminate options that violate the concept.",
    improvementSteps: isCorrect
      ? ["Continue to the next question."]
      : [
          "Identify the core term in the question.",
          "Eliminate clearly wrong options first.",
          "Pick the option that fully satisfies the condition.",
        ],
    example: "For MCQs, read the stem twice before choosing.",
    examTip: "In IGCSE MCQ, option elimination improves accuracy under time pressure.",
    translatedExplanation: "",
    source: "fallback",
  };
}

export async function evaluateSessionQuestionAnswer(params: {
  question: SessionQuestionForEval;
  answer: string;
  preferredLanguage?: string;
}) {
  const maxMarks = Math.max(1, Number(params.question.marks || 1));
  const parsedOptions = params.question.optionsJson
    ? (JSON.parse(params.question.optionsJson) as string[])
    : null;

  if (parsedOptions && parsedOptions.length > 0) {
    return evaluateMcq(params.question, params.answer);
  }

  const subjectCode = params.question.subjectCode as SubjectCode;
  const subjectName =
    subjectCode === "0653" || subjectCode === "0680" || subjectCode === "0500" || subjectCode === "0580"
      ? getSubjectName(subjectCode)
      : "IGCSE";

  return evaluateAnswerWithAI(
    {
      subjectName,
      question: params.question.questionText,
      markingScheme: params.question.markingScheme || "",
      studentAnswer: params.answer,
      maxMarks,
      preferredLanguage: params.preferredLanguage,
    },
    invokeGeminiJson
  );
}

export function computeXpForAttempt(levelNo: number, isCorrect: boolean, hintCount: number) {
  if (!isCorrect) return 1;
  const base = 8 + Math.floor(levelNo / 5);
  const penalty = Math.max(0, hintCount * 2);
  return Math.max(2, base - penalty);
}
