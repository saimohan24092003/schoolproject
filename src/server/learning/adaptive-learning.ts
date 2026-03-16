import {
  canUnlockNextLevel,
  getLevelBand,
  getQuestionMix,
  getTargetDifficulty,
  normalizeLevel,
} from "./difficulty-progression";
import type {
  AdaptivePlan,
  AdaptivePlanInput,
  TopicPerformance,
  TopicRecommendation,
  UnlockMetrics,
} from "./types";

const DEFAULT_LANGUAGE = "en";

function daysUntilExam(examDate?: string): number | null {
  if (!examDate) return null;
  const ms = new Date(examDate).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}

function scoreTopicPriority(topic: TopicPerformance): TopicRecommendation {
  const lowAccuracyPenalty = Math.max(0, 100 - topic.accuracy) * 0.7;
  const speedPenalty = Math.min(30, topic.avgTimeSeconds / 5);
  const mistakesPenalty = topic.recentMistakes * 8;
  const uncoveredBoost = topic.coveredInSchool === false ? 20 : 0;
  const lowExposureBoost = topic.attempts < 5 ? 10 : 0;
  const priorityScore =
    Math.round(lowAccuracyPenalty + speedPenalty + mistakesPenalty + uncoveredBoost + lowExposureBoost);

  let reason = "Balanced review";
  if (topic.accuracy < 60) reason = "Low accuracy";
  else if (topic.recentMistakes >= 3) reason = "Repeated mistakes";
  else if (topic.coveredInSchool === false) reason = "Uncovered in school";

  return {
    topic: topic.topic,
    priorityScore,
    reason,
  };
}

function buildDailyGoals(level: number, examDaysLeft: number | null): {
  dailyGoalQuestions: number;
  dailyGoalMinutes: number;
} {
  const normalized = normalizeLevel(level);
  let dailyGoalQuestions = 20 + Math.floor(normalized / 5);
  let dailyGoalMinutes = 35 + Math.floor(normalized / 4);

  if (examDaysLeft !== null && examDaysLeft <= 60) {
    dailyGoalQuestions += 8;
    dailyGoalMinutes += 20;
  }
  if (examDaysLeft !== null && examDaysLeft <= 30) {
    dailyGoalQuestions += 6;
    dailyGoalMinutes += 15;
  }

  return { dailyGoalQuestions, dailyGoalMinutes };
}

export function buildAdaptivePracticePlan(
  input: AdaptivePlanInput,
  unlockMetrics: UnlockMetrics
): AdaptivePlan {
  const currentLevel = normalizeLevel(input.currentLevel);
  const unlockDecision = canUnlockNextLevel(unlockMetrics);
  const recommendedLevel = unlockDecision.unlocked
    ? Math.min(50, currentLevel + 1)
    : currentLevel;
  const fallbackRevisionLevel = Math.max(1, recommendedLevel - 2);

  const levelBand = getLevelBand(recommendedLevel);
  const targetDifficulty = getTargetDifficulty(recommendedLevel);
  const questionMix = getQuestionMix(recommendedLevel);

  const rankedTopics = input.topicPerformance
    .map(scoreTopicPriority)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);

  const examDaysLeft = daysUntilExam(input.examDate);
  const { dailyGoalQuestions, dailyGoalMinutes } = buildDailyGoals(recommendedLevel, examDaysLeft);

  return {
    recommendedLevel,
    fallbackRevisionLevel,
    levelBand,
    targetDifficulty,
    questionMix,
    dailyGoalQuestions,
    dailyGoalMinutes,
    recommendedTopics: rankedTopics as TopicRecommendation[],
    preferredLanguage: input.preferredLanguage || DEFAULT_LANGUAGE,
  };
}
