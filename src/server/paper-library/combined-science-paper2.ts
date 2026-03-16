import { and, eq, gte, lte } from "drizzle-orm";

import db from "@/server/db/drizzle";
import { examPapers } from "@/server/db/schema";
import {
  COMBINED_SCIENCE_SUBJECT_CODE,
  COMBINED_SCIENCE_SUBJECT_TITLE,
  getCombinedSciencePaper2Requirements,
  type CombinedSciencePaper2Requirement,
  type CombinedScienceSessionCode,
} from "@/lib/combined-science-paper2-plan";

type CoverageRow = CombinedSciencePaper2Requirement & {
  hasQuestionPaperInDb: boolean;
  hasMarkSchemeInDb: boolean;
  isPairedInDb: boolean;
  questionPaperId: number | null;
  markSchemeId: number | null;
  questionCountInDb: number;
};

type ParsedPaperIdentity = {
  sessionCode: CombinedScienceSessionCode | null;
  variantNumber: 1 | 2 | 3 | null;
};

const toSessionCodeFromSeason = (
  season?: string | null
): CombinedScienceSessionCode | null => {
  if (!season) return null;
  const value = season.toLowerCase().trim();
  if (value === "m" || value.includes("march") || value.includes("feb")) return "m";
  if (value === "s" || value.includes("june") || value.includes("may")) return "s";
  if (value === "w" || value.includes("nov") || value.includes("oct")) return "w";
  return null;
};

const parseJsonSafe = (raw: string): any | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toVariantNumber = (value: unknown): 1 | 2 | 3 | null => {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
};

const parseVariantFromText = (...parts: Array<string | null | undefined>): 1 | 2 | 3 | null => {
  const fullText = parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase();
  if (!fullText) return null;

  const variantTextMatch = fullText.match(/variant\s*([123])/i);
  if (variantTextMatch) return toVariantNumber(variantTextMatch[1]);

  const paperCodeMatch = fullText.match(/\b2([123])\b/);
  if (paperCodeMatch) return toVariantNumber(paperCodeMatch[1]);

  return null;
};

const parsePaperIdentity = (paper: {
  season: string;
  title: string;
  description: string | null;
  content: string;
}): ParsedPaperIdentity => {
  const content = parseJsonSafe(paper.content);
  const metadata = content && typeof content === "object" ? content.metadata ?? null : null;

  const metadataSession =
    metadata && typeof metadata === "object" ? metadata.sessionCode ?? null : null;
  const metadataVariant =
    metadata && typeof metadata === "object" ? metadata.variantNumber ?? null : null;

  const sessionCode =
    (metadataSession === "m" || metadataSession === "s" || metadataSession === "w"
      ? metadataSession
      : null) ?? toSessionCodeFromSeason(paper.season);

  const variantNumber =
    toVariantNumber(metadataVariant) ??
    parseVariantFromText(
      typeof metadata?.paperCode === "string" ? metadata.paperCode : null,
      paper.title,
      paper.description
    );

  return { sessionCode, variantNumber };
};

const extractQuestionCount = (content: string): number => {
  const parsed = parseJsonSafe(content);
  if (!parsed || typeof parsed !== "object") return 0;

  if (Array.isArray(parsed.questions)) return parsed.questions.length;
  if (Array.isArray(parsed.data)) return parsed.data.length;
  return 0;
};

const buildKey = (
  year: number,
  sessionCode: CombinedScienceSessionCode,
  variantNumber: number
) => `${year}|${sessionCode}|${variantNumber}`;

const computeCoverage = async (): Promise<CoverageRow[]> => {
  const requirements = getCombinedSciencePaper2Requirements(2017, 2025);

  const rows = await db.query.examPapers.findMany({
    where: and(
      eq(examPapers.level, "O-Level"),
      eq(examPapers.subject, COMBINED_SCIENCE_SUBJECT_TITLE),
      eq(examPapers.paperNumber, 2),
      gte(examPapers.year, 2017),
      lte(examPapers.year, 2025)
    ),
    columns: {
      id: true,
      year: true,
      season: true,
      variant: true,
      title: true,
      description: true,
      content: true,
    },
  });

  const coverageByKey = new Map<
    string,
    { questionPaperId: number | null; markSchemeId: number | null; questionCountInDb: number }
  >();

  for (const paper of rows) {
    if (paper.variant !== "qp" && paper.variant !== "ms") continue;

    const identity = parsePaperIdentity(paper);
    if (!identity.sessionCode || !identity.variantNumber) continue;

    const key = buildKey(paper.year, identity.sessionCode, identity.variantNumber);
    const current = coverageByKey.get(key) ?? {
      questionPaperId: null,
      markSchemeId: null,
      questionCountInDb: 0,
    };

    if (paper.variant === "qp" && !current.questionPaperId) {
      current.questionPaperId = paper.id;
      current.questionCountInDb = extractQuestionCount(paper.content);
    }

    if (paper.variant === "ms" && !current.markSchemeId) {
      current.markSchemeId = paper.id;
    }

    coverageByKey.set(key, current);
  }

  return requirements.map((required) => {
    const key = buildKey(required.year, required.sessionCode, required.variantNumber);
    const existing = coverageByKey.get(key);

    const hasQuestionPaperInDb = Boolean(existing?.questionPaperId);
    const hasMarkSchemeInDb = Boolean(existing?.markSchemeId);

    return {
      ...required,
      hasQuestionPaperInDb,
      hasMarkSchemeInDb,
      isPairedInDb: hasQuestionPaperInDb && hasMarkSchemeInDb,
      questionPaperId: existing?.questionPaperId ?? null,
      markSchemeId: existing?.markSchemeId ?? null,
      questionCountInDb: existing?.questionCountInDb ?? 0,
    };
  });
};

const buildPlaceholderContent = (
  requirement: CombinedSciencePaper2Requirement,
  documentType: "qp" | "ms"
) =>
  JSON.stringify({
    type: documentType === "qp" ? "MCQ" : "MS",
    questions: documentType === "qp" ? [] : undefined,
    answers: documentType === "ms" ? {} : undefined,
    metadata: {
      source: "dynamicpapers",
      sourceUrl:
        documentType === "qp"
          ? requirement.questionPaperUrl
          : requirement.markSchemeUrl,
      subjectCode: COMBINED_SCIENCE_SUBJECT_CODE,
      sessionCode: requirement.sessionCode,
      sessionLabel: requirement.sessionLabel,
      paperNumber: requirement.paperNumber,
      variantNumber: requirement.variantNumber,
      paperCode: requirement.paperCode,
      isPlaceholder: true,
      syllabusWindow: "2017-2025",
    },
  });

export const getCombinedSciencePaper2Coverage = async () => computeCoverage();

export const syncCombinedSciencePaper2CoverageToDb = async () => {
  const coverage = await computeCoverage();

  let insertedQuestionPapers = 0;
  let insertedMarkSchemes = 0;

  for (const row of coverage) {
    if (!row.hasQuestionPaperInDb) {
      await db.insert(examPapers).values({
        level: "O-Level",
        subject: COMBINED_SCIENCE_SUBJECT_TITLE,
        year: row.year,
        season: row.seasonDbValue,
        paperNumber: 2,
        variant: "qp",
        title: `${COMBINED_SCIENCE_SUBJECT_TITLE} ${row.year} ${row.sessionLabel} Paper 2 Variant ${row.variantNumber} QP`,
        description: `Catalog sync placeholder for ${row.paperCode}. Source: ${row.questionPaperUrl}`,
        content: buildPlaceholderContent(row, "qp"),
        timeLimit: 45,
        totalMarks: 40,
      });
      insertedQuestionPapers += 1;
    }

    if (!row.hasMarkSchemeInDb) {
      await db.insert(examPapers).values({
        level: "O-Level",
        subject: COMBINED_SCIENCE_SUBJECT_TITLE,
        year: row.year,
        season: row.seasonDbValue,
        paperNumber: 2,
        variant: "ms",
        title: `${COMBINED_SCIENCE_SUBJECT_TITLE} ${row.year} ${row.sessionLabel} Paper 2 Variant ${row.variantNumber} MS`,
        description: `Catalog sync placeholder for ${row.paperCode}. Source: ${row.markSchemeUrl}`,
        content: buildPlaceholderContent(row, "ms"),
        timeLimit: 45,
        totalMarks: 40,
      });
      insertedMarkSchemes += 1;
    }
  }

  const updatedCoverage = await computeCoverage();
  const pairedCount = updatedCoverage.filter((row) => row.isPairedInDb).length;

  return {
    totalRequiredRows: updatedCoverage.length,
    pairedRowsInDb: pairedCount,
    missingRowsAfterSync: updatedCoverage.length - pairedCount,
    insertedQuestionPapers,
    insertedMarkSchemes,
  };
};
