"use server";

import { auth } from "@clerk/nextjs/server";
import db from "@/server/db/drizzle";
import { examPapers, userProgress, examSessions, gradeHistory, courses, units, lessons, challenges, challengeOptions, userSubscription, attemptLogs, challengeProgress, userTopicSetup } from "@/server/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getQuestionExplanation, getSessionFeedback } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import {
  cleanMarkSchemeForDisplay,
  evaluateTheoryByMarkScheme,
  getGradeFromPercentage,
  isLikelyHintCopyAnswer,
} from "@/lib/marking-scheme";
import { hasResourceReference, resolveQuestionImageSrc } from "@/lib/resource-fallback";
import {
  normalize0653Topic,
  infer0653TopicFromQuestion,
  isOfficial0653Topic,
  OFFICIAL_0653_TOPICS_2025_2027,
} from "@/lib/syllabus/combined-science-2025";
import { getSubjectConfig } from "@/lib/subject-config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const normalizeSubjectName = (value: string) =>
  value.toLowerCase().replace(/\(\d{4}\)/g, "").replace(/\s+/g, " ").trim();

const subjectMatches = (courseTitle: string, subject: string) => {
  const a = normalizeSubjectName(courseTitle);
  const b = normalizeSubjectName(subject);
  return a === b || a.includes(b) || b.includes(a);
};

const isCombinedScience0653 = (subject: string) =>
  normalizeSubjectName(subject).includes("combined science");

const normalizeTopicForSubject = (subject: string, topic?: string | null) => {
  if (!topic) return "";
  if (!isCombinedScience0653(subject)) return topic.trim();
  const normalized = normalize0653Topic(topic);
  return isOfficial0653Topic(normalized) ? normalized : "";
};

const inferTopicForSubject = (subject: string, questionText: string, topic?: string | null) => {
  if (!isCombinedScience0653(subject)) {
    return (topic || "").trim();
  }
  const inferred = infer0653TopicFromQuestion(questionText, topic);
  return isOfficial0653Topic(inferred) ? inferred : "";
};

type TopicPriority = "HIGH" | "MEDIUM" | "LOW";

type SmartPracticeTopicCatalogItem = {
  name: string;
  count: number;
  roadmap: boolean;
  priority: TopicPriority;
  frequency: number;
  unitTitle?: string;
  coveredInSchool?: boolean;
  practiceMode?: "learn" | "review" | "hidden";
  paperCounts?: Record<number, number>;
};

const priorityRank: Record<TopicPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

type TopicCountRecord = {
  total: number;
  perPaper: Record<number, number>;
};

const normalizeForPriorityLookup = (subject: string, topic: string) => {
  if (!topic) return "";
  if (!isCombinedScience0653(subject)) return topic.trim();
  return normalize0653Topic(topic);
};

const loadTopicAnalysis = (): Record<string, { priority: string; frequency: number }> => {
  try {
    const analysisPath = path.join(process.cwd(), "topic_analysis.json");
    if (!fs.existsSync(analysisPath)) return {};
    return JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
  } catch {
    return {};
  }
};

const parsePriority = (value?: string): TopicPriority => {
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") return value;
  return "LOW";
};

/**
 * Get all available topics for a subject across all years
 */
export async function getTopicsForSubject(subject: string, level: string = "O-Level") {
  const topicCounts: Record<string, TopicCountRecord> = {};

  const incrementTopic = (name: string, paperNumber?: number) => {
    if (!name) return;
    if (!topicCounts[name]) {
      topicCounts[name] = { total: 0, perPaper: {} };
    }
    const record = topicCounts[name];
    record.total += 1;
    if (typeof paperNumber === "number") {
      record.perPaper[paperNumber] = (record.perPaper[paperNumber] || 0) + 1;
    }
  };

  // 1. Try exam_papers (MCQ subjects like Combined Science)
  const papers = await db.query.examPapers.findMany({
    where: and(eq(examPapers.subject, subject), eq(examPapers.level, level)),
  });

  if (papers.length > 0) {
    papers.forEach(paper => {
      try {
        const content = JSON.parse(paper.content);
        const qs = content.questions || (content.data && content.type === "MCQ" ? content.data : []);
        if (Array.isArray(qs)) {
          qs.forEach((q: any) => {
            const inferenceText = [q.text || q.question || "", ...(Array.isArray(q.options) ? q.options : [])].join(" ");
            const normalizedTopic = inferTopicForSubject(subject, inferenceText, q.topic);
            if (normalizedTopic) {
              const maybeNumber = typeof paper.paperNumber === "number"
                ? paper.paperNumber
                : Number(paper.paperNumber);
              incrementTopic(normalizedTopic, Number.isFinite(maybeNumber) ? maybeNumber : undefined);
            }
          });
        }
      } catch (e) {}
    });
  }

  // 2. Also check challenges table (Theory/Practical questions are often here even for MCQ subjects)
  // And for subjects like 0580/0680, this is the primary source.
  const allCourses = await db.query.courses.findMany();
  const course = allCourses.find(c => subjectMatches(c.title, subject));
  if (course) {
    const courseUnits = await db.query.units.findMany({
      where: eq(units.courseId, course.id),
      with: { lessons: { with: { challenges: true } } },
    });
    courseUnits.forEach(unit =>
      unit.lessons.forEach(lesson =>
        lesson.challenges.forEach(ch => {
          // Use challenge's topic field; fall back to lesson title so English/Maths topics always show
          const rawTopic = ch.topic || lesson.title || "";
          const normalizedTopic = inferTopicForSubject(subject, ch.question || "", rawTopic);
          if (normalizedTopic) {
            // Try to extract paper number from paperRef (e.g. "Paper 2 | March 2024")
            let paperNum: number | undefined = undefined;
            if (ch.paperRef) {
              const match = ch.paperRef.match(/Paper\s+(\d+)/i);
              if (match) {
                paperNum = parseInt(match[1], 10);
              }
            }
            incrementTopic(normalizedTopic, paperNum);
          }
        })
      )
    );
  }

  // Keep output syllabus-aligned for Combined Science (0653).
  if (isCombinedScience0653(subject)) {
    const officialTopics = [
      ...OFFICIAL_0653_TOPICS_2025_2027.biology,
      ...OFFICIAL_0653_TOPICS_2025_2027.chemistry,
      ...OFFICIAL_0653_TOPICS_2025_2027.physics,
    ];
    officialTopics.forEach((topic) => {
      if (topicCounts[topic]) return;
      topicCounts[topic] = { total: 0, perPaper: {} };
    });
  }

  return Object.entries(topicCounts)
    .map(([name, record]) => ({ name, count: record.total, perPaper: record.perPaper }))
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Build smart-practice topic catalog — A*-focused, personalized by covered topics.
 *
 * Ordering logic:
 *   1. LEARN topics (not covered in school) — sorted by past-paper frequency DESC
 *   2. REVIEW topics (covered in school, practiceMode=all) — sorted by frequency DESC
 *   Topics covered in school are hidden when practiceMode=new_only.
 *
 * This ensures students focus on high-yield uncovered topics first (fastest path to A*).
 */
export async function getSmartPracticeTopicCatalog(
  subject: string,
  level: string = "O-Level",
  userId?: string
): Promise<SmartPracticeTopicCatalogItem[]> {
  const topicCounts = await getTopicsForSubject(subject, level);
  const countByTopic = new Map<string, number>(topicCounts.map((topic) => [topic.name, topic.count]));
  const paperCountsByTopic = new Map<string, Record<number, number>>(
    topicCounts.map((topic) => [topic.name, topic.perPaper])
  );

  // ── Load student's covered topics + practice preference ──────────────────
  const subjectCode = subject.match(/\((\d{4})\)/)?.[1]
    ?? (subject.match(/^\d{4}$/) ? subject : null);

  let coveredSet = new Set<string>();
  let practiceMode: "all" | "new_only" = "all";

  if (userId && subjectCode) {
    const setup = await db.query.userTopicSetup.findFirst({
      where: and(
        eq(userTopicSetup.userId, userId),
        eq(userTopicSetup.subjectCode, subjectCode)
      ),
    });
    if (setup) {
      try {
        const parsed = JSON.parse(setup.coveredTopics as string);
        if (Array.isArray(parsed)) coveredSet = new Set(parsed);
      } catch { /* ignore */ }
      practiceMode = (setup.practiceMode as "all" | "new_only") || "all";
    }
  }

  // ── Build roadmap from course lessons ───────────────────────────────────
  const allCourses = await db.query.courses.findMany();
  const course = allCourses.find((c) => subjectMatches(c.title, subject));

  const roadmapTopics: Array<{ name: string; unitTitle?: string }> = [];
  if (course) {
    const courseUnits = await db.query.units.findMany({
      where: eq(units.courseId, course.id),
      orderBy: (rows, { asc }) => [asc(rows.order)],
      with: {
        lessons: {
          orderBy: (rows, { asc }) => [asc(rows.order)],
          columns: { title: true },
        },
      },
    });
    courseUnits.forEach((unit) => {
      unit.lessons.forEach((lesson) => {
        const normalized = normalizeTopicForSubject(subject, lesson.title) || lesson.title;
        if (!normalized) return;
        roadmapTopics.push({ name: normalized, unitTitle: unit.title });
      });
    });
  }

  // ── Load static topic analysis (frequency / priority) ──────────────────
  const analysis = loadTopicAnalysis();
  const normalizedAnalysis = new Map<string, { priority: TopicPriority; frequency: number }>();
  Object.entries(analysis).forEach(([topicName, details]) => {
    normalizedAnalysis.set(
      normalizeForPriorityLookup(subject, topicName),
      { priority: parsePriority(details?.priority), frequency: Number(details?.frequency || 0) }
    );
  });

  // ── Merge into catalog ──────────────────────────────────────────────────
  const merged = new Map<string, SmartPracticeTopicCatalogItem>();

  const upsert = (name: string, roadmap: boolean, unitTitle?: string) => {
    const normalized = normalizeTopicForSubject(subject, name) || name;
    const lookupKey = normalizeForPriorityLookup(subject, normalized);
    const analysisDetails = normalizedAnalysis.get(lookupKey);

    // Check if topic matches a covered topic (fuzzy match — tolerate minor casing/spacing)
    const normalizedLower = normalized.toLowerCase().trim();
    const isCovered = coveredSet.size > 0 && (
      coveredSet.has(normalized) ||
      Array.from(coveredSet).some(c => c.toLowerCase().trim() === normalizedLower)
    );

    const existing = merged.get(normalized);

    const paperCountsForTopic = paperCountsByTopic.get(normalized) ?? {};

    // Use DB question count as frequency if static analysis has nothing
    const dbCount = countByTopic.get(normalized) || existing?.count || 0;
    const staticFreq = analysisDetails?.frequency ?? existing?.frequency ?? 0;
    const effectiveFrequency = staticFreq > 0 ? staticFreq : dbCount;

    // Priority: boost uncovered high-freq topics to HIGH automatically
    let priority = analysisDetails?.priority || existing?.priority || "LOW";
    if (!isCovered && dbCount >= 10) priority = "HIGH";
    else if (!isCovered && dbCount >= 5) priority = priority === "LOW" ? "MEDIUM" : priority;

    const pMode: "learn" | "review" | "hidden" = isCovered
      ? (practiceMode === "new_only" ? "hidden" : "review")
      : "learn";

    const next: SmartPracticeTopicCatalogItem = {
      name: normalized,
      count: dbCount,
      roadmap: roadmap || existing?.roadmap || false,
      priority,
      frequency: effectiveFrequency,
      unitTitle: existing?.unitTitle || unitTitle,
      coveredInSchool: isCovered,
      practiceMode: pMode,
      paperCounts: paperCountsForTopic,
    };
    merged.set(normalized, next);
  };

  roadmapTopics.forEach((topic) => upsert(topic.name, true, topic.unitTitle));
  topicCounts.forEach((topic) => upsert(topic.name, false));

  // ── Sort: A* priority order ─────────────────────────────────────────────
  // 1. LEARN topics first (not covered), sorted by frequency/count DESC
  // 2. REVIEW topics last (covered in school), sorted by frequency DESC
  // 3. HIDDEN topics excluded
  return Array.from(merged.values())
    .filter(t => t.practiceMode !== "hidden")
    .sort((a, b) => {
      const aModeRank = a.practiceMode === "learn" ? 0 : 1;
      const bModeRank = b.practiceMode === "learn" ? 0 : 1;
      if (aModeRank !== bModeRank) return aModeRank - bModeRank;

      // Within same mode: roadmap first, then high priority, then count
      if (a.roadmap !== b.roadmap) return a.roadmap ? -1 : 1;
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[b.priority] - priorityRank[a.priority];
      }
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Generate a smart practice session for a specific topic
 */
export async function generateSmartPractice(
  subject: string,
  topic: string,
  limit: number = 10,
  level?: number,
  paperType?: "P2" | "P4" | "P6"
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const normalizedRequestedTopic = normalizeTopicForSubject(subject, topic) || topic;
  const normalizedPaperType = paperType?.toUpperCase();

  // Build a text index so exam-paper questions can still map to challenge IDs
  // for attempt tracking and hint-lock behavior.
  const challengeRows = await db.query.challenges.findMany({
    columns: { id: true, question: true },
  });
  const challengeIdByQuestion = new Map<string, number>();
  challengeRows.forEach((row) => {
    const key = row.question.trim().toLowerCase();
    if (!challengeIdByQuestion.has(key)) {
      challengeIdByQuestion.set(key, row.id);
    }
  });

  // Get all papers for this subject
  const papers = await db.query.examPapers.findMany({
    where: eq(examPapers.subject, subject),
  });

  let allQuestions: any[] = [];

  // Extract questions matching the topic
  const seenQuestions = new Set<string>();
  
  papers.forEach(paper => {
    try {
      const content = JSON.parse(paper.content);
      const questionsArray = content.questions || (content.data && content.type === "MCQ" ? content.data : []);
      if (Array.isArray(questionsArray)) {
        questionsArray.forEach((q: any) => {
          const questionKey = q.text?.trim().toLowerCase();
          if (!questionKey || seenQuestions.has(questionKey)) return;
          const inferenceText = [q.text || q.question || "", ...(Array.isArray(q.options) ? q.options : [])].join(" ");
          const normalizedTopic = inferTopicForSubject(subject, inferenceText, q.topic);
          if (!normalizedTopic) return;
          if (normalizedTopic === normalizedRequestedTopic || normalizedTopic.includes(normalizedRequestedTopic)) {
            seenQuestions.add(questionKey);
            const questionText = q.text || q.question || "";
            const fallbackImage =
              resolveQuestionImageSrc(q.imageSrc || null, questionText, {
                subject,
                year: paper.year,
                season: paper.season,
                paperNumber: paper.paperNumber,
                variant: paper.variant,
              });
            if (hasResourceReference(questionText) && !fallbackImage) return;
            allQuestions.push({
              challengeId: challengeIdByQuestion.get(questionKey),
              ...q,
              paperType:
                typeof q.paperType === "string"
                  ? q.paperType.toUpperCase()
                  : paper.paperNumber
                    ? `P${paper.paperNumber}`
                    : undefined,
              imageSrc: fallbackImage,
              topic: normalizedTopic,
              questionType: "MCQ",
              sourcePaper: `${paper.year} ${paper.season} - P${paper.paperNumber}`,
              paperId: paper.id
            });
          }
        });
      }
    } catch (e) {}
  });

  // Determine subject config early — needed to decide which sources to fetch
  const subjectCodeMatch = subject.match(/\b(\d{4})\b/);
  const subjectCodeStr = subjectCodeMatch?.[1] ?? "";
  const subjectCfg = subjectCodeStr ? getSubjectConfig(subjectCodeStr) : null;

  // Fetch challenges table:
  //   - Non-MCQ subjects (0680/0580/0500): always — it is the primary source
  //   - MCQ subjects (0653) at level 3: need THEORY challenges for the Advanced level
  //   - Fallback when examPapers returned nothing at all
  const needsChallenges = allQuestions.length === 0 || (subjectCfg?.hasMCQ && level === 3);
  if (needsChallenges) {
    const theoryBatch: any[] = [];
    const allCourses = await db.query.courses.findMany();
    const course = allCourses.find(c => subjectMatches(c.title, subject));
    if (course) {
      const courseUnits = await db.query.units.findMany({
        where: eq(units.courseId, course.id),
        with: { lessons: { with: { challenges: { with: { challengeOptions: true } } } } },
      });
      courseUnits.forEach(unit =>
        unit.lessons.forEach(lesson =>
          lesson.challenges.forEach(ch => {
            const questionKey = (ch.question ?? "").trim().toLowerCase();
            if (!questionKey) return;
            if (seenQuestions.has(questionKey)) return;
            // Fall back to lesson.title when ch.topic is empty — mirrors getTopicsForSubject
            const rawTopic = ch.topic || lesson.title || "";
            const normalizedTopic = inferTopicForSubject(subject, ch.question || "", rawTopic);
            if (!normalizedTopic) return;
            if (normalizedTopic === normalizedRequestedTopic || normalizedTopic.includes(normalizedRequestedTopic)) {
              const isMCQ = ch.challengeOptions?.length > 0;
              const resolvedImage = resolveQuestionImageSrc(ch.imageSrc || null, ch.question || "", {
                subject,
              });
              // For THEORY challenges, do NOT pre-filter on resource references —
              // EM/0580/0500 questions commonly say "study the table" as part of the question
              // text itself (not an external image). The post-filter + graceful fallback handles it.
              if (isMCQ && hasResourceReference(ch.question || "") && !resolvedImage) return;
              seenQuestions.add(questionKey);

              let chPaperType: string | undefined = undefined;
              if (ch.paperRef) {
                const match = ch.paperRef.match(/Paper\s+(\d+)/i);
                if (match) chPaperType = `P${match[1]}`;
              }

              theoryBatch.push({
                id: ch.id,
                challengeId: ch.id,
                number: ch.order,
                text: ch.question,
                imageSrc: resolvedImage,
                topic: normalizedTopic,
                marks: ch.totalMarks,
                markingSchemeAnswer: ch.markingSchemeAnswer,
                questionType: isMCQ ? "MCQ" : "THEORY",
                paperType: chPaperType,
                options: isMCQ ? ch.challengeOptions.map(o => o.text) : undefined,
                correctAnswer: isMCQ ? ch.challengeOptions.findIndex(o => o.correct) : undefined,
                sourcePaper: ch.paperRef || `${unit.title} · ${lesson.title}`,
                audioSrc: ch.audioSrc ?? undefined,
              });
            }
          })
        )
      );
    }

    if (subjectCfg?.hasMCQ && level === 3) {
      // 0653 Level 3 (Advanced): use theory challenges; fall back to MCQ only if none exist yet
      if (theoryBatch.length > 0) allQuestions = theoryBatch;
    } else {
      // Non-MCQ subjects or empty-examPapers fallback
      allQuestions = theoryBatch;
    }
  }

  // Filter by level
  let filtered = allQuestions;
  if (subjectCfg && !subjectCfg.hasMCQ && level) {
    // Non-MCQ subject (0580 / 0500 / 0680): force all THEORY, filter by mark range
    filtered = allQuestions.map(q => ({ ...q, questionType: "THEORY" }));
    const levelCfg = subjectCfg.levels.find(l => l.level === level);
    if (levelCfg?.markRange) {
      const [minM, maxM] = levelCfg.markRange;
      const byMark = filtered.filter(q => {
        const m = Number(q.marks) || 1;
        return m >= minM && m <= maxM;
      });
      if (byMark.length >= 3) filtered = byMark;
    }
  } else if (level === 3) {
    filtered = allQuestions.filter(q => q.questionType === "THEORY");
    if (filtered.length === 0) filtered = allQuestions; // fallback
  } else if (level === 1 || level === 2) {
    filtered = allQuestions.filter(q => q.questionType === "MCQ");
    if (filtered.length === 0) filtered = allQuestions; // fallback
  }

  // Paper filter (P2 / P4 / P6)
  if (normalizedPaperType) {
    filtered = filtered.filter((q) => q.paperType === normalizedPaperType);
  }

  // Content quality filters
  const is0500 = /\b0500\b/.test(subject);

  // 1. Remove passage-dependent questions (0500 only) — they need unseen passage context
  if (is0500) {
    const passageRef = /\bline(s)?\s+\d+/i;
    const passageWord = /\bthe\s+passage\b/i;
    const beforeFiltered = filtered.length;
    filtered = filtered.filter(q => {
      const text = (q.text || "") + " " + (q.markingSchemeAnswer || "");
      return !passageRef.test(text) && !passageWord.test(text);
    });
    if (filtered.length === 0) filtered = [...allQuestions].slice(0, limit * 2); // graceful fallback
  }

  // 2. Remove broken-image questions (questions referencing a figure/diagram but no imageSrc)
  const figureRef = /\b(fig\.?|figure|diagram|table|graph|chart)\b/i;
  filtered = filtered.filter(q => {
    if (!q.imageSrc && figureRef.test(q.text || "")) return false;
    return true;
  });
  if (filtered.length === 0) filtered = allQuestions; // graceful fallback

  // 3. Remove garbled questions from PDFs with broken font encoding (cid: codes)
  filtered = filtered.filter(q => {
    const text = q.text || "";
    const cidCount = text.split("(cid:").length - 1;
    if (cidCount >= 10) return false; // heavily garbled
    // Filter out instruction text false-positives
    if (/You must answer on the question paper|No additional materials|INSTRUCTIONS/.test(text)) return false;
    return true;
  });
  if (filtered.length === 0) filtered = allQuestions; // graceful fallback

  const shuffled = filtered.sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, limit).map(q => ({
    ...q,
    markingSchemeAnswer: q.markingSchemeAnswer
      ? cleanMarkSchemeForDisplay(q.markingSchemeAnswer)
      : q.markingSchemeAnswer,
  }));
  const sessionType = selectedQuestions.some(q => q.questionType === "THEORY") ? "THEORY" : "MCQ";

  return {
    id: `smart-${Date.now()}`,
    title: `Topic Master: ${normalizedRequestedTopic}`,
    subject,
    topic: normalizedRequestedTopic,
    questionCount: selectedQuestions.length,
    questions: selectedQuestions,
    type: "SMART_PRACTICE",
    sessionType,
  };
}

/**
 * Get AI-generated study advice based on user's past performance
 */
export async function getAIStudyAdvice(subject: string) {
  const { userId } = auth();
  if (!userId) return null;

  // Get user's exam history for this subject
  const history = await db.query.examSessions.findMany({
    where: eq(examSessions.userId, userId),
    with: {
      examPaper: true,
      aiGradings: true,
    },
    limit: 20,
  });

  const subjectHistory = history.filter(h => h.examPaper.subject === subject);
  
  // Extract topics the user struggled with
  const weakTopics: Record<string, number> = {};
  
  subjectHistory.forEach(session => {
    try {
      const content = JSON.parse(session.examPaper.content);
      const questions = content.questions || content.data || [];
      
      // If we have AI gradings, use them
      if (session.aiGradings && session.aiGradings.length > 0) {
        session.aiGradings.forEach(grade => {
          if (grade.awardedMarks < grade.maxMarks) {
            const q = questions.find((item: any) => item.number === grade.questionNumber);
            const normalizedTopic = inferTopicForSubject(
              subject,
              q?.text || q?.question || "",
              q?.topic
            );
            if (normalizedTopic) {
              weakTopics[normalizedTopic] =
                (weakTopics[normalizedTopic] || 0) + (grade.maxMarks - grade.awardedMarks);
            }
          }
        });
      }
    } catch (e) {}
  });

  const topWeakTopics = Object.entries(weakTopics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    You are an AI Study Advisor for Cambridge O-Level.
    Subject: ${subject}
    Recent Scores: ${JSON.stringify(subjectHistory.map(h => h.percentage))}%
    Weak Topics Identified from Mistakes: ${JSON.stringify(topWeakTopics)}
    
    Task:
    1. Analyze the student's progress in "${subject}". 
    2. Identify specific strengths and weaknesses.
    3. Recommend 3 specific chapters they MUST study to reach an A*. Use the identified weak topics if available.
    4. Provide a 1-sentence "Motivation Booster" that is specific to ${subject}.
    
    Format: Return ONLY a clean JSON object: {"analysis": "...", "focusTopics": ["Chapter 1", "Chapter 2", "Chapter 3"], "motivation": "..."}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Advisor Error:", error);
    const highYieldDefaults: Record<string, string[]> = {
      "Combined Science (0653)": ["P1. Motion, forces and energy", "C11. Organic chemistry", "B5. Enzymes"],
      "Physics": ["P1. Motion, forces and energy", "P3. Waves", "P4. Electricity"],
      "Chemistry": ["C2. Atoms, elements and compounds", "C11. Organic chemistry", "C7. Acids, bases and salts"],
      "Biology": ["B2. Cells", "B4. Enzymes", "B5. Plant nutrition"],
    };

    const fallbackTopics = topWeakTopics.length > 0 
      ? topWeakTopics 
      : (highYieldDefaults[subject] || ["B1. Characteristics", "C1. Atomic Structure", "P1. Motion"]);

    return {
      analysis: `We're having trouble reaching the AI advisor (Error: ${error.message || 'Unknown'}). However, based on our analysis of past papers, these are the highest-yield topics you should master first.`,
      focusTopics: fallbackTopics,
      motivation: `Keep practicing! Consistency is the most important factor in reaching your A* target.`
    };
  }
}

/**
 * Generate a full 40-question mock exam using historical important questions
 */
export async function generateMockExam(subject: string = "Combined Science (0653)") {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  type MockCandidate = {
    challengeId?: number;
    imageSrc?: string | null;
    question: string;
    options: string[];
    correctLetter: string | null;
    markingSchemeAnswer?: string | null;
    marks: number;
    topic: string;
    questionType: "MCQ" | "THEORY";
    year?: number;
    season?: string;
    paperNumber?: number;
    variant?: string;
  };

  const getLetterByIndex = (index: number) => String.fromCharCode(65 + index);
  const stripOptionPrefix = (value: string) => value.replace(/^\s*[A-D][\):.\-\s]+/i, "").trim();
  const getLetterFromOptionText = (value: string) => {
    const m = value.match(/^\s*([A-D])[\):.\-\s]/i);
    return m ? m[1].toUpperCase() : null;
  };
  const normalizeCorrectLetter = (raw: unknown, options: string[]): string | null => {
    if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < options.length) {
      return getLetterByIndex(raw);
    }
    const value = String(raw ?? "").trim();
    if (!value) return null;
    if (/^[A-D]$/i.test(value)) return value.toUpperCase();

    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed < options.length) {
      return getLetterByIndex(parsed);
    }

    const normalizedValue = stripOptionPrefix(value).toLowerCase();
    const index = options.findIndex((option) => stripOptionPrefix(option).toLowerCase() === normalizedValue);
    if (index >= 0) return getLetterByIndex(index);

    const letter = getLetterFromOptionText(value);
    return letter && /^[A-D]$/.test(letter) ? letter : null;
  };

  const extractQuestionText = (q: any) =>
    String(q?.text || q?.question || q?.questionText || q?.stem || "").trim();

  const extractOptions = (q: any): string[] => {
    if (!Array.isArray(q?.options)) return [];
    return q.options
      .map((option: any) => {
        if (typeof option === "string") return option;
        if (option && typeof option === "object") {
          return String(option.text || option.option || option.label || "").trim();
        }
        return String(option ?? "").trim();
      })
      .filter((value: string) => !!value);
  };

  const seenQuestions = new Set<string>();
  const registerCandidate = (candidate: MockCandidate, list: MockCandidate[]) => {
    const key = candidate.question.trim().toLowerCase();
    if (!key || seenQuestions.has(key)) return;
    seenQuestions.add(key);
    list.push(candidate);
  };

  const allChallenges = await db.query.challenges.findMany({
    with: {
      challengeOptions: true,
      lesson: { with: { unit: { with: { course: true } } } }
    }
  });

  // Filter by active subject
  const validQuestions = allChallenges.filter((challenge) =>
    subjectMatches(challenge.lesson?.unit?.course?.title || "", subject)
  );

  const mcqCandidates: MockCandidate[] = [];
  const theoryCandidates: MockCandidate[] = [];

  validQuestions.forEach((challenge) => {
    const questionText = (challenge.question || "").trim();
    if (!questionText) return;

    const options = (challenge.challengeOptions || []).map((o) => o.text);
    const resolvedImage = resolveQuestionImageSrc(challenge.imageSrc || null, questionText, {
      subject,
    });
    if (hasResourceReference(questionText) && !resolvedImage) return;
    const inferenceText = [questionText, ...options].join(" ");
    const normalizedTopic =
      inferTopicForSubject(subject, inferenceText, challenge.topic) ||
      normalizeTopicForSubject(subject, challenge.topic) ||
      challenge.topic ||
      "General";
    const correctOptionIndex = (challenge.challengeOptions || []).findIndex((o) => o.correct);
    const correctOption = correctOptionIndex >= 0 ? options[correctOptionIndex] : "";
    const correctLetter =
      getLetterFromOptionText(correctOption) ||
      (correctOptionIndex >= 0 ? getLetterByIndex(correctOptionIndex) : null);

    if (options.length > 0 && correctLetter) {
      registerCandidate(
        {
          challengeId: challenge.id,
          imageSrc: resolvedImage,
          question: questionText,
          options,
          correctLetter,
          markingSchemeAnswer: challenge.markingSchemeAnswer,
          marks: Math.max(1, Number(challenge.totalMarks || 1)),
          topic: normalizedTopic,
          questionType: "MCQ",
        },
        mcqCandidates
      );
      return;
    }

    registerCandidate(
      {
        challengeId: challenge.id,
        imageSrc: resolvedImage,
        question: questionText,
        options: [],
        correctLetter: null,
        markingSchemeAnswer: challenge.markingSchemeAnswer,
        marks: Math.max(1, Number(challenge.totalMarks || 1)),
        topic: normalizedTopic,
        questionType: "THEORY",
      },
      theoryCandidates
    );
  });

  // Fallback: source MCQs directly from exam_papers bank (critical when challenges are sparse).
  if (mcqCandidates.length < 40) {
    let paperRows = await db.query.examPapers.findMany({
      where: and(
        eq(examPapers.subject, subject),
        eq(examPapers.level, "O-Level")
      ),
      columns: {
        id: true,
        subject: true,
        year: true,
        season: true,
        paperNumber: true,
        variant: true,
        content: true,
      },
    });

    if (paperRows.length === 0) {
      const allRows = await db.query.examPapers.findMany({
        where: eq(examPapers.level, "O-Level"),
        columns: {
          id: true,
          subject: true,
          year: true,
          season: true,
          paperNumber: true,
          variant: true,
          content: true,
        },
      });
      paperRows = allRows.filter((paper) => subjectMatches(paper.subject, subject));
    }

    paperRows.forEach((paper) => {
      try {
        const content = JSON.parse(paper.content || "{}");
        const rawQuestions = Array.isArray(content.questions)
          ? content.questions
          : Array.isArray(content.data)
            ? content.data
            : [];
        if (!Array.isArray(rawQuestions)) return;

        rawQuestions.forEach((q: any) => {
          const questionText = extractQuestionText(q);
          const options = extractOptions(q);
          if (!questionText || options.length === 0) return;
          const resolvedImage = resolveQuestionImageSrc(q.imageSrc || null, questionText, {
            subject,
            year: paper.year,
            season: paper.season,
            paperNumber: paper.paperNumber,
            variant: paper.variant,
          });
          if (hasResourceReference(questionText) && !resolvedImage) return;

          const rawCorrect =
            q.correctAnswer ??
            q.answer ??
            q.correct ??
            q.a ??
            q.correctOption ??
            q.correct_option ??
            q.correctIndex ??
            q.correct_index;
          const correctLetter = normalizeCorrectLetter(rawCorrect, options);
          if (!correctLetter) return;

          const inferenceText = [questionText, ...options].join(" ");
          const topic =
            inferTopicForSubject(subject, inferenceText, q.topic) ||
            normalizeTopicForSubject(subject, q.topic) ||
            q.topic ||
            "General";

          registerCandidate(
            {
              question: questionText,
              options,
              correctLetter,
              imageSrc: resolvedImage,
              markingSchemeAnswer: q.markingSchemeAnswer || null,
              marks: Math.max(1, Number(q.marks || 1)),
              topic,
              questionType: "MCQ",
              year: paper.year,
              season: paper.season,
              paperNumber: paper.paperNumber,
              variant: paper.variant,
            },
            mcqCandidates
          );
        });
      } catch {
        // Ignore malformed paper content and continue.
      }
    });
  }

  const hasUsableMcq = mcqCandidates.length > 0;
  const candidatePool = hasUsableMcq ? mcqCandidates : theoryCandidates;
  if (candidatePool.length === 0) return null;
  const questionType: "MCQ" | "THEORY" = hasUsableMcq ? "MCQ" : "THEORY";

  const progress = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
  });
  const avgScore = progress?.averageScore || 0;
  const targetGrade = progress?.targetGrade || "A*";

  const estimateDifficulty = (q: MockCandidate) => {
    const marks = q.marks || 1;
    const text = (q.question || "").toLowerCase();
    const longPrompt = text.length > 180;
    const commandWord = /\b(evaluate|assess|justify|compare|analyse|analyze)\b/.test(text);
    const dataHeavy = /\b(table|graph|figure|diagram|chart|data)\b/.test(text);
    let score = 0;
    if (marks >= 4) score += 2;
    if (marks >= 6) score += 2;
    if (longPrompt) score += 1;
    if (commandWord) score += 1;
    if (dataHeavy) score += 1;
    return score;
  };

  const easyPool = candidatePool.filter((q) => estimateDifficulty(q) <= 2);
  const mediumPool = candidatePool.filter((q) => estimateDifficulty(q) > 2 && estimateDifficulty(q) <= 4);
  const hardPool = candidatePool.filter((q) => estimateDifficulty(q) > 4);

  const pick = (pool: MockCandidate[], count: number) =>
    [...pool].sort(() => 0.5 - Math.random()).slice(0, Math.max(0, count));

  const selectedCounts =
    avgScore >= 80 || targetGrade === "A*"
      ? { easy: 6, medium: 14, hard: 20 }
      : avgScore >= 55
        ? { easy: 14, medium: 18, hard: 8 }
        : { easy: 24, medium: 12, hard: 4 };

  let selected = [
    ...pick(easyPool, selectedCounts.easy),
    ...pick(mediumPool, selectedCounts.medium),
    ...pick(hardPool, selectedCounts.hard),
  ];

  const remaining = 40 - selected.length;
  if (remaining > 0) {
    const rest = candidatePool.filter((q) => !selected.includes(q));
    selected = selected.concat(pick(rest, remaining));
  }

  const questions = selected
    .map((q) => {
      const resolvedImage = resolveQuestionImageSrc(q.imageSrc || null, q.question, {
      subject,
      year: (q as any).year ?? null,
      season: (q as any).season ?? null,
      paperNumber: (q as any).paperNumber ?? null,
      variant: (q as any).variant ?? null,
      });
      if (hasResourceReference(q.question) && !resolvedImage) return null;
      return {
        challengeId: q.challengeId,
        imageSrc: resolvedImage,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctLetter,
        markingSchemeAnswer: q.markingSchemeAnswer,
        marks: q.marks,
        topic: normalizeTopicForSubject(subject, q.topic) || q.topic || "General",
        questionType,
      };
    })
    .filter(Boolean) as Array<{
      challengeId?: number;
      imageSrc?: string | null;
      question: string;
      options: string[];
      correctAnswer: string | null;
      markingSchemeAnswer?: string | null;
      marks: number;
      topic: string;
      questionType: "MCQ" | "THEORY";
    }>;

  if (questions.length === 0) return null;

  return {
    id: `mock-${Date.now()}`,
    title: `Full Mock Simulation — ${subject}`,
    questions,
    timeLimit: questionType === "THEORY" ? 60 : 45,
    questionType,
    adaptiveProfile: avgScore >= 80 ? "A*_track" : avgScore >= 55 ? "balanced_track" : "foundation_track",
  };
}

/**
 * Submit a full mock exam session
 */
type TopicPerformanceInput = {
  topic: string;
  correct?: number;
  total?: number;
  awardedMarks?: number;
  maxMarks?: number;
};

type MockInsights = {
  grade: string;
  percentage: number;
  predictedPercentage: number;
  predictedGrade: string;
  focusTopics: Array<{ topic: string; scorePercent: number; reason: string }>;
  feedbackSummary: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export async function submitMockExam(
  score: number,
  total: number,
  subject: string = "Combined Science (0653)",
  topicPerformance: TopicPerformanceInput[] = []
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const percentage = Math.round((score / total) * 100);
  
  // Grade boundaries mapping
  const grade = getGradeFromPercentage(percentage);

  // Find or create a generic mock paper record to link the history to
  let mockPaper = await db.query.examPapers.findFirst({
    where: and(
        eq(examPapers.subject, subject),
        eq(examPapers.title, "Full Mock Assessment")
    )
  });

  if (!mockPaper) {
    const [newPaper] = await db.insert(examPapers).values({
        level: "O-Level",
        subject,
        year: 2025,
        season: "Mock",
        paperNumber: 1,
        variant: "qp",
        title: "Full Mock Assessment",
        content: "{}",
        totalMarks: total,
    }).returning();
    mockPaper = newPaper;
  }

  // Record in Grade History
  await db.insert(gradeHistory).values({
    userId,
    examPaperId: mockPaper.id,
    score,
    percentage,
    grade,
    completedAt: new Date(),
  });

  // Update user overall stats
  const progress = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
  });

  if (progress) {
    const history = await db.query.gradeHistory.findMany({
        where: eq(gradeHistory.userId, userId),
    });
    
    const newAvg = Math.round(history.reduce((acc, h) => acc + h.percentage, 0) / history.length);

    await db.update(userProgress).set({
        totalExamsCompleted: (progress.totalExamsCompleted || 0) + 1,
        averageScore: newAvg,
        updatedAt: new Date(),
    }).where(eq(userProgress.userId, userId));
  }

  const history = await db.query.gradeHistory.findMany({
    where: eq(gradeHistory.userId, userId),
    with: { examPaper: true },
    orderBy: (rows, { desc }) => [desc(rows.completedAt)],
    limit: 8,
  });

  const subjectHistory = history
    .filter((row) => row.examPaper?.subject === subject)
    .map((row) => row.percentage);

  const historicalAverage =
    subjectHistory.length > 0
      ? Math.round(subjectHistory.reduce((acc, value) => acc + value, 0) / subjectHistory.length)
      : percentage;

  const momentum = percentage - historicalAverage;
  const predictedPercentage = clamp(
    Math.round(percentage + momentum * 0.35 + (percentage < 70 ? 6 : 3)),
    0,
    100
  );
  const predictedGrade = getGradeFromPercentage(predictedPercentage);

  const topicScores = topicPerformance
    .filter((item) => item.topic && item.topic !== "General")
    .map((item) => {
      const denominator = item.maxMarks ?? item.total ?? 0;
      const numerator = item.awardedMarks ?? item.correct ?? 0;
      const scorePercent = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
      return {
        topic: normalizeTopicForSubject(subject, item.topic) || item.topic,
        scorePercent,
      };
    })
    .sort((a, b) => a.scorePercent - b.scorePercent);

  const weakest = topicScores.slice(0, 3).map((item) => ({
    ...item,
    reason:
      item.scorePercent < 50
        ? "Low scoring area in this mock"
        : "Needs consistency for A* reliability",
  }));

  let feedbackSummary =
    weakest.length > 0
      ? `Focus next on ${weakest.map((item) => item.topic).join(", ")} to move your grade upward.`
      : "Strong overall performance. Maintain consistency with timed practice.";

  // Optional AI layer for improvement narrative grounded in syllabus + weak topics.
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const syllabusContext = isCombinedScience0653(subject)
        ? JSON.stringify(OFFICIAL_0653_TOPICS_2025_2027)
        : "Use the active subject syllabus currently loaded in app.";
      const prompt = `
Student subject: ${subject}
Current score: ${percentage}%
Current grade: ${grade}
Predicted next score: ${predictedPercentage}%
Predicted next grade: ${predictedGrade}
Weak topics: ${JSON.stringify(weakest)}
Syllabus reference: ${syllabusContext}

Give a compact coaching summary (max 55 words) with:
1) What to fix first
2) Which paper style to practice
3) A realistic A* path statement
Do not hallucinate any topic not listed above.
`;
      const result = await model.generateContent(prompt);
      const aiSummary = result.response.text().trim();
      if (aiSummary) {
        feedbackSummary = aiSummary;
      }
    } catch {
      // Fallback to deterministic summary.
    }
  }

  const insights: MockInsights = {
    grade,
    percentage,
    predictedPercentage,
    predictedGrade,
    focusTopics: weakest,
    feedbackSummary,
  };

  return insights;
}

export async function gradeTheoryMockSubmission(
  questions: Array<{ question?: string; marks?: number; markingSchemeAnswer?: string }>,
  answers: Record<number, string>
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const perQuestion = questions.map((q, idx) => {
    const answer = answers[idx] || "";
    const result = evaluateTheoryByMarkScheme({
      answer,
      markingScheme: q.markingSchemeAnswer || "",
      maxMarks: q.marks || 1,
    });
    return {
      questionIndex: idx,
      question: q.question || "",
      ...result,
    };
  });

  const awarded = perQuestion.reduce((acc, r) => acc + r.awardedMarks, 0);
  const available = perQuestion.reduce((acc, r) => acc + r.maxMarks, 0);
  const percentage = available > 0 ? Math.round((awarded / available) * 100) : 0;
  const grade = getGradeFromPercentage(percentage);

  return {
    awarded,
    available,
    percentage,
    grade,
    feedback: perQuestion,
  };
}

// ── Progressive AI hint generator (4 levels) ──────────────────────────────
type HintPromptFn = (q: string, chosen: string, correct: string, opts: string[]) => string;

const HINT_PROMPTS: HintPromptFn[] = [
  // Attempt 1: Explain WHY the chosen answer is wrong — don't name the correct one
  (q, chosen, _correct) =>
    `You are a Cambridge O-Level tutor helping a student think through an MCQ.

Question: ${q}
Student chose: "${chosen}" — this is WRONG.

Write ONE sentence (max 30 words) explaining specifically why "${chosen}" is incorrect for this question.
IMPORTANT: Do NOT name, quote, or hint at the correct answer. Focus only on why the chosen option fails. Plain text only.`,

  // Attempt 2: Guide toward the right concept — still no answer reveal
  (q, chosen, _correct) =>
    `Cambridge O-Level tutor. Student got this MCQ wrong twice.

Question: ${q}
Their wrong answer: "${chosen}"

Write one sentence (max 35 words) asking a guiding question or describing the key concept they need to think about to find the right answer.
IMPORTANT: Do NOT state, name, or imply which option is correct. Make them reason it out. Plain text only.`,

  // Attempt 3: Elimination strategy — guide to rule out wrong options, still no reveal
  (q, chosen, _correct, opts) =>
    `Cambridge O-Level tutor. Student got this MCQ wrong 3 times.

Question: ${q}
All options: ${opts.map((o, i) => `${["A","B","C","D"][i] ?? i+1}. ${o}`).join(" | ")}
Their wrong answer: "${chosen}"

Write 1–2 sentences (max 40 words) helping the student eliminate clearly wrong options using scientific reasoning.
IMPORTANT: Do NOT reveal or name the correct answer. Help them narrow down by ruling out what is definitely wrong. Plain text only.`,

  // Attempt 4: Strong conceptual clue — final push without directly naming the answer
  (q, _chosen, _correct, opts) =>
    `Cambridge O-Level tutor. This is the student's last hint on this question.

Question: ${q}
All options: ${opts.map((o, i) => `${["A","B","C","D"][i] ?? i+1}. ${o}`).join(" | ")}

Write one sentence (max 35 words) giving the key scientific principle that, when applied to this question, points to the correct answer — without quoting or naming the correct option verbatim.
IMPORTANT: Make the student do the final reasoning step themselves. Plain text only.`,
];

const HINT_AI_COOLDOWN_MS = 90_000;
let hintAiCooldownUntil = 0;

const isGeminiRateLimited = (error: unknown) => {
  if (!error) return false;
  const err = error as { status?: number; statusCode?: number; message?: string };
  const status = Number(err.status ?? err.statusCode ?? 0);
  if (status === 429) return true;
  const text = String(err.message || error).toLowerCase();
  return text.includes("429") || text.includes("rate limit") || text.includes("too many requests");
};

const getGeminiErrorSummary = (error: unknown) => {
  const err = error as { status?: number; statusCode?: number; message?: string; statusText?: string };
  const status = err.status ?? err.statusCode;
  const statusPart = status ? `status ${status}` : "unknown status";
  const message = (err.message || err.statusText || String(error || "unknown error")).split("\n")[0];
  return `${statusPart}: ${message}`;
};

async function generateMCQHint(
  questionText: string,
  options: string[],
  userAnswer: string,
  correctOption: string,
  attemptNumber: number
): Promise<string> {
  if (Date.now() < hintAiCooldownUntil) {
    return fallbackHint(questionText, correctOption, attemptNumber);
  }

  const idx      = Math.min(attemptNumber - 1, 3);
  const promptFn = HINT_PROMPTS[idx];
  const prompt   = promptFn(questionText, userAnswer, correctOption, options);

  // Try primary model first, then fallback model on 429
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  for (let i = 0; i < models.length; i++) {
    try {
      const model  = genAI.getGenerativeModel({ model: models[i] });
      const result = await model.generateContent(prompt);
      const text   = result.response.text().trim();
      if (text && text.length > 15) return text;
    } catch (err: any) {
      const is429 = isGeminiRateLimited(err);
      if (is429 && i === 0) {
        hintAiCooldownUntil = Date.now() + HINT_AI_COOLDOWN_MS;
        await new Promise(r => setTimeout(r, 1200)); // brief pause before retry
        continue;
      }
      if (is429) {
        hintAiCooldownUntil = Date.now() + HINT_AI_COOLDOWN_MS;
        break;
      }
      console.error(`[generateMCQHint] Gemini error (${models[i]}): ${getGeminiErrorSummary(err)}`);
    }
  }

  // Meaningful fallback using actual question/answer content
  return fallbackHint(questionText, correctOption, attemptNumber);
}

function fallbackHint(questionText: string, _correctOption: string, attempt: number): string {
  const qWords = questionText
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter(w => w.length > 4)
    .slice(0, 5)
    .join(", ");

  if (attempt <= 1) {
    return `Re-read the question carefully. Focus on what exactly is being asked about ${qWords || "this topic"} — your chosen answer doesn't satisfy the key condition.`;
  }
  if (attempt === 2) {
    return `Think about which option is true for ALL cases described in the question, not just some of them. Eliminate options that only apply in specific or limited situations.`;
  }
  if (attempt === 3) {
    return `Look at each option individually and ask: "Does this always apply to every organism / scenario the question mentions?" Eliminate the ones that are only sometimes true.`;
  }
  return `Consider the defining biological/scientific principle behind the question. Which option describes a universal characteristic rather than a specific or partial one?`;
}

/**
 * AI-powered structured answer evaluation (Maths, English, EM).
 * Returns marks, feedback and a guiding hint — without naming the answer.
 */
async function evaluateStructuredWithAI(
  questionText: string,
  markingScheme: string,
  userAnswer: string,
  maxMarks: number,
  subjectName: string
): Promise<{ awardedMarks: number; feedback: string; hint: string }> {
  const prompt = `You are a Cambridge IGCSE ${subjectName} examiner marking a student's answer.

QUESTION:
${questionText}

MARK SCHEME (${maxMarks} marks available):
${markingScheme || "(Not provided)"}

STUDENT'S ANSWER:
${userAnswer}

Evaluate strictly according to the Cambridge mark scheme. Output ONLY valid JSON in this exact shape:
{
  "awardedMarks": <integer 0-${maxMarks}>,
  "feedback": "<1-2 sentences: what marks were earned and what was missing — be specific>",
  "hint": "<1 sentence guiding the student toward the missing marks without revealing the answer>"
}

Rules:
- awardedMarks must be an integer between 0 and ${maxMarks}.
- feedback must reference specific marking points the student hit or missed.
- hint must NOT directly state or quote the correct answer.
- For mathematics: accept equivalent correct forms (e.g. 3.5 == 7/2). Allow working marks if shown.
- Output ONLY the JSON object, no other text.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(raw);
    const marks = Math.max(0, Math.min(maxMarks, Math.round(Number(parsed.awardedMarks) || 0)));
    return {
      awardedMarks: marks,
      feedback: String(parsed.feedback || "").trim() || (marks === maxMarks ? "Full marks!" : "Partial credit."),
      hint: String(parsed.hint || "").trim() || "Review the marking scheme and add more specific detail.",
    };
  } catch {
    // Fallback to keyword matching
    const kw = evaluateTheoryByMarkScheme({ answer: userAnswer, markingScheme, maxMarks });
    return { awardedMarks: kw.awardedMarks, feedback: kw.feedback, hint: kw.hint };
  }
}

export async function validateSmartPracticeAnswer(input: {
  challengeId?: number;
  questionText: string;
  options?: string[];
  correctAnswer?: number | string | null;
  markingSchemeAnswer?: string;
  marks?: number;
  userAnswer: string;
  clientAttempts?: number;
  subjectCode?: string;
  latestHintShown?: string;
  hintHistory?: string[];
}) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const FREE_HINT_LIMIT = 4;
  let wrongAttempts = Math.max(0, Number(input.clientAttempts || 0));

  if (input.challengeId && wrongAttempts >= FREE_HINT_LIMIT - 1) {
    const recentWrongLogs = await db.query.attemptLogs.findMany({
      columns: { id: true },
      where: and(
        eq(attemptLogs.userId, userId),
        eq(attemptLogs.challengeId, input.challengeId),
        eq(attemptLogs.status, "wrong")
      ),
      limit: FREE_HINT_LIMIT,
      orderBy: (rows, { desc }) => [desc(rows.timestamp)],
    });
    wrongAttempts = Math.max(wrongAttempts, recentWrongLogs.length);
  }

  if (wrongAttempts >= FREE_HINT_LIMIT) {
    const subscription = await db.query.userSubscription.findFirst({
      where: eq(userSubscription.userId, userId),
      columns: { stripePriceId: true, stripeCurrentPeriodEnd: true },
    });
    const isPro =
      !!subscription?.stripePriceId &&
      !!subscription?.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now();

    if (!isPro) {
      return {
        locked: true, isCorrect: false, repetitionCount: wrongAttempts,
        feedback: "You've used all free hints for this question. Upgrade for unlimited AI coaching.",
        hint: "Upgrade required.", awardedMarks: 0, maxMarks: input.marks || 1,
      };
    }
  }

  const trimmedAnswer = (input.userAnswer || "").trim();
  const isMCQ = Array.isArray(input.options) && input.options.length > 0;

  let isCorrect    = false;
  let feedback     = "";
  let hint         = "";
  let awardedMarks = 0;
  const maxMarks   = Math.max(1, Number(input.marks || 1));

  if (isMCQ) {
    const options      = input.options || [];
    const correctIndex = typeof input.correctAnswer === "number"
      ? input.correctAnswer
      : Number.parseInt(String(input.correctAnswer), 10);
    const correctOption      = Number.isFinite(correctIndex) ? options[correctIndex] : "";
    const cleanCorrectOption = String(correctOption || "").replace(/^[A-D]:\s*/i, "").trim();

    // Normalize both sides: strip leading "A: " / "B: " prefix and compare case-insensitively
    const normalizeOpt = (s: string) => String(s || "").replace(/^[A-D]:\s*/i, "").trim().toLowerCase();
    isCorrect    = normalizeOpt(trimmedAnswer) === normalizeOpt(correctOption)
                || trimmedAnswer === String(input.correctAnswer);
    awardedMarks = isCorrect ? maxMarks : 0;
    feedback     = isCorrect ? "Correct!" : "That's not right.";

    if (isCorrect) {
      hint = "";
    } else {
      // Generate a real AI hint specific to this question
      const attemptNumber = wrongAttempts + 1;
      const aiHint = await generateMCQHint(
        input.questionText, options, trimmedAnswer, cleanCorrectOption, attemptNumber
      );
      hint = `${aiHint} Attempt ${attemptNumber} of ${FREE_HINT_LIMIT} free hints.`;
    }
  } else {
    // Use AI evaluation for structured subjects (Maths, English, EM) — keyword matching for science fallback
    const subjectCodeRaw = input.subjectCode ?? "";
    const useAI = ["0580", "0500", "0680"].includes(subjectCodeRaw) && !!input.markingSchemeAnswer;
    if (useAI) {
      const subjectNameMap: Record<string, string> = {
        "0580": "Mathematics", "0500": "English First Language", "0680": "Environmental Management",
      };
      const aiResult = await evaluateStructuredWithAI(
        input.questionText,
        input.markingSchemeAnswer!,
        trimmedAnswer,
        maxMarks,
        subjectNameMap[subjectCodeRaw] ?? "IGCSE"
      );
      awardedMarks = aiResult.awardedMarks;
      isCorrect    = awardedMarks >= Math.max(1, Math.ceil(maxMarks * 0.6));
      feedback     = aiResult.feedback;
      hint         = aiResult.hint;
    } else {
      const theory = evaluateTheoryByMarkScheme({
        answer: trimmedAnswer,
        markingScheme: input.markingSchemeAnswer || "",
        maxMarks,
      });
      awardedMarks = theory.awardedMarks;
      isCorrect    = theory.awardedMarks >= Math.max(1, Math.ceil(maxMarks * 0.6));
      feedback     = theory.feedback;
      hint         = theory.hint;
    }

    const copiedFromHint =
      isLikelyHintCopyAnswer(trimmedAnswer, input.latestHintShown) ||
      (Array.isArray(input.hintHistory) &&
        input.hintHistory.some((hint) => isLikelyHintCopyAnswer(trimmedAnswer, hint)));
    if (copiedFromHint) {
      isCorrect = false;
      awardedMarks = 0;
      feedback =
        "This response appears copied from a hint. Rephrase the point in your own words and include the key science idea.";
      hint = "Use the hint as direction only, then write your own complete answer.";
    }
  }

  // ── Persist results to DB ─────────────────────────────────────────────────
  if (input.challengeId) {
    const repetitionCount = isCorrect ? wrongAttempts : wrongAttempts + 1;

    // 1. Always log the attempt
    await db.insert(attemptLogs).values({
      userId,
      challengeId: input.challengeId,
      status: isCorrect ? "correct" : "wrong",
      repetitionCount,
      timestamp: new Date(),
    });

    // 2. Mark challenge as completed when correct (upsert challengeProgress)
    if (isCorrect) {
      const existing = await db.query.challengeProgress.findFirst({
        where: and(
          eq(challengeProgress.userId, userId),
          eq(challengeProgress.challengeId, input.challengeId)
        ),
      });
      if (existing) {
        await db.update(challengeProgress)
          .set({ completed: true, attempts: (existing.attempts || 0) + 1, lastAttemptAt: new Date() })
          .where(and(
            eq(challengeProgress.userId, userId),
            eq(challengeProgress.challengeId, input.challengeId)
          ));
      } else {
        await db.insert(challengeProgress).values({
          userId,
          challengeId: input.challengeId,
          completed: true,
          attempts: 1,
          lastAttemptAt: new Date(),
        });
      }
    }
  }

  return {
    locked: false,
    isCorrect,
    repetitionCount: isCorrect ? wrongAttempts : wrongAttempts + 1,
    feedback,
    hint,
    awardedMarks,
    maxMarks,
  };
}

/**
 * Submit a smart practice session
 */
export async function submitSmartPractice(
  userId: string,
  topic: string,
  score: number,
  totalQuestions: number
) {
  const progress = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
  });

  // Completion bonus: 50 XP for finishing, scaled by score %
  const completionXP = Math.round(50 * (score / 100));
  const pointsEarned = Math.max(5, completionXP);

  if (progress) {
    // Update streak: +1 if practiced today or continue
    const now = new Date();
    const lastUpdated = progress.updatedAt;
    const daysSince = lastUpdated
      ? Math.floor((now.getTime() - lastUpdated.getTime()) / 86_400_000)
      : 1;
    const newStreak = daysSince <= 1 ? (progress.currentStreak || 0) + 1 : 1;
    const newLongest = Math.max(newStreak, progress.longestStreak || 0);

    await db.update(userProgress)
      .set({
        points: (progress.points || 0) + pointsEarned,
        currentStreak: newStreak,
        longestStreak: newLongest,
        updatedAt: now,
      })
      .where(eq(userProgress.userId, userId));
  }

  return { points: pointsEarned };
}

/**
 * Get AI explanation for a question
 */
export async function getAIExplanation(
  question: string,
  options: string[],
  correctAnswer: string,
  userAnswer: string,
  topic: string,
  markingSchemeAnswer?: string
) {
  return await getQuestionExplanation(question, options, correctAnswer, userAnswer, topic, markingSchemeAnswer);
}
