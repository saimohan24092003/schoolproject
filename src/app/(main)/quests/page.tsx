import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight, CheckCircle2, Flame, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { Button, Progress } from "@/components/ui";
import { dailyGoals, quests } from "@/constants";
import { getCourses, getUserProgress } from "@/server/db/queries";
import { getUserActivityStats } from "@/server/actions/activity-tracker";

const QuestsPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [userProgress, activityStats, courses] = await Promise.all([
    getUserProgress(),
    getUserActivityStats(),
    getCourses(),
  ]);

  const points = userProgress?.points ?? 0;
  const streak = userProgress?.currentStreak ?? 0;
  const todayXP = activityStats?.todayXP ?? 0;
  const todayQuestions = activityStats?.todayQuestions ?? 0;
  const todaySessions = activityStats?.todaySessions ?? 0;

  const activeCourse = courses.find((course) => course.id === userProgress?.activeCourseId);
  const subjectCode = activeCourse?.title.match(/\d+/)?.[0];
  const practiceHref = `/learn/smart-practice${subjectCode ? `?subject=${subjectCode}` : ""}`;
  const mockHref = `/mock-exam${subjectCode ? `?subject=${subjectCode}` : ""}`;

  const dailyQuestData = [
    {
      title: dailyGoals[0]?.title ?? "Complete 1 Practice Paper",
      current: todaySessions,
      target: 1,
      unit: "sessions",
    },
    {
      title: dailyGoals[1]?.title ?? "Review 5 Questions",
      current: todayQuestions,
      target: 5,
      unit: "questions",
    },
    {
      title: dailyGoals[2]?.title ?? "Practice 30 Minutes",
      current: Math.floor(todayQuestions * 1.5),
      target: 30,
      unit: "mins",
    },
    {
      title: "Earn 50 XP Today",
      current: todayXP,
      target: 50,
      unit: "xp",
    },
  ];

  const longQuestData = quests.map((questItem) => ({
    title: questItem.title,
    current: points,
    target: questItem.value,
    unit: "xp",
  }));

  const calcPct = (current: number, target: number) => Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const isDone = (current: number, target: number) => current >= target;
  const dailyDoneCount = dailyQuestData.filter((item) => isDone(item.current, item.target)).length;
  const longDoneCount = longQuestData.filter((item) => isDone(item.current, item.target)).length;

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 p-6 text-white shadow-xl shadow-slate-900/15 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-teal-200">Quests Center</p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl">Daily Missions and XP Goals</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-200">
              Complete quests to level up faster and stay consistent with your A* roadmap.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/12 p-2">
                <Flame size={14} className="mx-auto mb-1 text-amber-200" />
                <p className="text-sm font-black">{streak}</p>
                <p className="text-[10px] font-bold text-teal-100">Streak</p>
              </div>
              <div className="rounded-xl bg-white/12 p-2">
                <Zap size={14} className="mx-auto mb-1 fill-yellow-200 text-yellow-200" />
                <p className="text-sm font-black">{points.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-teal-100">Total XP</p>
              </div>
              <div className="rounded-xl bg-white/12 p-2">
                <Target size={14} className="mx-auto mb-1 text-emerald-200" />
                <p className="text-sm font-black">{dailyDoneCount}/4</p>
                <p className="text-[10px] font-bold text-teal-100">Daily Done</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-bold text-teal-100">
              Long-term quest completion: {longDoneCount}/{longQuestData.length}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Daily Quests</p>
              <h2 className="text-xl font-black text-slate-900">Today&apos;s Missions</h2>
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-violet-700">
              {dailyDoneCount}/4 complete
            </span>
          </div>

          <div className="space-y-3">
            {dailyQuestData.map((item) => {
              const done = isDone(item.current, item.target);
              const pct = calcPct(item.current, item.target);
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {done ? "Complete" : "In Progress"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.current}/{item.target} {item.unit}
                  </p>
                  <Progress value={pct} className="mt-3 h-2 bg-slate-200" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Milestone Quests</p>
              <h2 className="text-xl font-black text-slate-900">XP Ladder</h2>
            </div>
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {longQuestData.map((item) => {
              const done = isDone(item.current, item.target);
              const pct = calcPct(item.current, item.target);
              return (
                <div key={item.title} className={`rounded-2xl border p-4 ${done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                        {pct}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {Math.min(item.current, item.target).toLocaleString()} / {item.target.toLocaleString()} xp
                  </p>
                  <Progress value={pct} className="mt-3 h-2 bg-slate-200" />
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-2.5">
            <Button asChild className="w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
              <Link href={practiceHref}>
                Continue Smart Practice
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full rounded-2xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
              <Link href={mockHref}>
                Run Mock Exam
                <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default QuestsPage;
