"use server";

import { auth } from "@clerk/nextjs/server";
import db from "@/server/db/drizzle";
import { examPapers, userProgress, examSessions, gradeHistory, courses, units, lessons, challenges, challengeOptions, userSubscription, attemptLogs } from "@/server/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getQuestionExplanation, getSessionFeedback } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { evaluateTheoryByMarkScheme, getGradeFromPercentage } from "@/lib/marking-scheme";
import { hasResourceReference, resolveQuestionImageSrc } from "@/lib/resource-fallback";
import {
  normalize0653Topic,
  infer0653TopicFromQuestion,
  isOfficial0653Topic,
  OFFICIAL_0653_TOPICS_2025_2027,
} from "@/lib/syllabus/combined-science-2025";

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
};

const priorityRank: Record<TopicPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
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
  const topicCounts: Record<string, number> = {};

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
              topicCounts[normalizedTopic] = (topicCounts[normalizedTopic] || 0) + 1;
            }
          });
        }
      } catch (e) {}
    });
  }

  // 2. Fall back to challenges table (short-answer subjects like EM 0680)
  // We also do this when exam papers exist but contain no usable topic tags.
  if (Object.keys(topicCounts).length === 0) {
    // 2. Fall back to challenges table (short-answer subjects like EM 0680)
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
            const normalizedTopic = inferTopicForSubject(subject, ch.question || "", ch.topic);
            if (normalizedTopic) {
              topicCounts[normalizedTopic] = (topicCounts[normalizedTopic] || 0) + 1;
            }
          })
        )
      );
    }
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
      topicCounts[topic] = 0;
    });
  }

  return Object.entries(topicCounts)
    .map(([name, count]) => ({ name, count }))
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Build smart-practice topic catalog prioritized by curriculum roadmap + topic importance.
 */
export async function getSmartPracticeTopicCatalog(
  subject: string,
  level: string = "O-Level"
): Promise<SmartPracticeTopicCatalogItem[]> {
  const topicCounts = await getTopicsForSubject(subject, level);
  const countByTopic = new Map<string, number>(
    topicCounts.map((topic) => [topic.name, topic.count])
  );

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

  const analysis = loadTopicAnalysis();
  const normalizedAnalysis = new Map<string, { priority: TopicPriority; frequency: number }>();
  Object.entries(analysis).forEach(([topicName, details]) => {
    normalizedAnalysis.set(
      normalizeForPriorityLookup(subject, topicName),
      {
        priority: parsePriority(details?.priority),
        frequency: Number(details?.frequency || 0),
      }
    );
  });

  const merged = new Map<string, SmartPracticeTopicCatalogItem>();
  const upsert = (name: string, roadmap: boolean, unitTitle?: string) => {
    const normalized = normalizeTopicForSubject(subject, name) || name;
    const lookupKey = normalizeForPriorityLookup(subject, normalized);
    const analysisDetails = normalizedAnalysis.get(lookupKey);

    const existing = merged.get(normalized);
    const next: SmartPracticeTopicCatalogItem = {
      name: normalized,
      count: countByTopic.get(normalized) || existing?.count || 0,
      roadmap: roadmap || existing?.roadmap || false,
      priority: analysisDetails?.priority || existing?.priority || "LOW",
      frequency: analysisDetails?.frequency ?? existing?.frequency ?? 0,
      unitTitle: existing?.unitTitle || unitTitle,
    };
    merged.set(normalized, next);
  };

  roadmapTopics.forEach((topic) => upsert(topic.name, true, topic.unitTitle));
  topicCounts.forEach((topic) => upsert(topic.name, false));

  return Array.from(merged.values()).sort((a, b) => {
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
export async function generateSmartPractice(subject: string, topic: string, limit: number = 10) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const normalizedRequestedTopic = normalizeTopicForSubject(subject, topic) || topic;

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

  // Fall back to challenges table (THEORY subjects like EM 0680)
  if (allQuestions.length === 0) {
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
            const questionKey = ch.question.trim().toLowerCase();
            if (seenQuestions.has(questionKey)) return;
            const normalizedTopic = inferTopicForSubject(subject, ch.question || "", ch.topic);
            if (!normalizedTopic) return;
            if (normalizedTopic === normalizedRequestedTopic || normalizedTopic.includes(normalizedRequestedTopic)) {
              const resolvedImage = resolveQuestionImageSrc(ch.imageSrc || null, ch.question || "", {
                subject,
              });
              if (hasResourceReference(ch.question || "") && !resolvedImage) return;
              seenQuestions.add(questionKey);
              const isMCQ = ch.challengeOptions?.length > 0;
              allQuestions.push({
                id: ch.id,
                challengeId: ch.id,
                number: ch.order,
                text: ch.question,
                imageSrc: resolvedImage,
                topic: normalizedTopic,
                marks: ch.totalMarks,
                markingSchemeAnswer: ch.markingSchemeAnswer,
                questionType: isMCQ ? "MCQ" : "THEORY",
                options: isMCQ ? ch.challengeOptions.map(o => o.text) : undefined,
                correctAnswer: isMCQ ? ch.challengeOptions.findIndex(o => o.correct) : undefined,
                sourcePaper: `${unit.title} · ${lesson.title}`,
              });
            }
          })
        )
      );
    }
  }

  const shuffled = allQuestions.sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, limit);
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

export async function validateSmartPracticeAnswer(input: {
  challengeId?: number;
  questionText: string;
  options?: string[];
  correctAnswer?: number | string | null;
  markingSchemeAnswer?: string;
  marks?: number;
  userAnswer: string;
  clientAttempts?: number;
}) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const FREE_HINT_LIMIT = 4;
  let wrongAttempts = Math.max(0, Number(input.clientAttempts || 0));

  // Fast path: trust the client counter for immediate checks.
  // We only verify against DB when close to lock threshold to avoid repeated heavy queries.
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
      columns: {
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });
    const isPro =
      !!subscription?.stripePriceId &&
      !!subscription?.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now();

    if (!isPro) {
      return {
        locked: true,
        isCorrect: false,
        repetitionCount: wrongAttempts,
        feedback: "You have repeated this question multiple times. Upgrade to unlock guided AI coaching for this exact question.",
        hint: "Upgrade required after repeated attempts.",
        awardedMarks: 0,
        maxMarks: input.marks || 1,
      };
    }
  }

  const trimmedAnswer = (input.userAnswer || "").trim();
  const isMCQ = Array.isArray(input.options) && input.options.length > 0;

  let isCorrect = false;
  let feedback = "";
  let hint = "";
  let awardedMarks = 0;
  const maxMarks = Math.max(1, Number(input.marks || 1));

  if (isMCQ) {
    const options = input.options || [];
    const correctIndex =
      typeof input.correctAnswer === "number"
        ? input.correctAnswer
        : Number.parseInt(String(input.correctAnswer), 10);
    const correctOption = Number.isFinite(correctIndex) ? options[correctIndex] : "";
    const cleanCorrectOption = String(correctOption || "").replace(/^[A-D]:\s*/i, "").trim();
    isCorrect = trimmedAnswer === correctOption || trimmedAnswer === String(input.correctAnswer);
    awardedMarks = isCorrect ? maxMarks : 0;
    feedback = isCorrect ? "Correct. Good job." : "Not correct yet.";
    const attemptNumber = wrongAttempts + 1;
    if (isCorrect) {
      hint = "Move to next question.";
    } else if (attemptNumber <= 1) {
      hint = "Focus on the key scientific process in the question stem before checking options.";
    } else if (attemptNumber === 2) {
      hint = "Eliminate options that conflict with the core definition first, then compare the remaining two.";
    } else if (attemptNumber === 3) {
      hint = `Keyword focus: ${cleanCorrectOption.split(" ").slice(0, 2).join(" ")}.`;
    } else {
      hint = `Final free hint: revisit the option linked to "${cleanCorrectOption.split(" ").slice(0, 3).join(" ")}".`;
    }
  } else {
    const theory = evaluateTheoryByMarkScheme({
      answer: trimmedAnswer,
      markingScheme: input.markingSchemeAnswer || "",
      maxMarks,
    });
    awardedMarks = theory.awardedMarks;
    isCorrect = theory.awardedMarks >= Math.max(1, Math.ceil(maxMarks * 0.6));
    feedback = theory.feedback;
    hint = theory.hint;
  }

  if (!isCorrect && !input.markingSchemeAnswer?.trim() && isMCQ && Array.isArray(input.options)) {
    hint = `${hint} Attempt ${wrongAttempts + 1} of ${FREE_HINT_LIMIT} free hints.`;
  }

  if (input.challengeId) {
    const repetitionCount = isCorrect ? wrongAttempts : wrongAttempts + 1;
    await db.insert(attemptLogs).values({
      userId,
      challengeId: input.challengeId,
      status: isCorrect ? "correct" : "wrong",
      repetitionCount,
      timestamp: new Date(),
    });
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
  // Update user progress (simple version)
  const progress = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
  });

  const pointsEarned = score >= 80 ? 20 : score >= 50 ? 10 : 5;
  
  if (progress) {
    await db.update(userProgress)
      .set({
        points: (progress.points || 0) + pointsEarned,
        updatedAt: new Date(),
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
  topic: string
) {
  return await getQuestionExplanation(question, options, correctAnswer, userAnswer, topic);
}
