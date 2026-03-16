"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import db from "@/server/db/drizzle";
import { getCourseById, getUserProgress } from "@/server/db/queries";
import { challengeProgress, challenges, userProgress } from "@/server/db/schema";
import { POINTS_TO_REFILL } from "@/constants";

const DEMO_USER_ID = "user_39sSWTon713wTYGHgxU2RRrIzYY";

export const upsertUserProgress = async (courseId: number) => {
  const { userId: authUserId } = auth();
  const userId = authUserId || DEMO_USER_ID;
  const user = await currentUser();

  // For demo mode, we allow missing user from currentUser()
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const course = await getCourseById(courseId);

  if (!course) {
    throw new Error("Course not found");
  }

  if (!course.units.length || !course.units[0].lessons.length) {
    throw new Error("Course is empty");
  }

  const existingUserProgress = await getUserProgress();

  if (existingUserProgress) {
    await db.update(userProgress).set({
      activeCourseId: courseId,
      userName: user?.firstName || "User",
      userImageSrc: user?.imageUrl || "/mascot.svg",
    }).where(eq(userProgress.userId, userId));

    revalidatePath("/courses");
    revalidatePath("/learn");
    redirect("/learn");
  }

  await db.insert(userProgress).values({
    userId,
    activeCourseId: courseId,
    userName: user?.firstName || "User",
    userImageSrc: user?.imageUrl || "/mascot.svg",
    hearts: 5,
    points: 0,
  });

  revalidatePath("/courses");
  revalidatePath("/learn");
  redirect("/learn");
};

export const reduceHearts = async (challengeId: number) => {
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
      eq(challengeProgress.challengeId, challengeId)
    ),
  });

  const isPractice = !!existingChallengeProgress;

  if (isPractice) {
    return { error: "practice" };
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

  revalidatePath("/shop");
  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
  revalidatePath(`/lesson/${lessonId}`);
};

export const updateActiveSubject = async (courseId: number) => {
  const { userId: authUserId } = auth();
  const userId = authUserId || DEMO_USER_ID;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const existingUserProgress = await getUserProgress();

  if (existingUserProgress) {
    await db.update(userProgress).set({
      activeCourseId: courseId,
    }).where(eq(userProgress.userId, userId));

    revalidatePath("/dashboard");
    revalidatePath("/exams");
    revalidatePath("/learn");
    revalidatePath("/learn/smart-practice");
    revalidatePath("/progress");
    revalidatePath("/mock-exam");
  }
};

export const refillHearts = async () => {
  const currentUserProgress = await getUserProgress();

  if (!currentUserProgress) {
    throw new Error("User progress not found");
  }

  if (currentUserProgress.hearts === 5) {
    throw new Error("Hearts are already full");
  }

  if (currentUserProgress.points < POINTS_TO_REFILL) {
    throw new Error("Not enough points");
  }

  await db
    .update(userProgress)
    .set({
      hearts: 5,
      points: currentUserProgress.points - POINTS_TO_REFILL,
    })
    .where(eq(userProgress.userId, currentUserProgress.userId));

  revalidatePath("/shop");
  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
};
