export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import {
  igcseGamificationState,
  igcseLevelProgress,
  igcsePracticeSession,
  igcseTopicMetric,
} from "@/server/db/schema";
import { isSupportedPaperType, isSupportedSubjectCode } from "@/server/learning/subject-catalog";

export async function GET(
  _req: Request,
  context: { params: { subjectCode: string; paperType: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subjectCode = context.params.subjectCode;
  const paperType = context.params.paperType;
  if (!isSupportedSubjectCode(subjectCode)) {
    return NextResponse.json({ error: "Unsupported subjectCode" }, { status: 400 });
  }
  if (!isSupportedPaperType(paperType)) {
    return NextResponse.json({ error: "Unsupported paperType" }, { status: 400 });
  }

  const [levels, topics, sessions, game] = await Promise.all([
    db.query.igcseLevelProgress.findMany({
      where: and(
        eq(igcseLevelProgress.userId, userId),
        eq(igcseLevelProgress.subjectCode, subjectCode),
        eq(igcseLevelProgress.paperType, paperType)
      ),
    }),
    db.query.igcseTopicMetric.findMany({
      where: and(
        eq(igcseTopicMetric.userId, userId),
        eq(igcseTopicMetric.subjectCode, subjectCode),
        eq(igcseTopicMetric.paperType, paperType)
      ),
    }),
    db.query.igcsePracticeSession.findMany({
      where: and(
        eq(igcsePracticeSession.userId, userId),
        eq(igcsePracticeSession.subjectCode, subjectCode),
        eq(igcsePracticeSession.paperType, paperType)
      ),
      limit: 20,
    }),
    db.query.igcseGamificationState.findFirst({
      where: eq(igcseGamificationState.userId, userId),
    }),
  ]);

  const completedLevels = levels.filter((row) => row.completed).length;
  const averageAccuracy = topics.length
    ? Math.round(topics.reduce((sum, row) => sum + row.accuracy, 0) / topics.length)
    : 0;
  const weakTopics = [...topics]
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, 8)
    .map((row) => ({
      topicName: row.topicName,
      accuracy: row.accuracy,
      weaknessScore: row.weaknessScore,
      attempts: row.attempts,
    }));

  const latestSession = sessions
    .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0] || null;

  return NextResponse.json({
    subjectCode,
    paperType,
    levelsCompleted: completedLevels,
    levelsTotal: 50,
    completionPct: Math.round((completedLevels / 50) * 100),
    averageAccuracy,
    weakTopics,
    latestSession: latestSession
      ? {
          sessionId: latestSession.id,
          levelNo: latestSession.levelNo,
          status: latestSession.status,
          score: latestSession.score,
          accuracy: latestSession.accuracy,
          xpEarned: latestSession.xpEarned,
        }
      : null,
    gamification: game
      ? {
          totalXp: game.totalXp,
          currentStreak: game.currentStreak,
          longestStreak: game.longestStreak,
          badges: JSON.parse(game.badgesJson || "[]"),
          leaderboardPoints: game.leaderboardPoints,
        }
      : {
          totalXp: 0,
          currentStreak: 0,
          longestStreak: 0,
          badges: [],
          leaderboardPoints: 0,
        },
  });
}
