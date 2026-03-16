"use server";

import * as fs from "fs";
import * as path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TopicInsight = {
  topic: string;
  frequency: number;       // total questions across all past papers
  priority: "HIGH" | "MEDIUM" | "LOW";
  paper2Count: number;
  paper4Count: number;
  yearsCovered: string[];
  totalYears: number;
  subject: string;
};

export type SubjectInsights = {
  subjectCode: string;
  topics: TopicInsight[];
  totalQuestions: number;
  totalPapers: number;
  yearRange: { min: string; max: string } | null;
  paper2Questions: number;
  paper4Questions: number;
  topicsByPriority: {
    HIGH: TopicInsight[];
    MEDIUM: TopicInsight[];
    LOW: TopicInsight[];
  };
  yearlyTrend: Record<string, number>;   // year → question count
};

// ── Module-level cache (per server process lifetime) ──────────────────────────

let _topicAnalysisCache: Record<string, Record<string, unknown>> | null = null;
let _theoryProgressCache: Array<{ source: string; questions: Array<{ topic?: string }> }> | null = null;

// ── Loaders ───────────────────────────────────────────────────────────────────

function loadTopicAnalysis(): Record<string, Record<string, unknown>> {
  if (_topicAnalysisCache !== null) return _topicAnalysisCache;
  try {
    const p = path.join(process.cwd(), "topic_analysis.json");
    _topicAnalysisCache = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    _topicAnalysisCache = {};
  }
  return _topicAnalysisCache!;
}

function loadTheoryProgress(): Array<{ source: string; questions: Array<{ topic?: string }> }> {
  if (_theoryProgressCache !== null) return _theoryProgressCache;
  try {
    const p = path.join(process.cwd(), "theory_seeds_progress.json");
    _theoryProgressCache = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    _theoryProgressCache = [];
  }
  return _theoryProgressCache!;
}

function parsePriority(v: unknown): "HIGH" | "MEDIUM" | "LOW" {
  if (v === "HIGH" || v === "MEDIUM" || v === "LOW") return v;
  return "LOW";
}

function getYear(source: string): string | null {
  const m = source.match(/_[msw](\d{2})_/i);
  return m ? `20${m[1]}` : null;
}

function getPaperNum(source: string): number {
  const m = source.match(/_qp_(\d)/i);
  return m ? parseInt(m[1]) : 0;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getSubjectInsights(subjectCode: string): Promise<SubjectInsights | null> {
  const analysis = loadTopicAnalysis();
  const progress = loadTheoryProgress();

  // Single pass: build sorted topics + priority buckets + total questions
  const topicsByPriority: { HIGH: TopicInsight[]; MEDIUM: TopicInsight[]; LOW: TopicInsight[] } = {
    HIGH: [], MEDIUM: [], LOW: [],
  };
  let totalQuestions = 0;

  const subjectTopics: TopicInsight[] = Object.entries(analysis)
    .filter(([, v]) => (v as Record<string, unknown>).subject === subjectCode)
    .map(([topic, v]) => {
      const d = v as Record<string, unknown>;
      return {
        topic,
        frequency:    Number(d.frequency ?? 0),
        priority:     parsePriority(d.priority),
        paper2Count:  Number(d.paper2Count ?? 0),
        paper4Count:  Number(d.paper4Count ?? 0),
        yearsCovered: Array.isArray(d.yearsCovered) ? (d.yearsCovered as string[]) : [],
        totalYears:   Number(d.totalYears ?? 0),
        subject:      subjectCode,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  if (subjectTopics.length === 0) return null;

  for (const t of subjectTopics) {
    totalQuestions += t.frequency;
    topicsByPriority[t.priority].push(t);
  }

  // Compute year-by-year question count from raw progress data (single pass)
  const yearlyTrend: Record<string, number> = {};
  let totalPapers = 0;
  let paper2Questions = 0;
  let paper4Questions = 0;
  const allYears = new Set<string>();

  for (const paper of progress) {
    if (!paper.source.startsWith(subjectCode)) continue;
    const year  = getYear(paper.source);
    const pnum  = getPaperNum(paper.source);
    const qcount = (paper.questions ?? []).length;
    totalPapers++;
    if (year) {
      yearlyTrend[year] = (yearlyTrend[year] ?? 0) + qcount;
      allYears.add(year);
    }
    if (pnum === 2) paper2Questions += qcount;
    else if (pnum === 4) paper4Questions += qcount;
  }

  const sortedYears = Array.from(allYears).sort();
  const yearRange = sortedYears.length > 0
    ? { min: sortedYears[0], max: sortedYears[sortedYears.length - 1] }
    : null;

  return {
    subjectCode,
    topics: subjectTopics,
    totalQuestions,
    totalPapers,
    yearRange,
    paper2Questions,
    paper4Questions,
    topicsByPriority,
    yearlyTrend: Object.fromEntries(Object.entries(yearlyTrend).sort()),
  };
}
