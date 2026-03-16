"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and, sql } from "drizzle-orm";
import db from "@/server/db/drizzle";
import {
    practiceSessions,
    dailyActivity,
    topicLevelProgress,
    attemptLogs,
    userProgress,
} from "@/server/db/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── Practice Sessions ─────────────────────────────────────────────────────────

/** Called when the student starts a session. Returns session id. */
export async function startPracticeSession(params: {
    subjectCode: string;
    topicName: string;
    level: number;
    paperType?: "P2" | "P4" | null;
}): Promise<number> {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const [row] = await db
        .insert(practiceSessions)
        .values({
            userId,
            subjectCode: params.subjectCode,
            topicName: params.topicName,
            level: params.level,
            paperType: params.paperType ?? null,
            status: "in_progress",
        })
        .returning({ id: practiceSessions.id });

    return row.id;
}

/** Called when the student answers a question (right or wrong). */
export async function recordQuestionAttempt(params: {
    sessionId: number;
    challengeId?: number | null;
    isCorrect: boolean;
    hintsUsedThisQuestion: number;
    xpEarned: number;
    timeTaken?: number;
}) {
    const { userId } = auth();
    if (!userId) return;

    const today = todayStr();

    // 1. Update practice_sessions counters
    if (params.isCorrect) {
        await db
            .update(practiceSessions)
            .set({
                questionsAttempted: sql`${practiceSessions.questionsAttempted} + 1`,
                questionsCorrect: sql`${practiceSessions.questionsCorrect} + 1`,
                totalHintsUsed: sql`${practiceSessions.totalHintsUsed} + ${params.hintsUsedThisQuestion}`,
                xpEarned: sql`${practiceSessions.xpEarned} + ${params.xpEarned}`,
            })
            .where(eq(practiceSessions.id, params.sessionId));
    } else {
        await db
            .update(practiceSessions)
            .set({
                questionsAttempted: sql`${practiceSessions.questionsAttempted} + 1`,
                totalHintsUsed: sql`${practiceSessions.totalHintsUsed} + ${params.hintsUsedThisQuestion}`,
            })
            .where(eq(practiceSessions.id, params.sessionId));
    }

    // 2. Log to attempt_logs if we have a challengeId
    if (params.challengeId) {
        await db.insert(attemptLogs).values({
            userId,
            challengeId: params.challengeId,
            status: params.isCorrect ? "correct" : "wrong",
            repetitionCount: 1,
            timeTaken: params.timeTaken ?? null,
        });
    }

    // 3. Upsert daily_activity
    const existing = await db.query.dailyActivity.findFirst({
        where: and(
            eq(dailyActivity.userId, userId),
            eq(dailyActivity.date, today)
        ),
    });

    if (existing) {
        if (params.isCorrect) {
            await db
                .update(dailyActivity)
                .set({
                    xpEarned: sql`${dailyActivity.xpEarned} + ${params.xpEarned}`,
                    questionsAnswered: sql`${dailyActivity.questionsAnswered} + 1`,
                    questionsCorrect: sql`${dailyActivity.questionsCorrect} + 1`,
                    hintsUsed: sql`${dailyActivity.hintsUsed} + ${params.hintsUsedThisQuestion}`,
                    updatedAt: new Date(),
                })
                .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, today)));
        } else {
            await db
                .update(dailyActivity)
                .set({
                    xpEarned: sql`${dailyActivity.xpEarned} + ${params.xpEarned}`,
                    questionsAnswered: sql`${dailyActivity.questionsAnswered} + 1`,
                    hintsUsed: sql`${dailyActivity.hintsUsed} + ${params.hintsUsedThisQuestion}`,
                    updatedAt: new Date(),
                })
                .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, today)));
        }
    } else {
        await db.insert(dailyActivity).values({
            userId,
            date: today,
            xpEarned: params.xpEarned,
            questionsAnswered: 1,
            questionsCorrect: params.isCorrect ? 1 : 0,
            hintsUsed: params.hintsUsedThisQuestion,
            sessionsCompleted: 0,
        });
    }
}

/** Called when the student finishes (or abandons) a session. */
export async function completePracticeSession(params: {
    sessionId: number;
    subjectCode: string;
    topicName: string;
    level: number;
    score: number; // 0-100
    totalXP: number;
    wrongAnswers: number;
    totalHints: number;
    status?: "completed" | "abandoned";
}) {
    const { userId } = auth();
    if (!userId) return;

    const today = todayStr();
    const status = params.status ?? "completed";

    // 1. Close the practice session row
    await db
        .update(practiceSessions)
        .set({ status, xpEarned: params.totalXP, completedAt: new Date() })
        .where(eq(practiceSessions.id, params.sessionId));

    if (status === "abandoned") return;

    // 2. Update topicLevelProgress with richer stats
    const existing = await db.query.topicLevelProgress.findFirst({
        where: and(
            eq(topicLevelProgress.userId, userId),
            eq(topicLevelProgress.subjectCode, params.subjectCode),
            eq(topicLevelProgress.topicName, params.topicName),
            eq(topicLevelProgress.level, params.level)
        ),
    });

    const isFirstComplete = !existing?.completed && params.score >= 60;
    const now = new Date();

    if (existing) {
        await db
            .update(topicLevelProgress)
            .set({
                completed: existing.completed || isFirstComplete,
                score: Math.max(existing.score, params.score),
                attempts: (existing.attempts || 0) + 1,
                wrongAnswers: (existing.wrongAnswers || 0) + params.wrongAnswers,
                hintsUsed: (existing.hintsUsed || 0) + params.totalHints,
                xpEarned: (existing.xpEarned || 0) + params.totalXP,
                completedAt: isFirstComplete ? now : existing.completedAt,
                updatedAt: now,
            })
            .where(and(
                eq(topicLevelProgress.userId, userId),
                eq(topicLevelProgress.subjectCode, params.subjectCode),
                eq(topicLevelProgress.topicName, params.topicName),
                eq(topicLevelProgress.level, params.level)
            ));
    } else {
        await db.insert(topicLevelProgress).values({
            userId,
            subjectCode: params.subjectCode,
            topicName: params.topicName,
            level: params.level,
            completed: isFirstComplete,
            score: params.score,
            attempts: 1,
            wrongAnswers: params.wrongAnswers,
            hintsUsed: params.totalHints,
            xpEarned: params.totalXP,
            completedAt: isFirstComplete ? now : null,
            updatedAt: now,
        });
    }

    // 3. Bump sessionsCompleted in daily_activity
    const todayRow = await db.query.dailyActivity.findFirst({
        where: and(
            eq(dailyActivity.userId, userId),
            eq(dailyActivity.date, today)
        ),
    });

    if (todayRow) {
        await db
            .update(dailyActivity)
            .set({ sessionsCompleted: sql`${dailyActivity.sessionsCompleted} + 1`, updatedAt: new Date() })
            .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, today)));
    } else {
        await db.insert(dailyActivity).values({ userId, date: today, sessionsCompleted: 1 });
    }

    // 4. Update user_progress streak + XP
    const up = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    });

    if (!up) return;

    // Streak logic: active yesterday → increment; else reset to 1
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const wasActiveYesterday = await db.query.dailyActivity.findFirst({
        where: and(
            eq(dailyActivity.userId, userId),
            eq(dailyActivity.date, yesterdayStr)
        ),
    });

    const newStreak = wasActiveYesterday ? (up.currentStreak || 0) + 1 : 1;

    await db
        .update(userProgress)
        .set({
            points: sql`${userProgress.points} + ${params.totalXP}`,
            currentStreak: newStreak,
            longestStreak: Math.max(up.longestStreak || 0, newStreak),
            updatedAt: new Date(),
        })
        .where(eq(userProgress.userId, userId));
}

// ── Dashboard stats ──────────────────────────────────────────────────────────

export async function getUserActivityStats() {
    const { userId } = auth();
    if (!userId) return null;

    const today = todayStr();

    const [todayActivity, progress, recentSessions] = await Promise.all([
        db.query.dailyActivity.findFirst({
            where: and(
                eq(dailyActivity.userId, userId),
                eq(dailyActivity.date, today)
            ),
        }),
        db.query.userProgress.findFirst({
            where: eq(userProgress.userId, userId),
        }),
        db.query.practiceSessions.findMany({
            where: and(
                eq(practiceSessions.userId, userId),
                eq(practiceSessions.status, "completed")
            ),
            orderBy: (rows, { desc }) => [desc(rows.startedAt)],
            limit: 10,
        }),
    ]);

    return {
        todayXP: todayActivity?.xpEarned ?? 0,
        todayQuestions: todayActivity?.questionsAnswered ?? 0,
        todayCorrect: todayActivity?.questionsCorrect ?? 0,
        todayHints: todayActivity?.hintsUsed ?? 0,
        todaySessions: todayActivity?.sessionsCompleted ?? 0,
        totalXP: progress?.points ?? 0,
        currentStreak: progress?.currentStreak ?? 0,
        longestStreak: progress?.longestStreak ?? 0,
        recentSessions,
    };
}
