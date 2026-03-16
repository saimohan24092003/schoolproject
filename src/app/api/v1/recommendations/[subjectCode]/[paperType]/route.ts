export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import {
  igcseLevelProgress,
  igcseStudentOnboarding,
  igcseStudentProfile,
  igcseTopicMetric,
} from "@/server/db/schema";
import { buildAdaptivePracticePlan } from "@/server/learning/adaptive-learning";
import { isSupportedPaperType, isSupportedSubjectCode } from "@/server/learning/subject-catalog";

function findCurrentLevel(rows: Array<{ levelNo: number; unlocked: boolean; completed: boolean }>): number {
  const nextUnlocked = rows
    .filter((row) => row.unlocked && !row.completed)
    .sort((a, b) => a.levelNo - b.levelNo)[0];
  if (nextUnlocked) return nextUnlocked.levelNo;
  const maxCompleted = rows.filter((row) => row.completed).sort((a, b) => b.levelNo - a.levelNo)[0];
  return maxCompleted ? Math.min(50, maxCompleted.levelNo + 1) : 1;
}

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

  const [levels, topics, onboarding, profile] = await Promise.all([
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
    db.query.igcseStudentOnboarding.findFirst({
      where: and(
        eq(igcseStudentOnboarding.userId, userId),
        eq(igcseStudentOnboarding.subjectCode, subjectCode),
        eq(igcseStudentOnboarding.paperType, paperType)
      ),
    }),
    db.query.igcseStudentProfile.findFirst({
      where: eq(igcseStudentProfile.userId, userId),
    }),
  ]);

  const currentLevel = findCurrentLevel(levels);
  const plan = buildAdaptivePracticePlan(
    {
      subjectCode,
      paperType,
      currentLevel,
      examDate: onboarding?.examDate || undefined,
      preferredLanguage: profile?.preferredLanguage || "en",
      topicPerformance: topics.map((row) => ({
        topic: row.topicName,
        attempts: row.attempts,
        accuracy: row.accuracy,
        avgTimeSeconds: row.avgTimeSeconds,
        recentMistakes: Math.max(0, row.attempts - row.correctAttempts),
      })),
    },
    {
      level: currentLevel,
      attemptedQuestions: 10,
      accuracy: topics.length
        ? Math.round(topics.reduce((sum, row) => sum + row.accuracy, 0) / topics.length)
        : 0,
      levelScore: levels.find((row) => row.levelNo === currentLevel)?.bestScore || 0,
      streakDays: 1,
    }
  );

  return NextResponse.json({
    subjectCode,
    paperType,
    currentLevel,
    plan,
  });
}
