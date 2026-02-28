import { cache } from "react";
import { eq, desc, asc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import db from "@/server/db/drizzle";
import { normalize0653Topic } from "@/lib/syllabus/combined-science-2025";

import {
  courses,
  units,
  lessons,
  challenges,
  userProgress,
  examPapers,
  examSessions,
  proctoringLogs,
  handwrittenAnswers,
  aiGradings,
  gradeHistory,
  challengeProgress,
  userSubscription,
  attemptLogs,
} from "@/server/db/schema";

// ============================================
// SUBJECT MASTERY & TOPIC QUERIES
// ============================================

const DEMO_USER_ID = "user_39sSWTon713wTYGHgxU2RRrIzYY";

const getAuthUserId = () => {
  const { userId } = auth();
  return userId || DEMO_USER_ID;
};

export const getUserSubscription = cache(async () => {
  const userId = getAuthUserId();

  if (!userId) {
    return null;
  }

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) {
    return null;
  }

  const isActive =
    data.stripePriceId &&
    data.stripeCurrentPeriodEnd?.getTime()! + 86_400_000 > Date.now();

  return {
    ...data,
    isActive: !!isActive,
  };
});

export const getCourses = cache(async () => {
  const data = await db.query.courses.findMany();
  return data;
});

// Hard-coded syllabus roadmap fallback to ensure UI consistency
const SYLLABUS_ROADMAP: Record<string, string[]> = {
  "B1. Characteristics of living organisms": ["MRS GREN Definitions", "Metabolism Basics", "Excretion vs Egestion"],
  "B2. Cells": ["Cell Structure", "Specialised Cells", "Microscopy Skills", "Cell Organisation"],
  "B3. Movement into and out of cells": ["Diffusion", "Osmosis", "Active Transport", "Surface Area to Volume"],
  "B4. Biological molecules": ["Carbohydrates", "Proteins", "Fats", "Food Tests"],
  "B5. Enzymes": ["Lock and Key Theory", "Temperature Effects", "pH Effects", "Enzyme Rate"],
  "B6. Plant nutrition": ["Photosynthesis Equation", "Leaf Adaptations", "Limiting Factors", "Mineral Ions"],
  "B7. Human nutrition": ["Balanced Diet", "Digestive System", "Absorption", "Digestive Enzymes"],
  "B8. Transport in plants": ["Xylem Structure", "Phloem Translocation", "Transpiration Stream", "Root Hair Absorption"],
  "B9. Transport in animals": ["Heart Structure", "Blood Vessels", "Blood Components", "Coronary Heart Disease"],
  "B10. Diseases and immunity": ["Pathogens", "Transmission", "Body Defences", "Vaccination"],
  "B11. Gas exchange in humans": ["Alveoli Adaptations", "Ventilation Mechanics", "Inhaled vs Exhaled Air", "Smoking Effects"],
  "B12. Respiration": ["Aerobic Equation", "Anaerobic Respiration", "Energy Release", "Respiration vs Breathing"],
  "B13. Drugs": ["Medicinal Drugs", "Antibiotics", "Drug Misuse", "Drug Dependence"],
  "B14. Reproduction": ["Sexual and Asexual", "Human Reproduction", "Plant Reproduction", "Life Cycles"],
  "B15. Organisms and their environment": ["Food Chains and Webs", "Energy Transfer", "Population Dynamics", "Nutrient Cycles"],
  "B16. Human influences on ecosystems": ["Deforestation", "Pollution", "Conservation", "Sustainability"],
  "C1. States of matter": ["Particle Model", "Diffusion", "Melting and Boiling", "Gas Pressure"],
  "C2. Atoms, elements and compounds": ["Atomic Structure", "Ions", "Ionic Bonding", "Covalent Bonding"],
  "C3. Stoichiometry": ["Relative Formula Mass", "Mole Concept", "Equations", "Percentage Yield"],
  "C4. Electrochemistry": ["Electrolysis", "Electrolytes", "Products at Electrodes", "Industrial Electrolysis"],
  "C5. Chemical energetics": ["Exothermic and Endothermic", "Energy Profiles", "Activation Energy", "Bond Energies"],
  "C6. Chemical reactions": ["Rate of Reaction", "Reversible Reactions", "Redox", "Catalysts"],
  "C7. Acids, bases and salts": ["pH and Indicators", "Neutralisation", "Salt Preparation", "Titration Basics"],
  "C8. The Periodic Table": ["Periodic Trends", "Group I", "Group VII", "Noble Gases"],
  "C9. Metals": ["Reactivity Series", "Extraction", "Displacement", "Corrosion"],
  "C10. Chemistry of the environment": ["Air Composition", "Water Treatment", "Pollution", "Greenhouse Gases"],
  "C11. Organic chemistry": ["Hydrocarbons", "Cracking", "Alcohols", "Polymers"],
  "C12. Experimental techniques and chemical analysis": ["Chromatography", "Filtration", "Distillation", "Qualitative Analysis"],
  "P1. Motion, forces and energy": ["Speed/Velocity/Acceleration", "Distance-Time Graphs", "Newton's Second Law (F=ma)", "Kinetic & Potential Energy"],
  "P2. Thermal physics": ["Conduction in Metals", "Convection Currents", "Radiation (Infrared)", "Specific Heat Capacity"],
  "P3. Waves": ["Transverse vs Longitudinal", "Reflection & Refraction", "Electromagnetic Spectrum", "Sound Wave Properties"],
  "P4. Electricity": ["Current and Voltage", "Ohm's Law", "Series and Parallel", "Electrical Safety"],
  "P5. Space physics": ["Solar System", "Planetary Motion", "Stars and Galaxies", "Expansion of the Universe"],
  
  // ENVIRONMENTAL MANAGEMENT (0680)
  "1.1 Rocks and minerals": ["Types of Rocks", "Mining Impacts", "Sustainability", "Restoration of Mine Sites"],
  "1.2 Energy resources": ["Fossil Fuel Impacts", "Nuclear Pros/Cons", "Renewable Efficiency", "Carbon Footprint"],
  "2.1 Agriculture": ["Intensive Farming", "Soil Erosion", "Pest Management", "Sustainable Irrigation"],
  "2.2 Water management": ["Water Treatment", "Sewage Disposal", "Desalination", "Water Scarcity Causes"],
  "3.1 Oceans and fisheries": ["Overfishing Consequences", "Marine Pollution", "EEZ Zones", "Sustainable Yield"],
  "3.2 Natural hazards": ["Plate Tectonics", "Predicting Eruptions", "Tsunami Warning Systems", "Building Resilience"],
  "4.1 The atmosphere": ["Greenhouse Effect", "Ozone Hole", "Smog Formation", "Clean Air Legislation"],
  "4.2 Human population": ["Demographic Transition", "Overpopulation Impacts", "Migration Causes", "Population Pyramids"]
};

export const getUnits = cache(async () => {
  const userId = getAuthUserId();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) {
    return [];
  }

  const data = await db.query.units.findMany({
    orderBy: (units, { asc }) => [asc(units.order)],
    where: eq(units.courseId, userProgress.activeCourseId),
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const normalizedData = data.map((unit) => {
    const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
      // 1. Get topics from DB
      const dbSubTopics = Array.from(new Set(lesson.challenges.map(c => c.topic).filter(Boolean)));
      
      // 2. Get topics from Roadmap (Syllabus)
      const roadmapSubTopics =
        SYLLABUS_ROADMAP[normalize0653Topic(lesson.title)] || SYLLABUS_ROADMAP[lesson.title] || [];
      
      // 3. Combine both (Roadmap takes priority for A* clarity)
      const subTopics = roadmapSubTopics.length > 0 ? roadmapSubTopics : dbSubTopics;

      if (lesson.challenges.length === 0) {
        return { ...lesson, completed: false, subTopics };
      }

      const allCompletedChallenges = lesson.challenges.every((challenge) => {
        return (
          challenge.challengeProgress &&
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
        );
      });

      return { ...lesson, completed: allCompletedChallenges, subTopics };
    });

    return { ...unit, lessons: lessonsWithCompletedStatus };
  });

  return normalizedData;
});

export const getCourseById = cache(async (courseId: number) => {
  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  const userId = getAuthUserId();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) {
    return null;
  }

  const unitsInCourse = await db.query.units.findMany({
    orderBy: (units, { asc }) => [asc(units.order)],
    where: eq(units.courseId, userProgress.activeCourseId),
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const firstUncompletedLesson = unitsInCourse
    .flatMap((unit) => unit.lessons)
    .find((lesson) => {
      return lesson.challenges.some((challenge) => {
        return (
          !challenge.challengeProgress ||
          challenge.challengeProgress.length === 0 ||
          challenge.challengeProgress.some((progress) => !progress.completed)
        );
      });
    });

  return {
    activeLesson: firstUncompletedLesson,
    activeLessonId: firstUncompletedLesson?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  const userId = getAuthUserId();

  if (!userId) {
    return null;
  }

  const courseProgress = await getCourseProgress();

  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId) {
    return null;
  }

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (!data || !data.challenges) {
    return null;
  }

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  return { ...data, challenges: normalizedChallenges };
});

export const getLessonPercentage = cache(async () => {
  const courseProgress = await getCourseProgress();

  if (!courseProgress?.activeLessonId) {
    return 0;
  }

  const lesson = await getLesson(courseProgress.activeLessonId);

  if (!lesson) {
    return 0;
  }

  const completedChallenges = lesson.challenges.filter(
    (challenge) => challenge.completed
  );
  const percentage = Math.round(
    (completedChallenges.length / lesson.challenges.length) * 100
  );

  return percentage;
});

// ============================================
// EXAM PLATFORM QUERIES
// ============================================

// Optimized query for dashboard counts and focus papers
export const getDashboardExamsInfo = cache(async () => {
  const allPapers = await db.query.examPapers.findMany({
    where: eq(examPapers.variant, "qp"),
    columns: {
      id: true,
      level: true,
      subject: true,
      year: true,
      variant: true,
    }
  });

  const oLevelCount = allPapers.filter(p => p.level === "O-Level").length;
  const aLevelCount = allPapers.filter(p => p.level === "A-Level").length;
  
  const focusPapers = allPapers.filter(
    p => p.level === "O-Level" && 
         p.subject === "Combined Science (0653)" && 
         p.year >= 2019
  ).slice(0, 3);

  return { oLevelCount, aLevelCount, focusPapers };
});

// Get all available exam papers
export const getExamPapers = cache(async (level?: string, subject?: string) => {
  const whereConditions = [eq(examPapers.variant, "qp")];
  
  if (level) {
    whereConditions.push(eq(examPapers.level, level));
  }
  
  if (subject) {
    whereConditions.push(eq(examPapers.subject, subject));
  }

  const data = await db.query.examPapers.findMany({
    orderBy: (examPapers, { desc }) => [desc(examPapers.year), asc(examPapers.season)],
    where: and(...whereConditions),
  });

  return data;
});

// Get exam paper by ID
export const getExamPaperById = cache(async (paperId: number) => {
  const data = await db.query.examPapers.findFirst({
    where: eq(examPapers.id, paperId),
  });

  return data;
});

// Get exam paper with mark scheme
export const getExamPaperWithMarkScheme = cache(async (paperId: number) => {
  const paper = await db.query.examPapers.findFirst({
    where: and(
      eq(examPapers.id, paperId),
      eq(examPapers.variant, "qp")
    ),
  });

  if (!paper) {
    return { paper: null, markScheme: null };
  }

  const markScheme = await db.query.examPapers.findFirst({
    where: and(
      eq(examPapers.year, paper.year),
      eq(examPapers.season, paper.season),
      eq(examPapers.paperNumber, paper.paperNumber),
      eq(examPapers.variant, "ms")
    ),
  });

  return { paper, markScheme };
});

// Get user's exam sessions
export const getUserExamSessions = cache(async () => {
  const userId = getAuthUserId();

  if (!userId) {
    return [];
  }

  const data = await db.query.examSessions.findMany({
    where: eq(examSessions.userId, userId),
    orderBy: (examSessions, { desc }) => [desc(examSessions.createdAt)],
    with: {
      examPaper: true,
    },
  });

  return data;
});

// Get exam session by ID
export const getExamSessionById = cache(async (sessionId: number) => {
  const userId = getAuthUserId();

  if (!userId) {
    return null;
  }

  const data = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.id, sessionId),
      eq(examSessions.userId, userId)
    ),
    with: {
      examPaper: true,
      proctoringLogs: true,
      handwrittenAnswers: true,
      aiGradings: true,
    },
  });

  return data;
});

// Get user's active exam session (in progress)
export const getActiveExamSession = cache(async () => {
  const userId = getAuthUserId();

  if (!userId) {
    return null;
  }

  const data = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.userId, userId),
      eq(examSessions.status, "in_progress")
    ),
    with: {
      examPaper: true,
    },
  });

  return data;
});

// Get user's grade history
export const getUserGradeHistory = cache(async () => {
  const userId = getAuthUserId();

  if (!userId) {
    return [];
  }

  const data = await db.query.gradeHistory.findMany({
    where: eq(gradeHistory.userId, userId),
    orderBy: (gradeHistory, { desc }) => [desc(gradeHistory.completedAt)],
    with: {
      examPaper: true,
    },
  });

  return data;
});

// Get user's improvement statistics
export const getUserStats = cache(async () => {
  const userId = getAuthUserId();

  if (!userId) {
    return null;
  }

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      gradeHistory: {
        orderBy: (gradeHistory, { desc }) => [desc(gradeHistory.completedAt)],
        limit: 10,
      },
    },
  });

  return data;
});

// Get proctoring logs for an exam session
export const getProctoringLogs = cache(async (sessionId: number) => {
  const data = await db.query.proctoringLogs.findMany({
    where: eq(proctoringLogs.examSessionId, sessionId),
    orderBy: (proctoringLogs, { asc }) => [asc(proctoringLogs.timestamp)],
  });

  return data;
});

// Get handwritten answers for an exam session
export const getHandwrittenAnswers = cache(async (sessionId: number) => {
  const data = await db.query.handwrittenAnswers.findMany({
    where: eq(handwrittenAnswers.examSessionId, sessionId),
    orderBy: (handwrittenAnswers, { asc }) => [asc(handwrittenAnswers.questionNumber)],
  });

  return data;
});

// Get AI gradings for an exam session
export const getAIGradings = cache(async (sessionId: number) => {
  const data = await db.query.aiGradings.findMany({
    where: eq(aiGradings.examSessionId, sessionId),
    orderBy: (aiGradings, { asc }) => [asc(aiGradings.questionNumber)],
  });

  return data;
});

// Get detailed analytics for the Mock Hub
export const getMockHubAnalytics = cache(async (courseId?: number) => {
  const userId = getAuthUserId();
  if (!userId) return null;

  // 1. Get all attempt logs for the student
  const allLogs = await db.query.attemptLogs.findMany({
    columns: {
      id: true,
      status: true,
      timeTaken: true,
      challengeId: true,
      timestamp: true,
    },
    where: eq(attemptLogs.userId, userId),
    orderBy: (rows, { desc }) => [desc(rows.timestamp)],
    limit: 1200,
    with: {
      challenge: {
        columns: {
          topic: true,
        },
        with: {
          lesson: {
            columns: {
              title: true,
            },
            with: {
              unit: {
                columns: {
                  title: true,
                  courseId: true,
                },
              }
            }
          }
        }
      }
    }
  });

  // Filter by active course if provided
  const logs = courseId
    ? allLogs.filter(log => log.challenge.lesson?.unit?.courseId === courseId)
    : allLogs;

  if (logs.length < 5) return null; // Require at least 5 interactions for meaningful AI analysis

  // 2. Calculate error rates and subject-wise mastery
  const chapterStats: Record<string, { total: number, wrong: number }> = {};
  const subTopicStats: Record<string, { total: number, wrong: number }> = {};
  const subjectStats: Record<string, { total: number, correct: number }> = {};

  let totalTime = 0;
  let timedLogs = 0;

  logs.forEach(log => {
    const chapter = log.challenge.lesson?.title;
    const subTopic = log.challenge.topic;
    const subjectName = log.challenge.lesson?.unit?.title || "General"; 
    
    if (!chapter) return;
    
    // Time tracking
    if (log.timeTaken) {
        totalTime += log.timeTaken;
        timedLogs++;
    }

    // Dynamic Subject stats
    if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { total: 0, correct: 0 };
    }
    subjectStats[subjectName].total++;
    if (log.status === "correct") subjectStats[subjectName].correct++;

    // Chapter stats
    if (!chapterStats[chapter]) chapterStats[chapter] = { total: 0, wrong: 0 };
    chapterStats[chapter].total++;
    if (log.status === "wrong") chapterStats[chapter].wrong++;

    // Sub-topic stats
    if (subTopic) {
        if (!subTopicStats[subTopic]) subTopicStats[subTopic] = { total: 0, wrong: 0 };
        subTopicStats[subTopic].total++;
        if (log.status === "wrong") subTopicStats[subTopic].wrong++;
    }
  });

  // 3. Identify top 2 weak chapters
  const weakChapters = Object.entries(chapterStats)
    .map(([name, stats]) => ({
      name,
      errorRate: stats.wrong / stats.total,
      wrongCount: stats.wrong
    }))
    .filter(c => c.errorRate > 0.2)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 2);

  // 4. Identify top 3 weak sub-topics
  const weakSubTopics = Object.entries(subTopicStats)
    .map(([name, stats]) => ({
        name,
        errorRate: stats.wrong / stats.total,
        wrongCount: stats.wrong
    }))
    .filter(s => s.errorRate > 0.2)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 3);

  // 5. Subject Mastery %
  const subjectMastery = Object.entries(subjectStats).map(([name, stats]) => ({
    name,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  }));

  // 5b. Topic Mastery % (used by readiness dashboard)
  const topicMastery = Object.entries(subTopicStats)
    .map(([name, stats]) => ({
      name,
      attempts: stats.total,
      wrong: stats.wrong,
      accuracy: stats.total > 0 ? Math.round(((stats.total - stats.wrong) / stats.total) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return a.accuracy - b.accuracy;
    });

  // 6. Calculate improvement
  const splitIndex = Math.floor(logs.length * 0.8);
  const recentLogs = logs.slice(splitIndex);
  const earlyLogs = logs.slice(0, splitIndex);

  const recentAccuracy = recentLogs.length > 0 
    ? recentLogs.filter(l => l.status === "correct").length / recentLogs.length 
    : 0;
  const earlyAccuracy = earlyLogs.length > 0 
    ? earlyLogs.filter(l => l.status === "correct").length / earlyLogs.length 
    : 0;

  const improvement = Math.round((recentAccuracy - earlyAccuracy) * 100);

  return {
    weakChapters,
    weakSubTopics,
    subjectMastery,
    topicMastery,
    avgTimePerQuestion: timedLogs > 0 ? Math.round(totalTime / timedLogs) : 0,
    improvement: improvement > 0 ? improvement : 0,
    totalInteractions: logs.length
  };
});

// Get user progress
export const getUserProgress = cache(async () => {
  const userId = getAuthUserId();

  if (!userId) {
    return null;
  }

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  return data;
});

// Get top users by average score
export const getTopTenUsers = cache(async () => {
  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.averageScore)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      averageScore: true,
    },
  });

  return data;
});
