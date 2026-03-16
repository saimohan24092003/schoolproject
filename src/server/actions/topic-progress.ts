"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import db from "@/server/db/drizzle";
import {
  userTopicSetup,
  topicLevelProgress,
  courses, units, lessons, challenges, challengeProgress,
} from "@/server/db/schema";

// ── Onboarding ─────────────────────────────────────────────────────────────

export async function getTopicSetup(subjectCode: string) {
  const { userId } = auth();
  if (!userId) return null;
  return db.query.userTopicSetup.findFirst({
    where: and(
      eq(userTopicSetup.userId, userId),
      eq(userTopicSetup.subjectCode, subjectCode)
    ),
  });
}

export async function saveTopicSetup(
  subjectCode: string,
  coveredTopics: string[],
  practiceMode: "all" | "new_only" = "all",
  extra?: {
    paperPreference?: "P2" | "P4" | "both";
    selfAssessment?: "starter" | "some_practice" | "revision";
    targetGrade?: "A*" | "A" | "B";
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Compute starting roadmap level based on self-assessment
  const levelMap: Record<string, number> = {
    starter: 1,
    some_practice: 15,
    revision: 30,
  };
  const startRoadmapLevel = levelMap[extra?.selfAssessment ?? "starter"] ?? 1;

  const existing = await db.query.userTopicSetup.findFirst({
    where: and(
      eq(userTopicSetup.userId, userId),
      eq(userTopicSetup.subjectCode, subjectCode)
    ),
  });

  const payload = {
    coveredTopics: JSON.stringify(coveredTopics),
    onboardingDone: true,
    practiceMode,
    paperPreference: extra?.paperPreference ?? "both",
    selfAssessment:  extra?.selfAssessment  ?? "starter",
    targetGrade:     extra?.targetGrade     ?? "A*",
    startRoadmapLevel,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(userTopicSetup).set(payload)
      .where(and(
        eq(userTopicSetup.userId, userId),
        eq(userTopicSetup.subjectCode, subjectCode)
      ));
  } else {
    await db.insert(userTopicSetup).values({
      userId, subjectCode, ...payload,
    });
  }
}

// ── Level completion tracking ───────────────────────────────────────────────

export async function markLevelComplete(
  subjectCode: string,
  topicName: string,
  level: number,
  score: number
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db.query.topicLevelProgress.findFirst({
    where: and(
      eq(topicLevelProgress.userId, userId),
      eq(topicLevelProgress.subjectCode, subjectCode),
      eq(topicLevelProgress.topicName, topicName),
      eq(topicLevelProgress.level, level)
    ),
  });

  const now = new Date();
  const isFirstComplete = !existing?.completed && score >= 60;

  if (existing) {
    await db.update(topicLevelProgress).set({
      completed:   existing.completed || isFirstComplete,
      score:       Math.max(existing.score, score),
      attempts:    (existing.attempts || 0) + 1,
      completedAt: isFirstComplete ? now : existing.completedAt,
      updatedAt:   now,
    }).where(and(
      eq(topicLevelProgress.userId, userId),
      eq(topicLevelProgress.subjectCode, subjectCode),
      eq(topicLevelProgress.topicName, topicName),
      eq(topicLevelProgress.level, level)
    ));
  } else {
    await db.insert(topicLevelProgress).values({
      userId, subjectCode, topicName, level,
      completed:   isFirstComplete,
      score,
      attempts:    1,
      completedAt: isFirstComplete ? now : null,
      updatedAt:   now,
    });
  }

  return { levelMastered: isFirstComplete || (existing?.completed ?? false) };
}

// ── Fetch all topic level progress for a subject ───────────────────────────

export type TopicProgress = {
  topicName: string;
  levels: Record<number, { completed: boolean; score: number; attempts: number }>;
  allDone: boolean;
};

export async function getSubjectTopicProgress(subjectCode: string): Promise<TopicProgress[]> {
  const { userId } = auth();
  if (!userId) return [];

  const rows = await db.query.topicLevelProgress.findMany({
    where: and(
      eq(topicLevelProgress.userId, userId),
      eq(topicLevelProgress.subjectCode, subjectCode)
    ),
  });

  const byTopic: Record<string, TopicProgress> = {};
  for (const row of rows) {
    if (!byTopic[row.topicName]) {
      byTopic[row.topicName] = { topicName: row.topicName, levels: {}, allDone: false };
    }
    byTopic[row.topicName].levels[row.level] = {
      completed: row.completed,
      score:     row.score,
      attempts:  row.attempts,
    };
  }

  // Compute allDone (all 3 levels complete)
  for (const topic of Object.values(byTopic)) {
    topic.allDone = [1, 2, 3].every(l => topic.levels[l]?.completed);
  }

  return Object.values(byTopic);
}
