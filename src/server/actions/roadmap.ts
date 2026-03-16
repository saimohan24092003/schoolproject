"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import db from "@/server/db/drizzle";
import { userRoadmapProgress, userTopicSetup, topicLevelProgress } from "@/server/db/schema";
import {
  getRoadmapForSubject,
  getNextIncompleteLevel,
  type RoadmapLevel,
} from "@/lib/roadmap-config";

// ── Get the user's roadmap progress for a subject ──────────────────────────

export async function getUserRoadmapProgress(subjectCode: string) {
  const { userId } = auth();
  if (!userId) return null;

  // 1. Fetch onboarding setup for this subject
  const setup = await db.query.userTopicSetup.findFirst({
    where: and(
      eq(userTopicSetup.userId, userId),
      eq(userTopicSetup.subjectCode, subjectCode)
    ),
  });

  const startLevel = setup?.startRoadmapLevel ?? 1;
  const paperPref  = (setup?.paperPreference as "P2" | "P4" | "both") ?? "both";
  const targetGrade = setup?.targetGrade ?? "A*";

  // 2. Fetch completed roadmap levels from DB
  const rows = await db.query.userRoadmapProgress.findMany({
    where: and(
      eq(userRoadmapProgress.userId, userId),
      eq(userRoadmapProgress.subjectCode, subjectCode),
      eq(userRoadmapProgress.completed, true)
    ),
  });

  const completedSet = new Set(rows.map(r => r.roadmapLevel));

  // 3. Also count topic-level progress (L1/L2/L3 completions) for roadmap levels
  //    that are computed from topicLevelProgress (levels 1-48)
  //    This allows the roadmap to stay in sync with regular practice sessions.
  const topicRows = await db.query.topicLevelProgress.findMany({
    where: and(
      eq(topicLevelProgress.userId, userId),
      eq(topicLevelProgress.subjectCode, subjectCode),
      eq(topicLevelProgress.completed, true)
    ),
  });
  const completedTopics = new Set(topicRows.map(r => `${r.topicName}:${r.level}`));

  const roadmap = getRoadmapForSubject(subjectCode);

  // Build enriched level list
  const levels = roadmap.map(lvl => {
    // A level is complete if either:
    // a) explicitly marked in user_roadmap_progress, OR
    // b) all constituent topics/levels in topicLevelProgress are done (for levels 1-46)
    let isComplete = completedSet.has(lvl.level);

    if (!isComplete && lvl.level <= 46 && lvl.topicFilter.length > 0) {
      // Check if all filtered topics have the appropriate level done
      const neededLevel = lvl.level <= 16 ? 1 : lvl.level <= 30 ? 2 : 3;
      isComplete = lvl.topicFilter.every(topic =>
        completedTopics.has(`${topic}:${neededLevel}`)
      );
    }

    return { ...lvl, isComplete, isLocked: lvl.level < startLevel };
  });

  const completedCount = levels.filter(l => l.isComplete && !l.isLocked).length;
  const totalLevels    = levels.filter(l => !l.isLocked).length;
  const pct            = Math.round((completedCount / Math.max(1, totalLevels)) * 100);

  const completedForNext = new Set(levels.filter(l => l.isComplete).map(l => l.level));
  const nextLevel = getNextIncompleteLevel(subjectCode, completedForNext, startLevel);

  return {
    startLevel,
    paperPref,
    targetGrade,
    levels,
    completedCount,
    totalLevels,
    pct,
    nextLevel,
    currentLevelNumber: startLevel + completedCount,
  };
}

// ── Mark a roadmap level as complete ───────────────────────────────────────

export async function markRoadmapLevelComplete(
  subjectCode: string,
  roadmapLevel: number,
  score: number,
  xpEarned: number
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const setup = await db.query.userTopicSetup.findFirst({
    where: and(
      eq(userTopicSetup.userId, userId),
      eq(userTopicSetup.subjectCode, subjectCode)
    ),
  });

  const paperType = setup?.paperPreference ?? "both";

  const existing = await db.query.userRoadmapProgress.findFirst({
    where: and(
      eq(userRoadmapProgress.userId, userId),
      eq(userRoadmapProgress.subjectCode, subjectCode),
      eq(userRoadmapProgress.roadmapLevel, roadmapLevel)
    ),
  });

  const now = new Date();
  const isFirstComplete = !existing?.completed && score >= 60;

  if (existing) {
    await db.update(userRoadmapProgress).set({
      completed: existing.completed || isFirstComplete,
      score: Math.max(existing.score, score),
      xpEarned: existing.xpEarned + xpEarned,
      attempts: existing.attempts + 1,
      completedAt: isFirstComplete ? now : existing.completedAt,
      updatedAt: now,
    }).where(and(
      eq(userRoadmapProgress.userId, userId),
      eq(userRoadmapProgress.subjectCode, subjectCode),
      eq(userRoadmapProgress.roadmapLevel, roadmapLevel)
    ));
  } else {
    await db.insert(userRoadmapProgress).values({
      userId,
      subjectCode,
      paperType,
      roadmapLevel,
      completed: isFirstComplete,
      score,
      xpEarned,
      attempts: 1,
      completedAt: isFirstComplete ? now : null,
      updatedAt: now,
    });
  }
}

// ── Get today's 3 missions (next incomplete roadmap levels) ────────────────

export async function getTodaysMissions(subjectCode: string): Promise<(RoadmapLevel & { isComplete: boolean })[]> {
  const { userId } = auth();
  if (!userId) return [];

  const progress = await getUserRoadmapProgress(subjectCode);
  if (!progress) return [];

  // Pick next 3 incomplete, non-locked levels
  return (progress.levels as (RoadmapLevel & { isComplete: boolean; isLocked: boolean })[])
    .filter(l => !l.isComplete && !l.isLocked)
    .slice(0, 3)
    .map(({ isLocked: _l, ...rest }) => rest as RoadmapLevel & { isComplete: boolean });
}
