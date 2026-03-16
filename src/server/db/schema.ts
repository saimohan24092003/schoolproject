import { relations } from "drizzle-orm";
import { 
  boolean,
  integer, 
  pgEnum, 
  pgTable, 
  serial, 
  text, 
  timestamp 
} from "drizzle-orm/pg-core";

// ============================================
// A-LEVEL BUSINESS (9609) EXAM PLATFORM SCHEMA
// ============================================

// Exam Papers - Compressed question-only past papers (2019-2025)
export const examPapers = pgTable("exam_papers", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("A-Level"), // "O-Level", "A-Level"
  subject: text("subject").notNull().default("Business Studies"),
  year: integer("year").notNull(),
  season: text("season").notNull(), // "march", "june", "november"
  paperNumber: integer("paper_number").notNull(), // 1, 2, 3, 4
  variant: text("variant").notNull(), // "ms" (mark scheme), "qp" (question paper)
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // JSON string of questions
  timeLimit: integer("time_limit").notNull().default(105), // minutes
  totalMarks: integer("total_marks").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const examPapersRelations = relations(examPapers, ({ many }) => ({
  examSessions: many(examSessions),
}));

// Exam Sessions - Tracks user exam attempts
export const examSessions = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  examPaperId: integer("exam_paper_id")
    .references(() => examPapers.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, submitted, graded
  startedAt: timestamp("started_at"),
  submittedAt: timestamp("submitted_at"),
  gradedAt: timestamp("graded_at"),
  score: integer("score"),
  percentage: integer("percentage"),
  grade: text("grade"), // U, E, D, C, B, A, A*
  timeSpent: integer("time_spent"), // seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const examSessionsRelations = relations(examSessions, ({ one, many }) => ({
  examPaper: one(examPapers, {
    fields: [examSessions.examPaperId],
    references: [examPapers.id],
  }),
  proctoringLogs: many(proctoringLogs),
  handwrittenAnswers: many(handwrittenAnswers),
  aiGradings: many(aiGradings),
}));

// Proctoring Logs - Interview-style proctoring data
export const proctoringLogs = pgTable("proctoring_logs", {
  id: serial("id").primaryKey(),
  examSessionId: integer("exam_session_id")
    .references(() => examSessions.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // tab_switch, face_away, no_audio, suspicious_movement, session_start, session_end
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  duration: integer("duration"), // seconds
  details: text("details"), // JSON string for additional data
  riskLevel: text("risk_level").default("low"), // low, medium, high
});

export const proctoringLogsRelations = relations(proctoringLogs, ({ one }) => ({
  examSession: one(examSessions, {
    fields: [proctoringLogs.examSessionId],
    references: [examSessions.id],
  }),
}));

// Handwritten Answers - User's handwritten answer uploads
export const handwrittenAnswers = pgTable("handwritten_answers", {
  id: serial("id").primaryKey(),
  examSessionId: integer("exam_session_id")
    .references(() => examSessions.id, { onDelete: "cascade" })
    .notNull(),
  questionNumber: integer("question_number").notNull(),
  imageUrl: text("image_url").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const handwrittenAnswersRelations = relations(handwrittenAnswers, ({ one }) => ({
  examSession: one(examSessions, {
    fields: [handwrittenAnswers.examSessionId],
    references: [examSessions.id],
  }),
}));

// AI Gradings - AI-powered answer grading with B→A* transformation
export const aiGradings = pgTable("ai_gradings", {
  id: serial("id").primaryKey(),
  examSessionId: integer("exam_session_id")
    .references(() => examSessions.id, { onDelete: "cascade" })
    .notNull(),
  questionNumber: integer("question_number").notNull(),
  maxMarks: integer("max_marks").notNull(),
  awardedMarks: integer("awarded_marks").notNull(),
  feedback: text("feedback").notNull(),
  improvementSuggestions: text("improvement_suggestions"), // JSON array
  modelAnswer: text("model_answer"),
  currentGrade: text("current_grade"),
  targetGrade: text("target_grade"),
  transformationPlan: text("transformation_plan"), // JSON with step-by-step plan
  gradedAt: timestamp("graded_at").notNull().defaultNow(),
});

export const aiGradingsRelations = relations(aiGradings, ({ one }) => ({
  examSession: one(examSessions, {
    fields: [aiGradings.examSessionId],
    references: [examSessions.id],
  }),
}));

// Legacy tables kept for reference but not actively used
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageSrc: text("image_src").notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
}));

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  courseId: integer("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  order: integer("order").notNull(),
});

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {
    fields: [units.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"), // For syllabus points and learning content
  unitId: integer("unit_id")
    .references(() => units.id, { onDelete: "cascade" })
    .notNull(),
  order: integer("order").notNull(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST", "THEORY"]);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id")
    .references(() => lessons.id, { onDelete: "cascade" })
    .notNull(),
  type: challengesEnum("type").notNull(),
  topic: text("topic"), // Sub-topic
  question: text("question").notNull(),
  explanation: text("explanation"), // Hints
  imageSrc: text("image_src"),
  paperRef: text("paper_ref"), // e.g. "Paper 1 | March 2024" for source attribution
  markingSchemeAnswer: text("marking_scheme_answer"), // For Theory/Short-answer
  totalMarks: integer("total_marks").notNull().default(1),
  order: integer("order").notNull(),
  audioSrc: text("audio_src"), // For listening-based questions (e.g. Hindi Paper 2)
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [challenges.lessonId],
    references: [lessons.id],
  }),
  challengeOptions: many(challengeOptions),
  challengeProgress: many(challengeProgress),
}));

export const challengeOptions = pgTable("challenge_options", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, { onDelete: "cascade" })
    .notNull(),
  text: text("text").notNull(),
  correct: boolean("correct").notNull(),
  imageSrc: text("image_src"),
  audioSrc: text("audio_src"),
});

export const challengeOptionsRelations = relations(
  challengeOptions,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeOptions.challengeId],
      references: [challenges.id],
    }),
  })
);

// User Progress - Updated for exam platform
export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull().default("Anon"),
  userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
  activeCourseId: integer("active_course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  hearts: integer("hearts").notNull().default(5),
  points: integer("points").notNull().default(0),
  totalExamsCompleted: integer("total_exams_completed").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  targetGrade: text("target_grade").default("A*"), 
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userProgressRelations = relations(userProgress, ({ many, one }) => ({
  gradeHistory: many(gradeHistory),
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

// Grade History - Track user's progression over time
export const gradeHistory = pgTable("grade_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  examPaperId: integer("exam_paper_id")
    .references(() => examPapers.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score").notNull(),
  percentage: integer("percentage").notNull(),
  grade: text("grade").notNull(),
  improvementFromPrevious: integer("improvement_from_previous"), // percentage points
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const gradeHistoryRelations = relations(gradeHistory, ({ one }) => ({
  examPaper: one(examPapers, {
    fields: [gradeHistory.examPaperId],
    references: [examPapers.id],
  }),
  userProgress: one(userProgress, {
    fields: [gradeHistory.userId],
    references: [userProgress.userId],
  }),
}));

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, { onDelete: "cascade" })
    .notNull(),
  completed: boolean("completed").notNull().default(false),
  attempts: integer("attempts").notNull().default(0), 
  lastAttemptAt: timestamp("last_attempt_at").defaultNow(),
});

export const challengeProgressRelations = relations(
  challengeProgress,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeProgress.challengeId],
      references: [challenges.id],
    }),
  })
);

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
});

// Attempt Logs - Stores EVERY interaction for Task 1 (Learning Analytics)
export const attemptLogs = pgTable("attempt_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").notNull(), // "correct", "wrong"
  repetitionCount: integer("repetition_count").notNull().default(1),
  timeTaken: integer("time_taken"), // seconds
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const attemptLogsRelations = relations(attemptLogs, ({ one }) => ({
  challenge: one(challenges, {
    fields: [attemptLogs.challengeId],
    references: [challenges.id],
  }),
}));

// ── User Topic Setup — onboarding: which topics student covered in school ──
export const userTopicSetup = pgTable("user_topic_setup", {
  id:                serial("id").primaryKey(),
  userId:            text("user_id").notNull(),
  subjectCode:       text("subject_code").notNull(),    // e.g. "0653"
  coveredTopics:     text("covered_topics").notNull().default("[]"), // JSON string[]
  onboardingDone:    boolean("onboarding_done").notNull().default(false),
  practiceMode:      text("practice_mode").notNull().default("all"), // "all" | "new_only"
  // New onboarding fields
  paperPreference:   text("paper_preference").default("both"),   // "P2" | "P4" | "both"
  selfAssessment:    text("self_assessment").default("starter"),  // "starter" | "some_practice" | "revision"
  targetGrade:       text("target_grade").default("A*"),           // "A*" | "A" | "B"
  startRoadmapLevel: integer("start_roadmap_level").default(1),   // 1 | 15 | 30
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

// ── User Roadmap Progress — tracks Level 1-50 completion ──
export const userRoadmapProgress = pgTable("user_roadmap_progress", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull(),
  subjectCode:  text("subject_code").notNull(),       // "0653"
  paperType:    text("paper_type").notNull().default("both"), // "P2" | "P4" | "both"
  roadmapLevel: integer("roadmap_level").notNull(),   // 1-50
  completed:    boolean("completed").notNull().default(false),
  score:        integer("score").notNull().default(0), // 0-100%
  xpEarned:     integer("xp_earned").notNull().default(0),
  attempts:     integer("attempts").notNull().default(0),
  completedAt:  timestamp("completed_at"),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── Topic Level Progress — tracks L1/L2/L3 completion per topic per user ──
export const topicLevelProgress = pgTable("topic_level_progress", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull(),
  subjectCode:  text("subject_code").notNull(),
  topicName:    text("topic_name").notNull(),   // e.g. "B5. Enzymes"
  level:        integer("level").notNull(),      // 1, 2, or 3
  completed:    boolean("completed").notNull().default(false),
  score:        integer("score").notNull().default(0),        // 0-100 %
  attempts:     integer("attempts").notNull().default(0),
  wrongAnswers: integer("wrong_answers").notNull().default(0),
  hintsUsed:    integer("hints_used").notNull().default(0),
  xpEarned:     integer("xp_earned").notNull().default(0),
  completedAt:  timestamp("completed_at"),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── Practice Sessions — one "sitting" groups all challenge attempts together ──
// Created when a student starts a topic level practice, closed on completion/exit.
export const practiceSessions = pgTable("practice_sessions", {
  id:                  serial("id").primaryKey(),
  userId:              text("user_id").notNull(),
  subjectCode:         text("subject_code").notNull(),
  topicName:           text("topic_name").notNull(),
  level:               integer("level").notNull(),          // 1, 2, or 3
  paperType:           text("paper_type"),                  // "P2", "P4", or null
  status:              text("status").notNull().default("in_progress"), // in_progress | completed | abandoned
  questionsAttempted:  integer("questions_attempted").notNull().default(0),
  questionsCorrect:    integer("questions_correct").notNull().default(0),
  totalHintsUsed:      integer("total_hints_used").notNull().default(0),
  xpEarned:            integer("xp_earned").notNull().default(0),
  startedAt:           timestamp("started_at").notNull().defaultNow(),
  completedAt:         timestamp("completed_at"),
});

export const practiceSessionsRelations = relations(practiceSessions, ({ many }) => ({
  attemptLogs: many(attemptLogs),
}));

// ── Daily Activity — one row per user per calendar day ──
// Used for streak calculation and daily XP totals shown in dashboard.
export const dailyActivity = pgTable("daily_activity", {
  id:                 serial("id").primaryKey(),
  userId:             text("user_id").notNull(),
  date:               text("date").notNull(),          // "YYYY-MM-DD"
  xpEarned:           integer("xp_earned").notNull().default(0),
  questionsAnswered:  integer("questions_answered").notNull().default(0),
  questionsCorrect:   integer("questions_correct").notNull().default(0),
  hintsUsed:          integer("hints_used").notNull().default(0),
  sessionsCompleted:  integer("sessions_completed").notNull().default(0),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// IGCSE SMART PRACTICE V1 (Level 1-50) TABLES
// ============================================

export const igcseStudentProfile = pgTable("igcse_student_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  nativeLanguage: text("native_language").notNull().default("en"),
  monthlyPlanInr: integer("monthly_plan_inr").notNull().default(500),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const igcseStudentOnboarding = pgTable("igcse_student_onboarding", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectCode: text("subject_code").notNull(), // 0653, 0680, 0500, 0580
  paperType: text("paper_type").notNull(), // P2 | P4
  studiedTopicsJson: text("studied_topics_json").notNull().default("[]"),
  unstudiedTopicsJson: text("unstudied_topics_json").notNull().default("[]"),
  difficultTopicsJson: text("difficult_topics_json").notNull().default("[]"),
  examDate: text("exam_date"), // YYYY-MM-DD
  targetGrade: text("target_grade").notNull().default("A*"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const igcseLevelProgress = pgTable("igcse_level_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectCode: text("subject_code").notNull(),
  paperType: text("paper_type").notNull(),
  levelNo: integer("level_no").notNull(), // 1..50
  unlocked: boolean("unlocked").notNull().default(false),
  completed: boolean("completed").notNull().default(false),
  attemptsCount: integer("attempts_count").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  bestAccuracy: integer("best_accuracy").notNull().default(0),
  lastPlayedAt: timestamp("last_played_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const igcsePracticeSession = pgTable("igcse_practice_session", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectCode: text("subject_code").notNull(),
  paperType: text("paper_type").notNull(),
  levelNo: integer("level_no").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress|completed|abandoned
  questionMixJson: text("question_mix_json").notNull().default("{}"),
  targetDifficulty: integer("target_difficulty").notNull().default(1),
  totalQuestions: integer("total_questions").notNull().default(0),
  answeredQuestions: integer("answered_questions").notNull().default(0),
  correctQuestions: integer("correct_questions").notNull().default(0),
  totalAwardedMarks: integer("total_awarded_marks").notNull().default(0),
  totalMaxMarks: integer("total_max_marks").notNull().default(0),
  score: integer("score").notNull().default(0),
  accuracy: integer("accuracy").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const igcseSessionQuestion = pgTable("igcse_session_question", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => igcsePracticeSession.id, { onDelete: "cascade" })
    .notNull(),
  sourceQuestionId: integer("source_question_id"), // challenge.id when source is challenges
  subjectCode: text("subject_code").notNull(),
  paperType: text("paper_type").notNull(),
  levelNo: integer("level_no").notNull(),
  topicName: text("topic_name"),
  questionType: text("question_type").notNull(), // MCQ | STRUCTURED | DIAGRAM | NUMERICAL | PAST_PAPER
  questionText: text("question_text").notNull(),
  marks: integer("marks").notNull().default(1),
  markingScheme: text("marking_scheme"),
  optionsJson: text("options_json"),
  correctAnswer: text("correct_answer"),
  sourcePaperRef: text("source_paper_ref"),
  imageRefsJson: text("image_refs_json"),
  answered: boolean("answered").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const igcseAttempt = pgTable("igcse_attempt", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => igcsePracticeSession.id, { onDelete: "cascade" })
    .notNull(),
  sessionQuestionId: integer("session_question_id")
    .references(() => igcseSessionQuestion.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id").notNull(),
  subjectCode: text("subject_code").notNull(),
  paperType: text("paper_type").notNull(),
  levelNo: integer("level_no").notNull(),
  answerType: text("answer_type").notNull(), // typed | handwritten
  typedAnswer: text("typed_answer"),
  ocrText: text("ocr_text"),
  awardedMarks: integer("awarded_marks").notNull().default(0),
  maxMarks: integer("max_marks").notNull().default(1),
  isCorrect: boolean("is_correct").notNull().default(false),
  timeTakenSeconds: integer("time_taken_seconds").notNull().default(0),
  hintCount: integer("hint_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const igcseAiFeedback = pgTable("igcse_ai_feedback", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .references(() => igcseAttempt.id, { onDelete: "cascade" })
    .notNull(),
  awardedMarks: integer("awarded_marks").notNull().default(0),
  maxMarks: integer("max_marks").notNull().default(1),
  isCorrect: boolean("is_correct").notNull().default(false),
  correctAnswer: text("correct_answer").notNull().default(""),
  conceptExplanation: text("concept_explanation").notNull().default(""),
  mistakeExplanation: text("mistake_explanation").notNull().default(""),
  improvementStepsJson: text("improvement_steps_json").notNull().default("[]"),
  example: text("example").notNull().default(""),
  examTip: text("exam_tip").notNull().default(""),
  translatedExplanation: text("translated_explanation").notNull().default(""),
  modelRawJson: text("model_raw_json"),
  source: text("source").notNull().default("fallback"), // ai | fallback
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const igcseTopicMetric = pgTable("igcse_topic_metric", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectCode: text("subject_code").notNull(),
  paperType: text("paper_type").notNull(),
  topicName: text("topic_name").notNull(),
  attempts: integer("attempts").notNull().default(0),
  correctAttempts: integer("correct_attempts").notNull().default(0),
  accuracy: integer("accuracy").notNull().default(0),
  avgTimeSeconds: integer("avg_time_seconds").notNull().default(0),
  weaknessScore: integer("weakness_score").notNull().default(0),
  lastPracticedAt: timestamp("last_practiced_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const igcseGamificationState = pgTable("igcse_gamification_state", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  totalXp: integer("total_xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  badgesJson: text("badges_json").notNull().default("[]"),
  leaderboardPoints: integer("leaderboard_points").notNull().default(0),
  lastActivityDate: text("last_activity_date"), // YYYY-MM-DD
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
