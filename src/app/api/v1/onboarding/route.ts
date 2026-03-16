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
} from "@/server/db/schema";
import { isSupportedPaperType, isSupportedSubjectCode } from "@/server/learning/subject-catalog";

type OnboardingPayload = {
  subjectCode: string;
  paperType: string;
  studiedTopics?: string[];
  unstudiedTopics?: string[];
  difficultTopics?: string[];
  examDate?: string;
  targetGrade?: string;
  preferredLanguage?: string;
  nativeLanguage?: string;
};

function toArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || "").trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as OnboardingPayload;
  if (!isSupportedSubjectCode(body.subjectCode)) {
    return NextResponse.json({ error: "Unsupported subjectCode" }, { status: 400 });
  }
  if (!isSupportedPaperType(body.paperType)) {
    return NextResponse.json({ error: "Unsupported paperType" }, { status: 400 });
  }

  const studiedTopics = toArray(body.studiedTopics);
  const unstudiedTopics = toArray(body.unstudiedTopics);
  const difficultTopics = toArray(body.difficultTopics);

  const existingProfile = await db.query.igcseStudentProfile.findFirst({
    where: eq(igcseStudentProfile.userId, userId),
  });

  if (!existingProfile) {
    await db.insert(igcseStudentProfile).values({
      userId,
      preferredLanguage: body.preferredLanguage || "en",
      nativeLanguage: body.nativeLanguage || "en",
      monthlyPlanInr: 500,
    });
  } else {
    await db.update(igcseStudentProfile).set({
      preferredLanguage: body.preferredLanguage || existingProfile.preferredLanguage,
      nativeLanguage: body.nativeLanguage || existingProfile.nativeLanguage,
      updatedAt: new Date(),
    }).where(eq(igcseStudentProfile.id, existingProfile.id));
  }

  const existingOnboarding = await db.query.igcseStudentOnboarding.findFirst({
    where: and(
      eq(igcseStudentOnboarding.userId, userId),
      eq(igcseStudentOnboarding.subjectCode, body.subjectCode),
      eq(igcseStudentOnboarding.paperType, body.paperType)
    ),
  });

  if (!existingOnboarding) {
    await db.insert(igcseStudentOnboarding).values({
      userId,
      subjectCode: body.subjectCode,
      paperType: body.paperType,
      studiedTopicsJson: JSON.stringify(studiedTopics),
      unstudiedTopicsJson: JSON.stringify(unstudiedTopics),
      difficultTopicsJson: JSON.stringify(difficultTopics),
      examDate: body.examDate || null,
      targetGrade: body.targetGrade || "A*",
      completed: true,
    });
  } else {
    await db.update(igcseStudentOnboarding).set({
      studiedTopicsJson: JSON.stringify(studiedTopics),
      unstudiedTopicsJson: JSON.stringify(unstudiedTopics),
      difficultTopicsJson: JSON.stringify(difficultTopics),
      examDate: body.examDate || existingOnboarding.examDate,
      targetGrade: body.targetGrade || existingOnboarding.targetGrade,
      completed: true,
      updatedAt: new Date(),
    }).where(eq(igcseStudentOnboarding.id, existingOnboarding.id));
  }

  const levelOne = await db.query.igcseLevelProgress.findFirst({
    where: and(
      eq(igcseLevelProgress.userId, userId),
      eq(igcseLevelProgress.subjectCode, body.subjectCode),
      eq(igcseLevelProgress.paperType, body.paperType),
      eq(igcseLevelProgress.levelNo, 1)
    ),
  });

  if (!levelOne) {
    await db.insert(igcseLevelProgress).values({
      userId,
      subjectCode: body.subjectCode,
      paperType: body.paperType,
      levelNo: 1,
      unlocked: true,
      completed: false,
      attemptsCount: 0,
      bestScore: 0,
      bestAccuracy: 0,
      updatedAt: new Date(),
    });
  } else if (!levelOne.unlocked) {
    await db.update(igcseLevelProgress).set({
      unlocked: true,
      updatedAt: new Date(),
    }).where(eq(igcseLevelProgress.id, levelOne.id));
  }

  return NextResponse.json({
    ok: true,
    userId,
    subjectCode: body.subjectCode,
    paperType: body.paperType,
    next: `/api/v1/roadmap/${body.subjectCode}/${body.paperType}`,
  });
}
