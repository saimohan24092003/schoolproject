"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import db from "@/server/db/drizzle";
import { getCourseProgress, getUserProgress } from "@/server/db/queries";
import { challengeProgress, challenges, userProgress, attemptLogs } from "@/server/db/schema";
import { sql } from "drizzle-orm";

const DEMO_USER_ID = "user_39sSWTon713wTYGHgxU2RRrIzYY";

export const upsertChallengeProgress = async (challengeId: number) => {
  const { userId: authUserId } = auth();
  const userId = authUserId || DEMO_USER_ID;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const currentUserProgress = await getUserProgress();

  if (!currentUserProgress) {
    throw new Error("User progress not found");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const lessonId = challenge.lessonId;

  const existingChallengeProgress = await db.query.challengeProgress.findFirst({
    where: and(
      eq(challengeProgress.userId, userId),
      eq(challengeProgress.challengeId, challengeId),
    ),
  });

  const isPractice = !!existingChallengeProgress;

  if (isPractice) {
    await db
      .update(challengeProgress)
      .set({
        completed: true,
      })
      .where(
        and(
          eq(challengeProgress.userId, userId),
          eq(challengeProgress.challengeId, challengeId),
        ),
      );

    await db
      .update(userProgress)
      .set({
        points: sql`${userProgress.points} + 10`,
      })
      .where(eq(userProgress.userId, userId));

    revalidatePath("/learn");
    revalidatePath("/lesson");
    revalidatePath("/exams");
    revalidatePath("/dashboard");
    revalidatePath(`/lesson/${lessonId}`);
    return;
  }

  await db.insert(challengeProgress).values({
    challengeId,
    userId,
    completed: true,
  });

  await db
    .update(userProgress)
    .set({
      points: sql`${userProgress.points} + 10`,
    })
    .where(eq(userProgress.userId, userId));

  await db.insert(attemptLogs).values({
    userId,
    challengeId,
    status: "correct",
    repetitionCount: 1,
    timestamp: new Date(),
  });

  revalidatePath("/learn");
  revalidatePath("/lesson");
  revalidatePath("/exams");
  revalidatePath("/dashboard");
  revalidatePath(`/lesson/${lessonId}`);
};

export const reduceHearts = async (challengeId: number) => {
  const { userId: authUserId } = auth();
  const userId = authUserId || DEMO_USER_ID;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const currentUserProgress = await getUserProgress();
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const lessonId = challenge.lessonId;

  const existingChallengeProgress = await db.query.challengeProgress.findFirst({
    where: and(
      eq(challengeProgress.userId, userId),
      eq(challengeProgress.challengeId, challengeId),
    ),
  });

  const isPractice = !!existingChallengeProgress;

  if (isPractice) {
    return { error: "practice" };
  }

  if (!currentUserProgress) {
    throw new Error("User progress not found");
  }

  if (currentUserProgress.hearts === 0) {
    return { error: "hearts" };
  }

  await db
    .update(userProgress)
    .set({
      hearts: Math.max(currentUserProgress.hearts - 1, 0),
    })
    .where(eq(userProgress.userId, userId));

  await db.insert(attemptLogs).values({
    userId,
    challengeId,
    status: "wrong",
    repetitionCount: 1,
    timestamp: new Date(),
  });

  revalidatePath("/shop");
  revalidatePath("/learn");
  revalidatePath("/lesson");
  revalidatePath("/exams");
  revalidatePath("/dashboard");
  revalidatePath(`/lesson/${lessonId}`);
};
