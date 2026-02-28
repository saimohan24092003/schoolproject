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
  markingSchemeAnswer: text("marking_scheme_answer"), // For Theory/Short-answer
  totalMarks: integer("total_marks").notNull().default(1),
  order: integer("order").notNull(),
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
