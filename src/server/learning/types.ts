export type SubjectCode = "0653" | "0680" | "0500" | "0580" | "3195" | "0549";
export type PaperType = "P2" | "P4" | "P1";

export type LevelBand =
  | "BASIC_CONCEPTS"
  | "CONCEPT_REINFORCEMENT"
  | "EXAM_STYLE"
  | "MIXED_DIFFICULTY"
  | "A_STAR_MASTERY";

export type PracticeQuestionType =
  | "MCQ"
  | "STRUCTURED"
  | "DIAGRAM"
  | "NUMERICAL"
  | "PAST_PAPER";

export type QuestionMix = Record<PracticeQuestionType, number>;

export type TopicPerformance = {
  topic: string;
  attempts: number;
  accuracy: number;
  avgTimeSeconds: number;
  recentMistakes: number;
  coveredInSchool?: boolean;
};

export type UnlockMetrics = {
  level: number;
  attemptedQuestions: number;
  accuracy: number;
  levelScore: number;
  streakDays: number;
};

export type UnlockDecision = {
  unlocked: boolean;
  reasons: string[];
  requiredAccuracy: number;
  requiredScore: number;
  minimumQuestions: number;
};

export type AdaptivePlanInput = {
  subjectCode: SubjectCode;
  paperType: PaperType;
  currentLevel: number;
  examDate?: string;
  preferredLanguage?: string;
  topicPerformance: TopicPerformance[];
};

export type TopicRecommendation = {
  topic: string;
  priorityScore: number;
  reason: string;
};

export type AdaptivePlan = {
  recommendedLevel: number;
  fallbackRevisionLevel: number;
  levelBand: LevelBand;
  targetDifficulty: number;
  questionMix: QuestionMix;
  dailyGoalQuestions: number;
  dailyGoalMinutes: number;
  recommendedTopics: TopicRecommendation[];
  preferredLanguage: string;
};
