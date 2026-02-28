import fs from "fs";
import path from "path";

export type PaperDocument = {
  filename: string;
  localPath: string;
  sourceUrl?: string | null;
};

export type PaperSeries = {
  subjectCode: string;
  subjectName: string;
  level: string;
  year: number;
  sessionCode: string;
  seasonLabel: string;
  paperNumber: number | null;
  paperCode: string;
  variantNumber: number | null;
  isCompletePair: boolean;
  syllabusAligned: boolean;
  syllabusStatus: string;
  questionPaper: PaperDocument | null;
  markScheme: PaperDocument | null;
};

export type PaperCatalog = {
  generatedAtUtc: string;
  policyVersion: string;
  maxYearFilter: number | null;
  totals: {
    documents: number;
    questionPapers: number;
    markSchemes: number;
    subjects: number;
    series: number;
    completePairs: number;
    syllabusAlignedSeries: number;
  };
  series: PaperSeries[];
  entries: unknown[];
};

const SESSION_ORDER: Record<string, number> = {
  m: 0,
  s: 1,
  w: 2,
};

const CATALOG_PATH = path.join(process.cwd(), "data", "paper_catalog.json");

export const getPaperCatalog = (): PaperCatalog | null => {
  if (!fs.existsSync(CATALOG_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
    return JSON.parse(raw) as PaperCatalog;
  } catch {
    return null;
  }
};

export const getSeriesForSubject = (
  subjectCode: string,
  options?: {
    requireCompletePair?: boolean;
    requireSyllabusAligned?: boolean;
  }
): PaperSeries[] => {
  const catalog = getPaperCatalog();
  if (!catalog) {
    return [];
  }

  const requireCompletePair = options?.requireCompletePair ?? false;
  const requireSyllabusAligned = options?.requireSyllabusAligned ?? false;

  return catalog.series
    .filter((series) => series.subjectCode === subjectCode)
    .filter((series) => (requireCompletePair ? series.isCompletePair : true))
    .filter((series) => (requireSyllabusAligned ? series.syllabusAligned : true))
    .sort((a, b) => {
      if ((a.paperNumber ?? 99) !== (b.paperNumber ?? 99)) {
        return (a.paperNumber ?? 99) - (b.paperNumber ?? 99);
      }
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return (SESSION_ORDER[a.sessionCode] ?? 99) - (SESSION_ORDER[b.sessionCode] ?? 99);
    });
};

export const getCatalogSubjectSummary = (): Array<{
  subjectCode: string;
  subjectName: string;
  totalSeries: number;
  pairedSeries: number;
  latestYear: number;
}> => {
  const catalog = getPaperCatalog();
  if (!catalog) {
    return [];
  }

  const grouped = new Map<
    string,
    {
      subjectName: string;
      totalSeries: number;
      pairedSeries: number;
      latestYear: number;
    }
  >();

  for (const series of catalog.series) {
    const current = grouped.get(series.subjectCode);
    if (!current) {
      grouped.set(series.subjectCode, {
        subjectName: series.subjectName,
        totalSeries: 1,
        pairedSeries: series.isCompletePair ? 1 : 0,
        latestYear: series.year,
      });
      continue;
    }

    current.totalSeries += 1;
    if (series.isCompletePair) {
      current.pairedSeries += 1;
    }
    if (series.year > current.latestYear) {
      current.latestYear = series.year;
    }
  }

  return Array.from(grouped.entries())
    .map(([subjectCode, values]) => ({
      subjectCode,
      subjectName: values.subjectName,
      totalSeries: values.totalSeries,
      pairedSeries: values.pairedSeries,
      latestYear: values.latestYear,
    }))
    .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
};
