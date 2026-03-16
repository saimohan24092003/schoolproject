"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { evaluateTheoryByMarkScheme } from "@/lib/marking-scheme";
import db from "@/server/db/drizzle";
import { challenges } from "@/server/db/schema";

const DEMO_USER_ID = "user_39sSWTon713wTYGHgxU2RRrIzYY";

type GradeLessonTheoryAnswerInput = {
  challengeId: number;
  answer: string;
};

export async function gradeLessonTheoryAnswer(input: GradeLessonTheoryAnswerInput) {
  const { userId: authUserId } = auth();
  const userId = authUserId || DEMO_USER_ID;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, input.challengeId),
    columns: {
      id: true,
      type: true,
      totalMarks: true,
      markingSchemeAnswer: true,
    },
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (challenge.type !== "THEORY") {
    throw new Error("Invalid challenge type");
  }

  const result = evaluateTheoryByMarkScheme({
    answer: input.answer,
    markingScheme: challenge.markingSchemeAnswer || "",
    maxMarks: challenge.totalMarks || 1,
  });

  const minimumMarksRequired = Math.max(1, Math.ceil(result.maxMarks * 0.6));

  return {
    ...result,
    isCorrect: result.awardedMarks >= minimumMarksRequired,
    minimumMarksRequired,
  };
}
