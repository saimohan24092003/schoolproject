import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import {
  igcseAttempt,
  igcseGamificationState,
  igcseLevelProgress,
  igcsePracticeSession,
  igcseSessionQuestion,
  igcseTopicMetric,
} from "@/server/db/schema";

import { canUnlockNextLevel } from "./difficulty-progression";

type AttemptUpdateInput = {
  userId: string;
  sessionId: number;
  sessionQuestionId: number;
  answerType: "typed" | "handwritten";
  typedAnswer?: string;
  ocrText?: string;
  awardedMarks: number;
  maxMarks: number;
  isCorrect: boolean;
  timeTakenSeconds: number;
  hintCount: number;
  xpEarned: number;
};

function getTodayDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function applyBadgeRules(levelNo: number, existingBadges: string[]): string[] {
  const next = new Set(existingBadges);
  if (levelNo >= 10) next.add("Foundation Badge");
  if (levelNo >= 25) next.add("Exam Builder Badge");
  if (levelNo >= 50) next.add("A* Master Badge");
  return Array.from(next);
}

export async function persistAttemptAndUpdateProgress(input: AttemptUpdateInput) {
  const session = await db.query.igcsePracticeSession.findFirst({
    where: and(
      eq(igcsePracticeSession.id, input.sessionId),
      eq(igcsePracticeSession.userId, input.userId)
    ),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const sessionQuestion = await db.query.igcseSessionQuestion.findFirst({
    where: and(
      eq(igcseSessionQuestion.id, input.sessionQuestionId),
      eq(igcseSessionQuestion.sessionId, input.sessionId)
    ),
  });

  if (!sessionQuestion) {
    throw new Error("Session question not found");
  }

  const [attempt] = await db.insert(igcseAttempt).values({
    sessionId: input.sessionId,
    sessionQuestionId: input.sessionQuestionId,
    userId: input.userId,
    subjectCode: session.subjectCode,
    paperType: session.paperType,
    levelNo: session.levelNo,
    answerType: input.answerType,
    typedAnswer: input.typedAnswer || null,
    ocrText: input.ocrText || null,
    awardedMarks: input.awardedMarks,
    maxMarks: input.maxMarks,
    isCorrect: input.isCorrect,
    timeTakenSeconds: input.timeTakenSeconds,
    hintCount: input.hintCount,
  }).returning();

  const newAnswered = session.answeredQuestions + 1;
  const newCorrect = session.correctQuestions + (input.isCorrect ? 1 : 0);
  const newAwardedMarks = session.totalAwardedMarks + input.awardedMarks;
  const accuracy = Math.round((newCorrect / Math.max(1, newAnswered)) * 100);
  const score = Math.round((newAwardedMarks / Math.max(1, session.totalMaxMarks)) * 100);

  await db.update(igcsePracticeSession).set({
    answeredQuestions: newAnswered,
    correctQuestions: newCorrect,
    totalAwardedMarks: newAwardedMarks,
    accuracy,
    score,
    xpEarned: session.xpEarned + input.xpEarned,
    updatedAt: new Date(),
  }).where(eq(igcsePracticeSession.id, session.id));

  if (!sessionQuestion.answered) {
    await db.update(igcseSessionQuestion).set({
      answered: true,
    }).where(eq(igcseSessionQuestion.id, sessionQuestion.id));
  }

  const topicName = sessionQuestion.topicName || "General";
  const existingMetric = await db.query.igcseTopicMetric.findFirst({
    where: and(
      eq(igcseTopicMetric.userId, input.userId),
      eq(igcseTopicMetric.subjectCode, session.subjectCode),
      eq(igcseTopicMetric.paperType, session.paperType),
      eq(igcseTopicMetric.topicName, topicName)
    ),
  });

  if (!existingMetric) {
    await db.insert(igcseTopicMetric).values({
      userId: input.userId,
      subjectCode: session.subjectCode,
      paperType: session.paperType,
      topicName,
      attempts: 1,
      correctAttempts: input.isCorrect ? 1 : 0,
      accuracy: input.isCorrect ? 100 : 0,
      avgTimeSeconds: input.timeTakenSeconds,
      weaknessScore: input.isCorrect ? 20 : 80,
      lastPracticedAt: new Date(),
    });
  } else {
    const attempts = existingMetric.attempts + 1;
    const correctAttempts = existingMetric.correctAttempts + (input.isCorrect ? 1 : 0);
    const updatedAccuracy = Math.round((correctAttempts / Math.max(1, attempts)) * 100);
    const updatedAvgTime = Math.round(
      (existingMetric.avgTimeSeconds * existingMetric.attempts + input.timeTakenSeconds) /
      Math.max(1, attempts)
    );
    const weaknessScore = Math.max(
      0,
      Math.min(100, 100 - updatedAccuracy + Math.min(20, Math.floor(updatedAvgTime / 8)))
    );

    await db.update(igcseTopicMetric).set({
      attempts,
      correctAttempts,
      accuracy: updatedAccuracy,
      avgTimeSeconds: updatedAvgTime,
      weaknessScore,
      lastPracticedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(igcseTopicMetric.id, existingMetric.id));
  }

  const levelRow = await db.query.igcseLevelProgress.findFirst({
    where: and(
      eq(igcseLevelProgress.userId, input.userId),
      eq(igcseLevelProgress.subjectCode, session.subjectCode),
      eq(igcseLevelProgress.paperType, session.paperType),
      eq(igcseLevelProgress.levelNo, session.levelNo)
    ),
  });

  if (!levelRow) {
    await db.insert(igcseLevelProgress).values({
      userId: input.userId,
      subjectCode: session.subjectCode,
      paperType: session.paperType,
      levelNo: session.levelNo,
      unlocked: true,
      completed: false,
      attemptsCount: 1,
      bestScore: score,
      bestAccuracy: accuracy,
      lastPlayedAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db.update(igcseLevelProgress).set({
      attemptsCount: levelRow.attemptsCount + 1,
      bestScore: Math.max(levelRow.bestScore, score),
      bestAccuracy: Math.max(levelRow.bestAccuracy, accuracy),
      lastPlayedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(igcseLevelProgress.id, levelRow.id));
  }

  const unlockDecision = canUnlockNextLevel({
    level: session.levelNo,
    attemptedQuestions: newAnswered,
    accuracy,
    levelScore: score,
    streakDays: 1,
  });

  if (unlockDecision.unlocked) {
    await db.update(igcseLevelProgress).set({
      completed: true,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(igcseLevelProgress.userId, input.userId),
      eq(igcseLevelProgress.subjectCode, session.subjectCode),
      eq(igcseLevelProgress.paperType, session.paperType),
      eq(igcseLevelProgress.levelNo, session.levelNo)
    ));

    const nextLevel = Math.min(50, session.levelNo + 1);
    const existingNext = await db.query.igcseLevelProgress.findFirst({
      where: and(
        eq(igcseLevelProgress.userId, input.userId),
        eq(igcseLevelProgress.subjectCode, session.subjectCode),
        eq(igcseLevelProgress.paperType, session.paperType),
        eq(igcseLevelProgress.levelNo, nextLevel)
      ),
    });

    if (!existingNext) {
      await db.insert(igcseLevelProgress).values({
        userId: input.userId,
        subjectCode: session.subjectCode,
        paperType: session.paperType,
        levelNo: nextLevel,
        unlocked: true,
        completed: false,
        attemptsCount: 0,
        bestScore: 0,
        bestAccuracy: 0,
        updatedAt: new Date(),
      });
    } else if (!existingNext.unlocked) {
      await db.update(igcseLevelProgress).set({
        unlocked: true,
        updatedAt: new Date(),
      }).where(eq(igcseLevelProgress.id, existingNext.id));
    }
  }

  const existingGame = await db.query.igcseGamificationState.findFirst({
    where: eq(igcseGamificationState.userId, input.userId),
  });
  const today = getTodayDateKey();

  if (!existingGame) {
    await db.insert(igcseGamificationState).values({
      userId: input.userId,
      totalXp: input.xpEarned,
      currentStreak: 1,
      longestStreak: 1,
      badgesJson: JSON.stringify(applyBadgeRules(session.levelNo, [])),
      leaderboardPoints: input.xpEarned,
      lastActivityDate: today,
      updatedAt: new Date(),
    });
  } else {
    let currentStreak = existingGame.currentStreak;
    const previousDay = new Date();
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayKey = getTodayDateKey(previousDay);

    if (existingGame.lastActivityDate === today) {
      currentStreak = existingGame.currentStreak;
    } else if (existingGame.lastActivityDate === previousDayKey) {
      currentStreak = existingGame.currentStreak + 1;
    } else {
      currentStreak = 1;
    }

    const badges = applyBadgeRules(
      session.levelNo,
      JSON.parse(existingGame.badgesJson || "[]") as string[]
    );

    await db.update(igcseGamificationState).set({
      totalXp: existingGame.totalXp + input.xpEarned,
      currentStreak,
      longestStreak: Math.max(existingGame.longestStreak, currentStreak),
      badgesJson: JSON.stringify(badges),
      leaderboardPoints: existingGame.leaderboardPoints + input.xpEarned,
      lastActivityDate: today,
      updatedAt: new Date(),
    }).where(eq(igcseGamificationState.id, existingGame.id));
  }

  return {
    attemptId: attempt.id,
    sessionScore: score,
    sessionAccuracy: accuracy,
    levelUnlocked: unlockDecision.unlocked,
    unlockReasons: unlockDecision.reasons,
  };
}

export async function completeSession(params: {
  userId: string;
  sessionId: number;
}) {
  const session = await db.query.igcsePracticeSession.findFirst({
    where: and(
      eq(igcsePracticeSession.id, params.sessionId),
      eq(igcsePracticeSession.userId, params.userId)
    ),
  });
  if (!session) throw new Error("Session not found");

  await db.update(igcsePracticeSession).set({
    status: "completed",
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(igcsePracticeSession.id, session.id));

  return {
    sessionId: session.id,
    score: session.score,
    accuracy: session.accuracy,
    xpEarned: session.xpEarned,
    answeredQuestions: session.answeredQuestions,
    totalQuestions: session.totalQuestions,
  };
}
