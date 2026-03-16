import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getCourses, getUserProgress } from "@/server/db/queries";
import { getUserActivityStats } from "@/server/actions/activity-tracker";
import { getUserRoadmapProgress, getTodaysMissions } from "@/server/actions/roadmap";
import { getTopicSetup } from "@/server/actions/topic-progress";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  Compass,
  FlaskConical,
  Lock,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

const SUBJECTS = [
  {
    code: "0653",
    name: "Combined Science",
    tags: ["Biology", "Chemistry", "Physics"],
    tone: "from-emerald-500 to-cyan-500",
  },
  {
    code: "0580",
    name: "Mathematics",
    tags: ["Paper 2", "Paper 4"],
    tone: "from-blue-500 to-indigo-500",
  },
  {
    code: "0500",
    name: "English First Language",
    tags: ["Reading", "Writing"],
    tone: "from-amber-500 to-orange-500",
  },
  {
    code: "0680",
    name: "Environmental Management",
    tags: ["Atmosphere", "Hydrosphere"],
    tone: "from-sky-500 to-teal-500",
  },
  {
    code: "0549",
    name: "Hindi as a Second Language",
    tags: ["Reading", "Writing", "Listening"],
    tone: "from-orange-500 to-rose-500",
  },
] as const;

const STATIC_QUICK_ACTIONS = [
  { title: "Mock Exam",  href: "/mock-exam",  subtitle: "Timed full-paper simulation", icon: FlaskConical },
  { title: "Progress",  href: "/progress",   subtitle: "Track marks and weak topics",  icon: BarChart3 },
  { title: "Quests",    href: "/quests",      subtitle: "Daily XP missions",           icon: Trophy },
] as const;

const DashboardPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [userProgress, activityStats, allCourses] = await Promise.all([
    getUserProgress(),
    getUserActivityStats(),
    getCourses(),
  ]);

  const points = userProgress?.points ?? 0;
  const streak = userProgress?.currentStreak ?? 0;
  const level = Math.floor(points / 200) + 1;
  const xpInLevel = points % 200;

  const dailyGoal = 50;
  const todayXP = activityStats?.todayXP ?? 0;
  const todayQuestions = activityStats?.todayQuestions ?? 0;
  const dailyDone = todayXP >= dailyGoal;
  const dailyPct = Math.min(100, Math.round((todayXP / dailyGoal) * 100));

  // Use the user's active course; fall back to 0653 if not set
  const activeCourse = allCourses.find((c) => c.id === userProgress?.activeCourseId);
  const primaryCode = activeCourse?.title.match(/\((\d{4})\)/)?.[1] ?? "0653";
  const [roadmap, setup, missions] = await Promise.all([
    getUserRoadmapProgress(primaryCode).catch(() => null),
    getTopicSetup(primaryCode).catch(() => null),
    getTodaysMissions(primaryCode).catch(() => [] as Awaited<ReturnType<typeof getTodaysMissions>>),
  ]);

  const onboardingDone = setup?.onboardingDone ?? false;
  const roadmapPct = roadmap?.pct ?? 0;
  const nextLevel = roadmap?.nextLevel ?? 1;
  const completedCount = roadmap?.completedCount ?? 0;
  const nextLevelTitle = roadmap?.levels?.find((item) => item.level === nextLevel)?.title ?? "Start Practice";
  const paperPref = setup?.paperPreference ?? "both";
  const targetGrade = setup?.targetGrade ?? "A*";
  const paperTypeQuery = paperPref === "both" ? "" : `&paperType=${paperPref}`;
  // Map roadmap level (1-50) → practice level (1/2/3)
  const practiceLevel = nextLevel <= 30 ? (nextLevel <= 16 ? 1 : 2) : 3;
  const nextRoadmapHref = `/learn/smart-practice?subject=${primaryCode}&level=${practiceLevel}&roadmapLevel=${nextLevel}${paperTypeQuery}`;
  const combinedScienceHubHref = "/dashboard/combined-science";

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 p-6 text-white shadow-xl shadow-slate-900/15 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-teal-200">A* Mission Dashboard</p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl">
              Welcome back, {user.firstName ?? "Student"}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-200">
              {dailyDone
                ? `Daily goal complete. You earned ${todayXP} XP today.`
                : `${Math.max(0, dailyGoal - todayXP)} XP left to complete your daily target.`}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 md:max-w-md">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
                <p className="text-2xl font-black">{streak}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-100">Streak</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
                <p className="text-2xl font-black">{todayXP}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-100">XP Today</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
                <p className="text-2xl font-black">{todayQuestions}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-100">Questions</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-teal-100">
              <span>Level progress</span>
              <span>Level {level}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-yellow-300"
                style={{ width: `${Math.min(100, (xpInLevel / 200) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {xpInLevel}/200 XP to level {level + 1}
            </p>

            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-teal-100">
                <span>Daily goal</span>
                <span>{dailyDone ? "Complete" : `${todayXP}/${dailyGoal}`}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className={`h-full rounded-full ${dailyDone ? "bg-emerald-300" : "bg-amber-300"}`}
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {onboardingDone ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Roadmap active</p>
                  <h2 className="text-xl font-black text-slate-900">A* roadmap progress</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Combined Science - Paper {paperPref === "both" ? "2 and 4" : paperPref} - Target {targetGrade}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900">
                    {completedCount}
                    <span className="text-lg text-slate-400">/50</span>
                  </p>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-500">{roadmapPct}% done</p>
                </div>
              </div>

              <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-600"
                  style={{ width: `${Math.max(2, roadmapPct)}%` }}
                />
              </div>

              <div className="mb-5 flex gap-1">
                {Array.from({ length: 10 }).map((_, index) => {
                  const done = index < completedCount;
                  return (
                    <span
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${done ? "bg-violet-500" : "bg-slate-200"}`}
                    />
                  );
                })}
              </div>

              <Link
                href={nextRoadmapHref}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-white transition hover:from-violet-500 hover:to-blue-500"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-100">Next level {nextLevel}</p>
                  <p className="text-sm font-bold">{nextLevelTitle}</p>
                </div>
                <ArrowRight size={18} />
              </Link>

              <Link
                href={combinedScienceHubHref}
                className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition hover:text-violet-600"
              >
                <Target size={12} />
                Manage paper and onboarding
              </Link>
            </>
          ) : (
            <Link
              href={combinedScienceHubHref}
              className="group block rounded-2xl bg-gradient-to-br from-violet-600 to-blue-700 p-6 text-white transition hover:shadow-lg"
            >
              <div className="mb-3 inline-flex rounded-xl bg-white/20 p-2">
                <Compass size={20} />
              </div>
              <p className="text-lg font-black">Set up your A* roadmap</p>
              <p className="mt-1 text-sm font-medium text-violet-100">
                Tell us your paper preference and exam timeline. We will build your level 1 to 50 path.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-black">
                Start setup
                <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Quick actions</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {/* Smart Practice — always links to active subject */}
            <Link
              href={`/learn/smart-practice?subject=${primaryCode}`}
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300 hover:bg-white hover:shadow-sm"
            >
              <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-teal-600 shadow-sm">
                <Zap size={18} />
              </div>
              <p className="text-sm font-black text-slate-900">Smart Practice</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Topic drills with adaptive levels</p>
            </Link>
            {STATIC_QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300 hover:bg-white hover:shadow-sm"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-teal-600 shadow-sm">
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-black text-slate-900">{action.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{action.subtitle}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {missions.length > 0 && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm md:p-6">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-violet-600">Today&apos;s Missions</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {missions.map((m) => {
              const mPracticeLevel = m.level <= 16 ? 1 : m.level <= 30 ? 2 : 3;
              const mPaperType = m.paperPref === "both" ? "" : `&paperType=${m.paperPref}`;
              const mHref = `/learn/smart-practice?subject=${primaryCode}&level=${mPracticeLevel}&roadmapLevel=${m.level}${mPaperType}`;
              return (
                <Link
                  key={m.level}
                  href={mHref}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 transition hover:border-violet-400 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-violet-500">Level {m.level}</p>
                    <p className="truncate text-sm font-bold text-slate-800">{m.title}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{m.xpReward} XP</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-violet-400 transition group-hover:text-violet-600" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Subjects</p>
          <Sparkles size={15} className="text-teal-600" />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {SUBJECTS.map((subject) => (
            <div key={subject.code} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className={`h-1.5 bg-gradient-to-r ${subject.tone}`} />
              <div className="p-4">
                <p className="text-sm font-black text-slate-900">{subject.name}</p>
                <p className="text-xs font-semibold text-slate-500">Code {subject.code}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {subject.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/learn/smart-practice?subject=${subject.code}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black text-white transition active:scale-[0.97] bg-gradient-to-r ${subject.tone}`}
                  >
                    <Zap size={12} />
                    Practice
                  </Link>
                  <Link
                    href={subject.code === "0653" ? combinedScienceHubHref : `/subject/${subject.code}`}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Coming soon</p>
        <div className="space-y-2">
          {[
            { code: "0510", name: "English as a Second Language" },
            { code: "0457", name: "Global Perspectives" },
          ].map((subject) => (
            <div key={subject.code} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-700">{subject.name}</p>
                <p className="text-xs font-semibold text-slate-500">Code {subject.code}</p>
              </div>
              <Lock size={14} className="text-slate-400" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
        <div className="flex items-center gap-2">
          <BookOpen size={16} />
          Students who complete all 50 levels with consistent mock review are expected to reach top-band IGCSE performance.
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
