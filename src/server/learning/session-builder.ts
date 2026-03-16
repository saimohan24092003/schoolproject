import { and, eq } from "drizzle-orm";

import db from "@/server/db/drizzle";
import {
  courses,
  igcsePracticeSession,
  igcseSessionQuestion,
  lessons,
  units,
} from "@/server/db/schema";

import { getQuestionMix, getTargetDifficulty, normalizeLevel } from "./difficulty-progression";
import { getSubjectName } from "./subject-catalog";
import type { PaperType, PracticeQuestionType, SubjectCode } from "./types";

type ChallengeRow = {
  id: number;
  type: "SELECT" | "ASSIST" | "THEORY";
  topic: string | null;
  question: string;
  imageSrc: string | null;
  paperRef: string | null;
  markingSchemeAnswer: string | null;
  totalMarks: number;
  challengeOptions: Array<{ text: string; correct: boolean }>;
};

type SessionQuestionPayload = {
  sourceQuestionId: number | null;
  topicName: string | null;
  questionType: PracticeQuestionType;
  questionText: string;
  marks: number;
  markingScheme: string | null;
  options: string[] | null;
  correctAnswer: string | null;
  sourcePaperRef: string | null;
  imageRefsJson: string | null;
  difficultyScore: number;
};

function parsePaperType(input: string | null | undefined): PaperType | null {
  if (!input) return null;
  const normalized = input.toUpperCase();
  const p2Hit = /\bP(?:APER)?\s*2\b/.test(normalized);
  const p4Hit = /\bP(?:APER)?\s*4\b/.test(normalized);
  if (p2Hit) return "P2";
  if (p4Hit) return "P4";
  return null;
}

function inferQuestionType(
  challenge: ChallengeRow,
  subjectCode: SubjectCode
): PracticeQuestionType {
  const text = `${challenge.question || ""} ${challenge.paperRef || ""}`.toLowerCase();
  const hasDiagram = !!challenge.imageSrc || /\bdiagram|figure|graph|table|chart\b/.test(text);
  const isNumerical =
    subjectCode === "0580" ||
    /\bcalculate|solve|equation|value|ratio|percentage|distance|speed|mass\b/.test(text);
  const isPastPaper = !!challenge.paperRef;
  const isMcq = challenge.type === "SELECT" || challenge.type === "ASSIST";

  if (hasDiagram) return "DIAGRAM";
  if (isNumerical) return "NUMERICAL";
  if (isPastPaper) return "PAST_PAPER";
  if (isMcq) return "MCQ";
  return "STRUCTURED";
}

function inferDifficultyScore(challenge: ChallengeRow): number {
  const marks = Math.max(1, Number(challenge.totalMarks || 1));
  const theoryBoost = challenge.type === "THEORY" ? 2 : 0;
  const paperBoost = challenge.paperRef ? 1 : 0;
  const imageBoost = challenge.imageSrc ? 1 : 0;
  return Math.min(10, Math.max(1, marks + theoryBoost + paperBoost + imageBoost));
}

function randomize<T>(input: T[]): T[] {
  return [...input].sort(() => Math.random() - 0.5);
}

function pickByCount<T>(pool: T[], count: number, used: Set<T>): T[] {
  if (count <= 0) return [];
  const available = pool.filter((item) => !used.has(item));
  const picked = randomize(available).slice(0, count);
  picked.forEach((item) => used.add(item));
  return picked;
}

function buildDistribution(limit: number, mix: Record<PracticeQuestionType, number>) {
  const keys = Object.keys(mix) as PracticeQuestionType[];
  const out = {} as Record<PracticeQuestionType, number>;
  let allocated = 0;

  keys.forEach((key) => {
    const count = Math.floor((limit * mix[key]) / 100);
    out[key] = count;
    allocated += count;
  });

  let remaining = limit - allocated;
  for (const key of keys) {
    if (remaining <= 0) break;
    out[key] += 1;
    remaining -= 1;
  }

  return out;
}

async function getSubjectCourseId(subjectCode: SubjectCode): Promise<number | null> {
  const subjectName = getSubjectName(subjectCode).toLowerCase();
  const allCourses = await db.query.courses.findMany({
    columns: { id: true, title: true },
  });
  const course = allCourses.find((row) => {
    const title = row.title.toLowerCase();
    return title.includes(subjectCode) || title.includes(subjectName);
  });
  return course?.id ?? null;
}

async function fetchChallengesForSubject(subjectCode: SubjectCode): Promise<ChallengeRow[]> {
  const courseId = await getSubjectCourseId(subjectCode);
  if (!courseId) return [];

  const unitRows = await db.query.units.findMany({
    where: eq(units.courseId, courseId),
    with: {
      lessons: {
        with: {
          challenges: {
            with: {
              challengeOptions: {
                columns: {
                  text: true,
                  correct: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const flattened: ChallengeRow[] = [];
  unitRows.forEach((unit) => {
    unit.lessons.forEach((lesson) => {
      lesson.challenges.forEach((challenge) => {
        flattened.push({
          id: challenge.id,
          type: challenge.type,
          topic: challenge.topic || lesson.title || unit.title,
          question: challenge.question,
          imageSrc: challenge.imageSrc,
          paperRef: challenge.paperRef,
          markingSchemeAnswer: challenge.markingSchemeAnswer,
          totalMarks: challenge.totalMarks || 1,
          challengeOptions: challenge.challengeOptions.map((opt) => ({
            text: opt.text,
            correct: opt.correct,
          })),
        });
      });
    });
  });

  return flattened;
}

export async function buildAndStartSession(params: {
  userId: string;
  subjectCode: SubjectCode;
  paperType: PaperType;
  levelNo: number;
  limit?: number;
}) {
  const levelNo = normalizeLevel(params.levelNo);
  const limit = Math.max(8, Math.min(30, params.limit || 12));
  const targetDifficulty = getTargetDifficulty(levelNo);
  const mix = getQuestionMix(levelNo);
  const distribution = buildDistribution(limit, mix);

  const allChallenges = await fetchChallengesForSubject(params.subjectCode);

  const filteredByPaper = allChallenges.filter((challenge) => {
    const parsed = parsePaperType(challenge.paperRef);
    if (!parsed) return true;
    return parsed === params.paperType;
  });

  const candidates: SessionQuestionPayload[] = filteredByPaper
    .map((challenge) => {
      const options = challenge.challengeOptions.map((opt) => opt.text);
      const correctOption = challenge.challengeOptions.find((opt) => opt.correct)?.text || null;

      return {
        sourceQuestionId: challenge.id,
        topicName: challenge.topic || null,
        questionType: inferQuestionType(challenge, params.subjectCode),
        questionText: challenge.question,
        marks: Math.max(1, challenge.totalMarks || 1),
        markingScheme: challenge.markingSchemeAnswer || null,
        options: options.length > 0 ? options : null,
        correctAnswer: correctOption,
        sourcePaperRef: challenge.paperRef || null,
        imageRefsJson: challenge.imageSrc ? JSON.stringify([challenge.imageSrc]) : null,
        difficultyScore: inferDifficultyScore(challenge),
      };
    })
    .filter((question) => Math.abs(question.difficultyScore - targetDifficulty) <= 3);

  const pool = candidates.length > 0 ? candidates : allChallenges.map((challenge) => ({
    sourceQuestionId: challenge.id,
    topicName: challenge.topic || null,
    questionType: inferQuestionType(challenge, params.subjectCode),
    questionText: challenge.question,
    marks: Math.max(1, challenge.totalMarks || 1),
    markingScheme: challenge.markingSchemeAnswer || null,
    options: challenge.challengeOptions.length ? challenge.challengeOptions.map((opt) => opt.text) : null,
    correctAnswer: challenge.challengeOptions.find((opt) => opt.correct)?.text || null,
    sourcePaperRef: challenge.paperRef || null,
    imageRefsJson: challenge.imageSrc ? JSON.stringify([challenge.imageSrc]) : null,
    difficultyScore: inferDifficultyScore(challenge),
  }));

  const used = new Set<SessionQuestionPayload>();
  const selected: SessionQuestionPayload[] = [];

  const byType = {
    MCQ: pool.filter((q) => q.questionType === "MCQ"),
    STRUCTURED: pool.filter((q) => q.questionType === "STRUCTURED"),
    DIAGRAM: pool.filter((q) => q.questionType === "DIAGRAM"),
    NUMERICAL: pool.filter((q) => q.questionType === "NUMERICAL"),
    PAST_PAPER: pool.filter((q) => q.questionType === "PAST_PAPER"),
  } as Record<PracticeQuestionType, SessionQuestionPayload[]>;

  (Object.keys(distribution) as PracticeQuestionType[]).forEach((type) => {
    selected.push(...pickByCount(byType[type], distribution[type], used));
  });

  if (selected.length < limit) {
    selected.push(...pickByCount(pool, limit - selected.length, used));
  }

  const finalQuestions = randomize(selected).slice(0, limit);

  const [session] = await db.insert(igcsePracticeSession).values({
    userId: params.userId,
    subjectCode: params.subjectCode,
    paperType: params.paperType,
    levelNo,
    status: "in_progress",
    questionMixJson: JSON.stringify(mix),
    targetDifficulty,
    totalQuestions: finalQuestions.length,
    answeredQuestions: 0,
    correctQuestions: 0,
    totalAwardedMarks: 0,
    totalMaxMarks: finalQuestions.reduce((sum, q) => sum + q.marks, 0),
  }).returning();

  if (finalQuestions.length > 0) {
    await db.insert(igcseSessionQuestion).values(
      finalQuestions.map((q) => ({
        sessionId: session.id,
        sourceQuestionId: q.sourceQuestionId,
        subjectCode: params.subjectCode,
        paperType: params.paperType,
        levelNo,
        topicName: q.topicName,
        questionType: q.questionType,
        questionText: q.questionText,
        marks: q.marks,
        markingScheme: q.markingScheme,
        optionsJson: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer,
        sourcePaperRef: q.sourcePaperRef,
        imageRefsJson: q.imageRefsJson,
        answered: false,
      }))
    );
  }

  const sessionQuestions = await db.query.igcseSessionQuestion.findMany({
    where: eq(igcseSessionQuestion.sessionId, session.id),
  });

  return {
    sessionId: session.id,
    subjectCode: params.subjectCode,
    paperType: params.paperType,
    levelNo,
    targetDifficulty,
    questionMix: mix,
    questions: sessionQuestions.map((q) => ({
      sessionQuestionId: q.id,
      sourceQuestionId: q.sourceQuestionId,
      topicName: q.topicName,
      questionType: q.questionType,
      questionText: q.questionText,
      marks: q.marks,
      options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
      sourcePaperRef: q.sourcePaperRef,
      imageRefs: q.imageRefsJson ? JSON.parse(q.imageRefsJson) : [],
    })),
  };
}
