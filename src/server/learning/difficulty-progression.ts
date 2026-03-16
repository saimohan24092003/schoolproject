import type { LevelBand, QuestionMix, UnlockDecision, UnlockMetrics } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function normalizeLevel(level: number): number {
  return clamp(Math.round(level), 1, 50);
}

export function getLevelBand(level: number): LevelBand {
  const normalized = normalizeLevel(level);
  if (normalized <= 10) return "BASIC_CONCEPTS";
  if (normalized <= 20) return "CONCEPT_REINFORCEMENT";
  if (normalized <= 30) return "EXAM_STYLE";
  if (normalized <= 40) return "MIXED_DIFFICULTY";
  return "A_STAR_MASTERY";
}

export function getTargetDifficulty(level: number): number {
  const normalized = normalizeLevel(level);
  return clamp(Math.ceil(normalized / 5), 1, 10);
}

export function getQuestionMix(level: number): QuestionMix {
  const band = getLevelBand(level);
  if (band === "BASIC_CONCEPTS") {
    return { MCQ: 40, STRUCTURED: 25, DIAGRAM: 10, NUMERICAL: 15, PAST_PAPER: 10 };
  }
  if (band === "CONCEPT_REINFORCEMENT") {
    return { MCQ: 30, STRUCTURED: 30, DIAGRAM: 10, NUMERICAL: 20, PAST_PAPER: 10 };
  }
  if (band === "EXAM_STYLE") {
    return { MCQ: 20, STRUCTURED: 35, DIAGRAM: 15, NUMERICAL: 15, PAST_PAPER: 15 };
  }
  if (band === "MIXED_DIFFICULTY") {
    return { MCQ: 20, STRUCTURED: 30, DIAGRAM: 20, NUMERICAL: 15, PAST_PAPER: 15 };
  }
  return { MCQ: 10, STRUCTURED: 35, DIAGRAM: 20, NUMERICAL: 15, PAST_PAPER: 20 };
}

export function getMinimumQuestionsForLevel(level: number): number {
  const normalized = normalizeLevel(level);
  const tierBoost = Math.floor((normalized - 1) / 10) * 2;
  return 10 + tierBoost;
}

export function getUnlockCriteria(level: number): {
  requiredAccuracy: number;
  requiredScore: number;
} {
  const normalized = normalizeLevel(level);
  const requiredAccuracy = clamp(Math.round(58 + normalized * 0.55), 60, 85);
  const requiredScore = clamp(Math.round(55 + normalized * 0.7), 60, 90);
  return { requiredAccuracy, requiredScore };
}

export function canUnlockNextLevel(metrics: UnlockMetrics): UnlockDecision {
  const level = normalizeLevel(metrics.level);
  const minimumQuestions = getMinimumQuestionsForLevel(level);
  const { requiredAccuracy, requiredScore } = getUnlockCriteria(level);
  const reasons: string[] = [];

  if (metrics.attemptedQuestions < minimumQuestions) {
    reasons.push(
      `Need ${minimumQuestions - metrics.attemptedQuestions} more questions in this level.`
    );
  }
  if (metrics.accuracy < requiredAccuracy) {
    reasons.push(`Accuracy ${metrics.accuracy}% is below required ${requiredAccuracy}%.`);
  }
  if (metrics.levelScore < requiredScore) {
    reasons.push(`Level score ${metrics.levelScore}% is below required ${requiredScore}%.`);
  }
  if (metrics.streakDays < 1) {
    reasons.push("Complete at least one active study day to unlock consistency bonus.");
  }

  return {
    unlocked: reasons.length === 0,
    reasons,
    requiredAccuracy,
    requiredScore,
    minimumQuestions,
  };
}
