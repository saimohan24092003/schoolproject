"use server";

import { auth } from "@clerk/nextjs/server";
import db from "@/server/db/drizzle";
import { examSessions, proctoringLogs, gradeHistory, userProgress } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Create a new exam session when user starts an exam
 */
export async function createExamSession(examPaperId: number) {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Check if user already has an active session
  const existingSession = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.userId, userId),
      eq(examSessions.status, "in_progress")
    ),
  });

  if (existingSession) {
    return existingSession;
  }

  // Create new session
  const [session] = await db.insert(examSessions).values({
    userId,
    examPaperId,
    status: "in_progress",
    startedAt: new Date(),
  }).returning();

  return session;
}

/**
 * Submit an exam and calculate results
 */
export async function submitExam(
  sessionId: number, 
  answers: Record<number, string>,
  proctoringEvents: Array<{ type: string; timestamp: Date; details?: string }>
) {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get the session
  const session = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.id, sessionId),
      eq(examSessions.userId, userId)
    ),
    with: {
      examPaper: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const examPaper = session.examPaper;
  let score = 0;
  let percentage = 0;
  let topicAnalysis: Record<string, { correct: number; total: number }> = {};

  try {
    const content = JSON.parse(examPaper.content);
    if (content.type === "MCQ" && content.questions) {
      const questions = content.questions;
      let correctCount = 0;
      
      questions.forEach((q: any) => {
        const userAnswer = answers[q.number];
        const isCorrect = userAnswer === q.correctAnswer?.toString() || userAnswer === q.options?.[q.correctAnswer];
        
        const topic = q.topic || "General";
        if (!topicAnalysis[topic]) {
          topicAnalysis[topic] = { correct: 0, total: 0 };
        }
        topicAnalysis[topic].total += 1;

        if (isCorrect) {
          correctCount++;
          topicAnalysis[topic].correct += 1;
        }
      });

      score = Math.round((correctCount / questions.length) * 100);
      percentage = score;
    } else {
      // Fallback for free-text (A-Level)
      const questionCount = Object.keys(answers).length;
      const answeredCount = Object.values(answers).filter(a => a.length > 0).length;
      score = Math.round((answeredCount / (content.questions?.length || 10)) * 70);
      percentage = score;
    }
  } catch (err) {
    console.error("Error parsing exam content for scoring:", err);
    score = 0;
  }
  
  // Determine grade based on score
  let grade: string;
  if (score >= 90) grade = "A*";
  else if (score >= 80) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 50) grade = "D";
  else if (score >= 40) grade = "E";
  else grade = "U";

  // Calculate time spent
  const timeSpent = session.startedAt 
    ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
    : 0;

  // Update session
  await db.update(examSessions)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      score,
      percentage: score,
      grade,
      timeSpent,
    })
    .where(eq(examSessions.id, sessionId));

  // Log proctoring events
  if (proctoringEvents.length > 0) {
    await db.insert(proctoringLogs).values(
      proctoringEvents.map(event => ({
        examSessionId: sessionId,
        eventType: event.type,
        timestamp: event.timestamp,
        details: event.details,
        riskLevel: event.type === "tab_switch" ? "medium" : "low",
      }))
    );
  }

  // Update user progress
  await updateUserProgress(userId, score, grade);

  // Add to grade history
  await db.insert(gradeHistory).values({
    userId,
    examPaperId: session.examPaperId,
    score,
    percentage: score,
    grade,
    completedAt: new Date(),
  });

  return { score, grade, percentage: score, topicAnalysis };
}

/**
 * Update user progress after exam completion
 */
async function updateUserProgress(userId: string, score: number, grade: string) {
  // Get current progress
  const progress = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
  });

  const totalExams = (progress?.totalExamsCompleted || 0) + 1;
  const newAverage = Math.round(
    ((progress?.averageScore || 0) * (progress?.totalExamsCompleted || 0) + score) / totalExams
  );

  // Update streak (simplified)
  const lastExamDate = progress?.updatedAt;
  const today = new Date();
  const isConsecutiveDay = lastExamDate 
    ? Math.floor((today.getTime() - lastExamDate.getTime()) / (1000 * 60 * 60 * 24)) === 1
    : true;

  const newStreak = isConsecutiveDay ? (progress?.currentStreak || 0) + 1 : 1;
  const longestStreak = Math.max(newStreak, progress?.longestStreak || 0);

  if (progress) {
    await db.update(userProgress)
      .set({
        totalExamsCompleted: totalExams,
        averageScore: newAverage,
        currentStreak: newStreak,
        longestStreak,
        updatedAt: new Date(),
      })
      .where(eq(userProgress.userId, userId));
  } else {
    await db.insert(userProgress).values({
      userId,
      userName: "Student",
      totalExamsCompleted: 1,
      averageScore: score,
      currentStreak: 1,
      longestStreak: 1,
      targetGrade: "A*",
    });
  }
}

/**
 * Log a proctoring event during exam
 */
export async function logProctoringEvent(
  sessionId: number,
  eventType: string,
  details?: string
) {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db.insert(proctoringLogs).values({
    examSessionId: sessionId,
    eventType,
    timestamp: new Date(),
    details,
    riskLevel: eventType === "tab_switch" ? "medium" : "low",
  });
}

/**
 * Get user's active exam session
 */
export async function getActiveSession() {
  const { userId } = auth();
  
  if (!userId) {
    return null;
  }

  return await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.userId, userId),
      eq(examSessions.status, "in_progress")
    ),
  });
}
