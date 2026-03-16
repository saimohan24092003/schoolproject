import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";
import db from "@/server/db/drizzle";
import { units, lessons, challenges, challengeProgress } from "@/server/db/schema";
import { ChevronLeft, Lock, Star, CheckCircle2, Zap, TrendingUp } from "lucide-react";
import { getTopicSetup } from "@/server/actions/topic-progress";
import { getTopicsForSubject } from "@/server/actions/smart-practice";

const SUPPORTED = ["0653", "0580", "0500", "0680"];

const SECTION_META: Record<string, {
  label: string; emoji: string;
  node: string; ring: string; badge: string; badgeText: string; line: string;
}> = {
  Biology: {
    label: "Biology", emoji: "🧬",
    node: "bg-emerald-500 hover:bg-emerald-600",
    ring: "ring-emerald-300", badge: "bg-emerald-100", badgeText: "text-emerald-700",
    line: "bg-emerald-200",
  },
  Chemistry: {
    label: "Chemistry", emoji: "⚗️",
    node: "bg-violet-500 hover:bg-violet-600",
    ring: "ring-violet-300", badge: "bg-violet-100", badgeText: "text-violet-700",
    line: "bg-violet-200",
  },
  Physics: {
    label: "Physics", emoji: "⚡",
    node: "bg-sky-500 hover:bg-sky-600",
    ring: "ring-sky-300", badge: "bg-sky-100", badgeText: "text-sky-700",
    line: "bg-sky-200",
  },
};

const SECTION_META_0580: Record<string, typeof SECTION_META.Biology> = {
  Number: {
    label: "Number", emoji: "🔢",
    node: "bg-blue-500 hover:bg-blue-600",
    ring: "ring-blue-300", badge: "bg-blue-100", badgeText: "text-blue-700",
    line: "bg-blue-200",
  },
  Algebra: {
    label: "Algebra", emoji: "📐",
    node: "bg-indigo-500 hover:bg-indigo-600",
    ring: "ring-indigo-300", badge: "bg-indigo-100", badgeText: "text-indigo-700",
    line: "bg-indigo-200",
  },
  Geometry: {
    label: "Geometry", emoji: "📏",
    node: "bg-violet-500 hover:bg-violet-600",
    ring: "ring-violet-300", badge: "bg-violet-100", badgeText: "text-violet-700",
    line: "bg-violet-200",
  },
  Trigonometry: {
    label: "Trigonometry", emoji: "📐",
    node: "bg-purple-500 hover:bg-purple-600",
    ring: "ring-purple-300", badge: "bg-purple-100", badgeText: "text-purple-700",
    line: "bg-purple-200",
  },
  Statistics: {
    label: "Statistics", emoji: "📊",
    node: "bg-cyan-500 hover:bg-cyan-600",
    ring: "ring-cyan-300", badge: "bg-cyan-100", badgeText: "text-cyan-700",
    line: "bg-cyan-200",
  },
};

const SECTION_META_0500: Record<string, typeof SECTION_META.Biology> = {
  Reading: {
    label: "Reading", emoji: "📖",
    node: "bg-amber-500 hover:bg-amber-600",
    ring: "ring-amber-300", badge: "bg-amber-100", badgeText: "text-amber-700",
    line: "bg-amber-200",
  },
  Writing: {
    label: "Writing", emoji: "✍️",
    node: "bg-orange-500 hover:bg-orange-600",
    ring: "ring-orange-300", badge: "bg-orange-100", badgeText: "text-orange-700",
    line: "bg-orange-200",
  },
  Composition: {
    label: "Composition", emoji: "📝",
    node: "bg-rose-500 hover:bg-rose-600",
    ring: "ring-rose-300", badge: "bg-rose-100", badgeText: "text-rose-700",
    line: "bg-rose-200",
  },
};

const SECTION_META_0680: Record<string, typeof SECTION_META.Biology> = {
  Atmosphere: {
    label: "Atmosphere & Weather", emoji: "🌤️",
    node: "bg-sky-500 hover:bg-sky-600",
    ring: "ring-sky-300", badge: "bg-sky-100", badgeText: "text-sky-700",
    line: "bg-sky-200",
  },
  Hydrosphere: {
    label: "Hydrosphere", emoji: "💧",
    node: "bg-blue-500 hover:bg-blue-600",
    ring: "ring-blue-300", badge: "bg-blue-100", badgeText: "text-blue-700",
    line: "bg-blue-200",
  },
  Lithosphere: {
    label: "Lithosphere", emoji: "🪨",
    node: "bg-amber-600 hover:bg-amber-700",
    ring: "ring-amber-300", badge: "bg-amber-100", badgeText: "text-amber-700",
    line: "bg-amber-200",
  },
  Biosphere: {
    label: "Biosphere", emoji: "🌿",
    node: "bg-emerald-500 hover:bg-emerald-600",
    ring: "ring-emerald-300", badge: "bg-emerald-100", badgeText: "text-emerald-700",
    line: "bg-emerald-200",
  },
  Population: {
    label: "Human Population", emoji: "👥",
    node: "bg-violet-500 hover:bg-violet-600",
    ring: "ring-violet-300", badge: "bg-violet-100", badgeText: "text-violet-700",
    line: "bg-violet-200",
  },
  Agriculture: {
    label: "Agriculture", emoji: "🌾",
    node: "bg-green-500 hover:bg-green-600",
    ring: "ring-green-300", badge: "bg-green-100", badgeText: "text-green-700",
    line: "bg-green-200",
  },
  Energy: {
    label: "Energy & Environment", emoji: "⚡",
    node: "bg-yellow-500 hover:bg-yellow-600",
    ring: "ring-yellow-300", badge: "bg-yellow-100", badgeText: "text-yellow-700",
    line: "bg-yellow-200",
  },
  Industry: {
    label: "Industry", emoji: "🏭",
    node: "bg-gray-500 hover:bg-gray-600",
    ring: "ring-gray-300", badge: "bg-gray-100", badgeText: "text-gray-700",
    line: "bg-gray-200",
  },
};

const DEFAULT_META = {
  label: "General", emoji: "📚",
  node: "bg-gray-400 hover:bg-gray-500",
  ring: "ring-gray-300", badge: "bg-gray-100", badgeText: "text-gray-700",
  line: "bg-gray-200",
};

function getSectionMeta(unitTitle: string, code?: string) {
  const t = unitTitle.toLowerCase();
  // 0653 — Combined Science
  if (t.includes("biology")) return SECTION_META.Biology;
  if (t.includes("chemistry")) return SECTION_META.Chemistry;
  if (t.includes("physics")) return SECTION_META.Physics;
  // 0580 — Mathematics
  if (code === "0580") {
    if (t.includes("number")) return SECTION_META_0580.Number;
    if (t.includes("algebra")) return SECTION_META_0580.Algebra;
    if (t.includes("coordinate") || t.includes("geometry")) return SECTION_META_0580.Geometry;
    if (t.includes("mensuration")) return SECTION_META_0580.Geometry;
    if (t.includes("trigonometry")) return SECTION_META_0580.Trigonometry;
    if (t.includes("transformation") || t.includes("vector")) return SECTION_META_0580.Algebra;
    if (t.includes("probability") || t.includes("statistic")) return SECTION_META_0580.Statistics;
  }
  // 0500 — English First Language
  if (code === "0500") {
    if (t.includes("reading")) return SECTION_META_0500.Reading;
    if (t.includes("writing") || t.includes("directed")) return SECTION_META_0500.Writing;
    if (t.includes("composition")) return SECTION_META_0500.Composition;
  }
  // 0680 — Environmental Management
  if (code === "0680") {
    if (t.includes("atmosphere") || t.includes("weather") || t.includes("climate")) return SECTION_META_0680.Atmosphere;
    if (t.includes("hydro") || t.includes("water")) return SECTION_META_0680.Hydrosphere;
    if (t.includes("litho") || t.includes("rock") || t.includes("soil")) return SECTION_META_0680.Lithosphere;
    if (t.includes("bio") || t.includes("ecosystem") || t.includes("forest")) return SECTION_META_0680.Biosphere;
    if (t.includes("popul") || t.includes("human")) return SECTION_META_0680.Population;
    if (t.includes("agri") || t.includes("farm") || t.includes("food")) return SECTION_META_0680.Agriculture;
    if (t.includes("energy") || t.includes("power") || t.includes("fuel")) return SECTION_META_0680.Energy;
    if (t.includes("indust") || t.includes("manufactur")) return SECTION_META_0680.Industry;
    return { ...DEFAULT_META, label: "Environmental Management", emoji: "🌍", node: "bg-emerald-500 hover:bg-emerald-600", ring: "ring-emerald-300", badge: "bg-emerald-100", badgeText: "text-emerald-700", line: "bg-emerald-200" };
  }
  return DEFAULT_META;
}

export default async function SubjectPage({ params }: { params: { code: string } }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { code } = params;
  if (!SUPPORTED.includes(code)) redirect("/dashboard");

  // Onboarding gate: first-time users must select their covered topics
  const topicSetup = await getTopicSetup(code);
  if (!topicSetup?.onboardingDone) redirect(`/onboarding/${code}`);

  const course = await db.query.courses.findFirst({
    where: (c, { like }) => like(c.title, `%${code}%`),
  });
  if (!course) redirect("/dashboard");

  const allUnits = await db.query.units.findMany({
    where: eq(units.courseId, course.id),
    orderBy: (u, { asc }) => asc(u.order),
  });

  const allLessons = await db.query.lessons.findMany({
    where: inArray(lessons.unitId, allUnits.map((u) => u.id)),
    orderBy: (l, { asc }) => asc(l.order),
  });

  const lessonIds = allLessons.map((l) => l.id);
  const allChallenges = lessonIds.length
    ? await db.query.challenges.findMany({ where: inArray(challenges.lessonId, lessonIds) })
    : [];

  const completedProgress = allChallenges.length
    ? await db.query.challengeProgress.findMany({
      where: and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.completed, true),
        inArray(challengeProgress.challengeId, allChallenges.map((c) => c.id))
      ),
    })
    : [];

  const completedIds = new Set(completedProgress.map((p) => p.challengeId));

  // Also load past-paper question counts (for subjects where MCQ is in examPapers, not challenges)
  const pastPaperTopics = await getTopicsForSubject(course.title, "O-Level");
  const pastPaperCountByTopic = new Map(pastPaperTopics.map(t => [t.name.toLowerCase().trim(), t.count]));

  const challengesByLesson: Record<number, { total: number; done: number }> = {};
  for (const ch of allChallenges) {
    if (!challengesByLesson[ch.lessonId]) challengesByLesson[ch.lessonId] = { total: 0, done: 0 };
    challengesByLesson[ch.lessonId].total++;
    if (completedIds.has(ch.id)) challengesByLesson[ch.lessonId].done++;
  }

  // Merge: for each lesson, if past-paper count > challenges count, use past-paper count as total
  for (const lesson of allLessons) {
    const ppCount = pastPaperCountByTopic.get(lesson.title.toLowerCase().trim()) ?? 0;
    if (ppCount > 0) {
      if (!challengesByLesson[lesson.id]) challengesByLesson[lesson.id] = { total: 0, done: 0 };
      challengesByLesson[lesson.id].total = Math.max(challengesByLesson[lesson.id].total, ppCount);
    }
  }

  const lessonsByUnit: Record<number, typeof allLessons> = {};
  for (const l of allLessons) {
    if (!lessonsByUnit[l.unitId]) lessonsByUnit[l.unitId] = [];
    lessonsByUnit[l.unitId].push(l);
  }

  const totalQ = allChallenges.length;
  const totalDone = completedIds.size;
  const overallPct = totalQ > 0 ? Math.round((totalDone / totalQ) * 100) : 0;

  // Find first incomplete lesson (the "active" one)
  let activeSet = false;
  const activeLessonId: number | null = (() => {
    for (const lesson of allLessons) {
      const s = challengesByLesson[lesson.id];
      if (s && s.done < s.total) return lesson.id;
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-100 sticky top-0 z-20 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="font-black text-gray-900 text-base leading-tight">{course.title}</h1>
            <p className="text-xs font-bold text-gray-400">Cambridge IGCSE · {code}</p>
          </div>
          <Link
            href={`/subject/${code}/insights`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <TrendingUp size={15} className="text-blue-600" />
            <span className="text-xs font-black text-blue-600">Insights</span>
          </Link>
          <div className="text-right">
            <p className="text-lg font-black text-blue-600">{overallPct}%</p>
            <p className="text-[10px] font-bold text-gray-400">Complete</p>
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="max-w-2xl mx-auto mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Skill tree */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-10">
        {allUnits.map((unit) => {
          const meta = getSectionMeta(unit.title, code);
          const lessonList = lessonsByUnit[unit.id] ?? [];

          // per-unit progress
          const unitChallenges = lessonList.flatMap(l =>
            allChallenges.filter(c => c.lessonId === l.id)
          );
          const unitDone = unitChallenges.filter(c => completedIds.has(c.id)).length;
          const unitPct = unitChallenges.length > 0
            ? Math.round((unitDone / unitChallenges.length) * 100) : 0;

          return (
            <div key={unit.id}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl ${meta.node} flex items-center justify-center text-xl shadow-sm`}>
                  {meta.emoji}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-black uppercase tracking-widest ${meta.badgeText}`}>
                    {meta.label}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.node.split(" ")[0]} transition-all`}
                        style={{ width: `${unitPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-gray-400">{unitPct}%</span>
                  </div>
                </div>
              </div>

              {/* Chapter nodes — winding path */}
              <div className="relative">
                {lessonList.map((lesson, idx) => {
                  const stats = challengesByLesson[lesson.id] ?? { total: 0, done: 0 };
                  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                  const isDone = pct === 100 && stats.total > 0;
                  const isActive = lesson.id === activeLessonId;
                  const isLocked = !isDone && !isActive && stats.done === 0 && idx > 0;
                  const slug = encodeURIComponent(lesson.title);

                  // Alternate node position: even = left-ish, odd = right-ish
                  const isRight = idx % 2 === 1;

                  return (
                    <div key={lesson.id} className={`flex ${isRight ? "justify-end" : "justify-start"} mb-4 relative`}>
                      {/* Connecting line (vertical) */}
                      {idx > 0 && (
                        <div
                          className={`absolute top-0 ${isRight ? "right-[52px]" : "left-[52px]"} w-0.5 -translate-y-full h-4 ${isDone ? meta.node.split(" ")[0] : "bg-gray-200"}`}
                        />
                      )}

                      {isLocked ? (
                        <div className={`flex items-center gap-4 ${isRight ? "flex-row-reverse" : "flex-row"} max-w-[88%] cursor-not-allowed opacity-50`}>
                          <div className="relative shrink-0 w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-md bg-gray-200">
                            <Lock size={22} className="text-gray-400" />
                          </div>
                          <div className="flex-1 bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm">
                            <p className="font-black text-sm text-gray-900 leading-tight truncate">{lesson.title}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">🔒 Complete previous chapter first</p>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={`/subject/${code}/${slug}`}
                          className={`flex items-center gap-4 ${isRight ? "flex-row-reverse" : "flex-row"} max-w-[88%]`}
                        >
                          {/* Node circle */}
                          <div className={`relative shrink-0 w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-md transition-all
                            ${isDone
                              ? `${meta.node} ring-4 ${meta.ring} ring-offset-2`
                              : isActive
                                ? `${meta.node} ring-4 ${meta.ring} ring-offset-2 animate-pulse-glow`
                                : `${meta.node} opacity-80`
                            }`}
                          >
                            {isDone
                              ? <CheckCircle2 size={28} className="text-white" />
                              : isActive
                                ? <Star size={26} className="text-white fill-white" />
                                : <span className="text-white font-black text-sm">{idx + 1}</span>
                            }
                            {stats.total > 0 && (
                              <div className={`absolute -top-1 -right-1 ${meta.badge} ${meta.badgeText} rounded-full w-6 h-6 flex items-center justify-center`}>
                                <Zap size={12} />
                              </div>
                            )}
                          </div>
                          {/* Card */}
                          <div className={`flex-1 bg-white rounded-2xl border-2 p-4 transition-all shadow-sm hover:shadow-md
                            ${isDone ? `${meta.ring.replace("ring-", "border-").replace("-300", "-200")}` : "border-gray-100"}
                            ${isActive ? "border-blue-300 shadow-blue-100 shadow-md" : ""}
                          `}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-gray-900 leading-tight truncate">{lesson.title}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{stats.total} questions</p>
                              </div>
                              {isDone && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Done!</span>}
                              {isActive && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0 animate-pulse">Start!</span>}
                            </div>
                            {stats.total > 0 && (
                              <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isDone ? meta.node.split(" ")[0] : "bg-blue-400"} transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
