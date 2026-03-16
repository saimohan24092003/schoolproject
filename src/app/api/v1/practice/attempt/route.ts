export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import { igcseAiFeedback, igcsePracticeSession, igcseSessionQuestion } from "@/server/db/schema";
import {
  computeXpForAttempt,
  evaluateSessionQuestionAnswer,
} from "@/server/learning/attempt-evaluator";
import { persistAttemptAndUpdateProgress } from "@/server/learning/progress-tracker";

type AttemptPayload = {
  sessionId: number;
  sessionQuestionId: number;
  answer: string;
  timeTakenSeconds?: number;
  hintCount?: number;
  preferredLanguage?: string;
};

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as AttemptPayload;
  if (!body.sessionId || !body.sessionQuestionId) {
    return NextResponse.json({ error: "sessionId and sessionQuestionId are required" }, { status: 400 });
  }

  const session = await db.query.igcsePracticeSession.findFirst({
    where: and(
      eq(igcsePracticeSession.id, body.sessionId),
      eq(igcsePracticeSession.userId, userId)
    ),
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const question = await db.query.igcseSessionQuestion.findFirst({
    where: and(
      eq(igcseSessionQuestion.id, body.sessionQuestionId),
      eq(igcseSessionQuestion.sessionId, body.sessionId)
    ),
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const evaluation = await evaluateSessionQuestionAnswer({
    question: {
      subjectCode: question.subjectCode,
      questionText: question.questionText,
      markingScheme: question.markingScheme,
      marks: question.marks,
      optionsJson: question.optionsJson,
      correctAnswer: question.correctAnswer,
    },
    answer: String(body.answer || ""),
    preferredLanguage: body.preferredLanguage,
  });

  const xpEarned = computeXpForAttempt(
    session.levelNo,
    evaluation.isCorrect,
    Math.max(0, Number(body.hintCount || 0))
  );

  const progress = await persistAttemptAndUpdateProgress({
    userId,
    sessionId: body.sessionId,
    sessionQuestionId: body.sessionQuestionId,
    answerType: "typed",
    typedAnswer: String(body.answer || ""),
    awardedMarks: evaluation.awardedMarks,
    maxMarks: evaluation.maxMarks,
    isCorrect: evaluation.isCorrect,
    timeTakenSeconds: Math.max(0, Number(body.timeTakenSeconds || 0)),
    hintCount: Math.max(0, Number(body.hintCount || 0)),
    xpEarned,
  });

  await db.insert(igcseAiFeedback).values({
    attemptId: progress.attemptId,
    awardedMarks: evaluation.awardedMarks,
    maxMarks: evaluation.maxMarks,
    isCorrect: evaluation.isCorrect,
    correctAnswer: evaluation.correctAnswer,
    conceptExplanation: evaluation.conceptExplanation,
    mistakeExplanation: evaluation.mistakeExplanation,
    improvementStepsJson: JSON.stringify(evaluation.improvementSteps),
    example: evaluation.example,
    examTip: evaluation.examTip,
    translatedExplanation: evaluation.translatedExplanation,
    modelRawJson: JSON.stringify(evaluation),
    source: evaluation.source,
  });

  return NextResponse.json({
    ok: true,
    evaluation,
    xpEarned,
    progress,
  });
}
