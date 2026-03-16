import { redirect } from "next/navigation";
import Link from "next/link";
import * as fs from "fs";
import * as path from "path";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getUserGradeHistory, getUserStats, getMockHubAnalytics, getUserProgress, getCourses } from "@/server/db/queries";
import { GRADE_BOUNDARIES } from "@/constants";
import { ArrowRight, BarChart3, Clock3, Sparkles, Target, Trophy } from "lucide-react";

interface Props {
  searchParams: { subject?: string };
}

const ProgressPage = async ({ searchParams }: Props) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userProgress = await getUserProgress();
  const allCourses = await getCourses();

  const subjectOverride = searchParams.subject
    ? allCourses.find((course) => course.title.includes(searchParams.subject!))
    : undefined;
  const activeCourse = subjectOverride ?? allCourses.find((course) => course.id === userProgress?.activeCourseId);
  const activeSubject = activeCourse?.title;
  const subjectCode = activeSubject?.match(/\d+/)?.[0];

  const allGradeHistory = await getUserGradeHistory();
  const gradeHistory = activeSubject
    ? allGradeHistory.filter((history) => history.examPaper?.subject === activeSubject)
    : allGradeHistory;

  const stats = await getUserStats();
  const analytics = await getMockHubAnalytics(userProgress?.activeCourseId ?? undefined);

  let topicAnalysis: Record<string, { priority: string; frequency: number }> = {};
  try {
    const analysisPath = path.join(process.cwd(), "topic_analysis.json");
    if (fs.existsSync(analysisPath)) {
      topicAnalysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
    }
  } catch { }

  const totalExams = gradeHistory.length;
  const averageScore = totalExams > 0
    ? Math.round(gradeHistory.reduce((acc, item) => acc + item.percentage, 0) / totalExams)
    : 0;

  const calculateGrade = (score: number) => {
    return Object.entries(GRADE_BOUNDARIES)
      .sort(([, a], [, b]) => b - a)
      .find(([, threshold]) => score >= threshold)?.[0] || "U";
  };

  const predictedGrade = calculateGrade(averageScore);
  const hasData = totalExams > 0 || (analytics?.totalInteractions || 0) > 10;
  const confidence = totalExams > 5 ? "High" : totalExams > 2 ? "Medium" : "Low";
  const improvementFactor = (analytics?.improvement || 0) / 2;
  const rawProbability = (averageScore * 0.8) + (improvementFactor * 2);
  const probability = Math.min(99, Math.round(rawProbability > 0 ? rawProbability : 45));

  const trackedTopics = (analytics?.topicMastery || []).filter((topic) => topic.attempts >= 2);
  const readinessTopics = trackedTopics.slice(0, 8).map((topic) => {
    const isHighPriority = topicAnalysis[topic.name]?.priority === "HIGH";
    const target = isHighPriority ? 85 : 75;
    return {
      ...topic,
      target,
      isHighPriority,
      onTrack: topic.accuracy >= target,
    };
  });
  const topicsOnTrack = readinessTopics.filter((topic) => topic.onTrack).length;
  const readinessRatio = readinessTopics.length > 0 ? topicsOnTrack / readinessTopics.length : 0;
  const isExamReady = hasData && averageScore >= 75 && readinessTopics.length >= 4 && readinessRatio >= 0.7;

  const mockHref = `/mock-exam${subjectCode ? `?subject=${subjectCode}` : ""}`;

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 p-6 text-white shadow-xl shadow-slate-900/15 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-teal-200">Progress Dashboard</p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl">Mock Hub Analytics</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-200">
              {hasData
                ? "Real-time performance analytics and A* probability tracking."
                : "Complete your first mock to unlock AI performance analysis."}
            </p>
            {activeSubject && (
              <span className="mt-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-teal-100">
                {activeSubject}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-teal-100">AI confidence</p>
            <p className="mt-1 text-2xl font-black">{confidence}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">Predicted Grade: {predictedGrade}</p>
            <Button asChild className="mt-4 w-full rounded-2xl bg-white text-slate-900 hover:bg-slate-100">
              <Link href={mockHref}>
                Start Random Mock
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Mocks Taken</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{totalExams}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Completed sessions</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Average Score</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{averageScore}%</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Current baseline</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">A* Probability</p>
          <p className="mt-1 text-3xl font-black text-blue-700">{probability}%</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">AI projected outcome</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Streak</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{stats?.currentStreak || 0}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Consecutive days</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Readiness Tracker</p>
            <h2 className="text-2xl font-black text-slate-900">Topic targets and exam status</h2>
            <p className="text-sm font-medium text-slate-500">
              {readinessTopics.length > 0
                ? `${topicsOnTrack}/${readinessTopics.length} topics are currently on target.`
                : "Complete at least 2 attempts per topic to unlock full readiness tracking."}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]",
              isExamReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            )}
          >
            {isExamReady ? "Exam Ready" : "Not Ready"}
          </span>
        </div>

        {readinessTopics.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {readinessTopics.map((topic) => (
              <div key={topic.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-slate-900">{topic.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]",
                      topic.onTrack ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    )}
                  >
                    {topic.onTrack ? "On Target" : "Below Target"}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Current {topic.accuracy}% from {topic.attempts} attempts. Target {topic.target}%.
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-600" style={{ width: `${topic.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">Exam History</h3>
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{totalExams} sessions</span>
          </div>
          {gradeHistory.length > 0 ? (
            <div className="space-y-3">
              {gradeHistory.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{exam.examPaper?.title || "Mock Assessment"}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {new Date(exam.completedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className="text-xl font-black text-slate-900">{exam.percentage}%</p>
                    <p className="text-xs font-bold text-slate-500">Grade {exam.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-black text-slate-700">No exam data yet.</p>
              <p className="text-xs font-semibold text-slate-500">Your A* journey begins with your first mock exam.</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">AI Guidance</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">Next Action Plan</h3>

          {analytics?.weakChapters && analytics.weakChapters.length > 0 ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                {analytics.weakChapters.slice(0, 3).map((chapter, index) => {
                  const isCritical = topicAnalysis[chapter.name]?.priority === "HIGH";
                  return (
                    <div
                      key={chapter.name}
                      className={cn(
                        "rounded-xl border p-3",
                        isCritical ? "border-rose-200 bg-rose-50" : "border-orange-200 bg-orange-50"
                      )}
                    >
                      <p className={cn("text-[10px] font-black uppercase tracking-[0.1em]", isCritical ? "text-rose-700" : "text-orange-700")}>
                        {isCritical ? "Critical Chapter" : "Weak Chapter"} {index + 1}
                      </p>
                      <p className="text-sm font-bold text-slate-800">{chapter.name}</p>
                    </div>
                  );
                })}
              </div>

              {(analytics.weakSubTopics?.length || 0) > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Sub-topic focus</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Prioritize: {analytics.weakSubTopics.slice(0, 2).map((topic) => topic.name).join(", ")}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Coach Note
                </p>
                <p className="mt-1 text-sm font-semibold text-blue-900">
                  Run one focused mock, then revisit this panel to confirm improvement in weak chapters.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <p className="text-sm font-black text-slate-700">Practice more to unlock personalized AI guidance.</p>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Link href={mockHref} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-slate-800">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Run Mock
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-slate-700 transition hover:bg-slate-50">
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Target className="h-3.5 w-3.5" /> Goal grade: {predictedGrade}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Clock3 className="h-3.5 w-3.5" /> Current streak: {stats?.currentStreak || 0} days
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProgressPage;
