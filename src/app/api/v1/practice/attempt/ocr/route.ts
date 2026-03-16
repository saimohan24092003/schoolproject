export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import { igcseAiFeedback, igcsePracticeSession, igcseSessionQuestion } from "@/server/db/schema";
import { extractTextWithGeminiOcr } from "@/server/ai/gemini-adapters";
import { runOcrEvaluationPipeline } from "@/server/ai/ocr-pipeline";
import { computeXpForAttempt, evaluateSessionQuestionAnswer } from "@/server/learning/attempt-evaluator";
import { persistAttemptAndUpdateProgress } from "@/server/learning/progress-tracker";

function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const sessionId = Number(formData.get("sessionId"));
  const sessionQuestionId = Number(formData.get("sessionQuestionId"));
  const timeTakenSeconds = Number(formData.get("timeTakenSeconds") || 0);
  const hintCount = Number(formData.get("hintCount") || 0);
  const preferredLanguage = String(formData.get("preferredLanguage") || "en");
  const file = formData.get("file");

  if (!sessionId || !sessionQuestionId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "sessionId, sessionQuestionId and file are required" },
      { status: 400 }
    );
  }

  const session = await db.query.igcsePracticeSession.findFirst({
    where: and(
      eq(igcsePracticeSession.id, sessionId),
      eq(igcsePracticeSession.userId, userId)
    ),
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const question = await db.query.igcseSessionQuestion.findFirst({
    where: and(
      eq(igcseSessionQuestion.id, sessionQuestionId),
      eq(igcseSessionQuestion.sessionId, sessionId)
    ),
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const mimeType = resolveMimeType(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  const ocrResult = await runOcrEvaluationPipeline(
    {
      fileBuffer: buffer,
      mimeType,
      evaluationInput: {
        subjectName: session.subjectCode,
        question: question.questionText,
        markingScheme: question.markingScheme || "",
        maxMarks: Math.max(1, Number(question.marks || 1)),
        preferredLanguage,
      },
    },
    extractTextWithGeminiOcr,
    async (payload) =>
      evaluateSessionQuestionAnswer({
        question: {
          subjectCode: question.subjectCode,
          questionText: question.questionText,
          markingScheme: question.markingScheme,
          marks: question.marks,
          optionsJson: question.optionsJson,
          correctAnswer: question.correctAnswer,
        },
        answer: payload.studentAnswer,
        preferredLanguage: payload.preferredLanguage,
      })
  );

  const evaluation = ocrResult.evaluation;
  const xpEarned = computeXpForAttempt(session.levelNo, evaluation.isCorrect, Math.max(0, hintCount));

  const progress = await persistAttemptAndUpdateProgress({
    userId,
    sessionId,
    sessionQuestionId,
    answerType: "handwritten",
    ocrText: ocrResult.ocrText,
    awardedMarks: evaluation.awardedMarks,
    maxMarks: evaluation.maxMarks,
    isCorrect: evaluation.isCorrect,
    timeTakenSeconds: Math.max(0, timeTakenSeconds),
    hintCount: Math.max(0, hintCount),
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
    modelRawJson: JSON.stringify({
      ...evaluation,
      ocrConfidence: ocrResult.ocrConfidence,
      ocrText: ocrResult.ocrText,
    }),
    source: evaluation.source,
  });

  return NextResponse.json({
    ok: true,
    ocrText: ocrResult.ocrText,
    ocrConfidence: ocrResult.ocrConfidence,
    evaluation,
    xpEarned,
    progress,
  });
}
