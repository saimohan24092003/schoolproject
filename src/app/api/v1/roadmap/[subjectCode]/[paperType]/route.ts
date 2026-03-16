export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import { igcseLevelProgress } from "@/server/db/schema";
import {
  getLevelBand,
  getMinimumQuestionsForLevel,
  getUnlockCriteria,
  normalizeLevel,
} from "@/server/learning/difficulty-progression";
import {
  isSupportedPaperType,
  isSupportedSubjectCode,
} from "@/server/learning/subject-catalog";

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

  const rows = await db.query.igcseLevelProgress.findMany({
    where: and(
      eq(igcseLevelProgress.userId, userId),
      eq(igcseLevelProgress.subjectCode, subjectCode),
      eq(igcseLevelProgress.paperType, paperType)
    ),
  });
  const byLevel = new Map(rows.map((row) => [row.levelNo, row]));

  const levels = Array.from({ length: 50 }, (_, idx) => normalizeLevel(idx + 1)).map((levelNo) => {
    const existing = byLevel.get(levelNo);
    const criteria = getUnlockCriteria(levelNo);
    const minQuestions = getMinimumQuestionsForLevel(levelNo);
    return {
      levelNo,
      levelBand: getLevelBand(levelNo),
      unlocked: existing?.unlocked ?? levelNo === 1,
      completed: existing?.completed ?? false,
      attemptsCount: existing?.attemptsCount ?? 0,
      bestScore: existing?.bestScore ?? 0,
      bestAccuracy: existing?.bestAccuracy ?? 0,
      requiredAccuracy: criteria.requiredAccuracy,
      requiredScore: criteria.requiredScore,
      minimumQuestions: minQuestions,
    };
  });

  const completedCount = levels.filter((row) => row.completed).length;
  const nextLevel =
    levels.find((row) => row.unlocked && !row.completed)?.levelNo ?? Math.min(50, completedCount + 1);

  return NextResponse.json({
    subjectCode,
    paperType,
    completedCount,
    completionPct: Math.round((completedCount / 50) * 100),
    nextLevel,
    levels,
  });
}
