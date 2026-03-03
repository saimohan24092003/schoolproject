
import { redirect } from "next/navigation";
import Link from "next/link";
import * as fs from "fs";
import * as path from "path";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getUserGradeHistory, getUserStats, getMockHubAnalytics, getUserProgress, getCourses } from "@/server/db/queries";
import { GRADE_BOUNDARIES } from "@/constants";

const ProgressPage = async () => {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userProgress = await getUserProgress();
  const allCourses = await getCourses();
  const activeCourse = allCourses.find(c => c.id === userProgress?.activeCourseId);
  const activeSubject = activeCourse?.title;

  const allGradeHistory = await getUserGradeHistory();
  // Filter history to show only records for the active subject
  const gradeHistory = activeSubject
    ? allGradeHistory.filter(h => h.examPaper?.subject === activeSubject)
    : allGradeHistory;

  const stats = await getUserStats();
  const analytics = await getMockHubAnalytics(userProgress?.activeCourseId ?? undefined);

  // Load Topic Analysis for Critical Prioritization
  let topicAnalysis: Record<string, { priority: string, frequency: number }> = {};
  try {
    const analysisPath = path.join(process.cwd(), "topic_analysis.json");
    if (fs.existsSync(analysisPath)) {
        topicAnalysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
    }
  } catch (e) {}

  // Calculate statistics
  const totalExams = gradeHistory.length;
  const averageScore = totalExams > 0
    ? Math.round(gradeHistory.reduce((acc, g) => acc + g.percentage, 0) / totalExams)
    : 0;

  // Unified Grading Logic based on official GRADE_BOUNDARIES
  const calculateGrade = (score: number) => {
    return Object.entries(GRADE_BOUNDARIES)
      .sort(([, a], [, b]) => b - a)
      .find(([_, threshold]) => score >= threshold)?.[0] || "U";
  };

  const predictedGrade = calculateGrade(averageScore);

  // Grade Probability Logic (Task 5)
  const hasData = totalExams > 0 || (analytics?.totalInteractions || 0) > 10;
  const confidence = totalExams > 5 ? "High" : totalExams > 2 ? "Medium" : "Low";
  
  // Future Probability: Projected based on mastery and improvement
  const improvementFactor = (analytics?.improvement || 0) / 2;
  const rawProbability = (averageScore * 0.8) + (improvementFactor * 2);
  const probability = Math.min(99, Math.round(rawProbability > 0 ? rawProbability : 45));

  // A* readiness dashboard metrics
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
  const isExamReady =
    hasData &&
    averageScore >= 75 &&
    readinessTopics.length >= 4 &&
    readinessRatio >= 0.7;

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Mock Hub</h1>
            <p className="text-gray-500 font-medium mt-1">
                {hasData ? "Real-time performance analytics and A* probability tracking." : "Complete your first mock to unlock AI performance analysis."}
            </p>
            {activeSubject && (
              <span className="inline-block mt-2 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">
                {activeSubject}
              </span>
            )}
        </div>
        <Button size="lg" className="rounded-2xl font-black h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 text-white" asChild>
            <Link href={`/mock-exam${activeCourse ? `?subject=${activeCourse.title.match(/\d+/)?.[0]}` : ""}`}>Start Random Mock →</Link>
        </Button>
      </div>

      {/* 2. AI Grade Probability */}
      <div className="bg-gray-900 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-blue-600/30"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {hasData ? (
                <>
                    <div className="space-y-6">
                        <div className="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-black rounded-full border border-blue-500/20 tracking-widest uppercase">
                            AI Analysis Status: {confidence} Confidence
                        </div>
                        <h2 className="text-3xl lg:text-5xl font-black leading-[1.1]">
                            Predicted Exam <br/> <span className="text-blue-400 text-6xl lg:text-8xl">Grade: {predictedGrade}</span>
                        </h2>
                        <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-md">
                            Based on your performance in {totalExams} mock simulations, your current probability of scoring an A* is <span className="text-white font-black">{probability}%</span>.
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Mastery Level</span>
                            <span className="text-2xl font-black text-blue-400">{averageScore}%</span>
                        </div>
                        <div className="w-full bg-white/10 h-4 rounded-full overflow-hidden border border-white/5 p-1">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: `${averageScore}%` }}></div>
                        </div>
                          <div className="grid grid-cols-2 gap-4 pt-4">
                              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1">Consistency</p>
                                  <p className="text-xl font-black">{stats?.currentStreak || 0} Days</p>
                              </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1">Improvement</p>
                                <p className="text-xl font-black text-green-400">+{analytics?.improvement || 0}%</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="col-span-full text-center py-12 space-y-6">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
                        <span className="text-4xl">📊</span>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black">Waiting for Performance Data</h2>
                        <p className="text-gray-400 max-w-md mx-auto font-medium leading-relaxed">
                            Start your first mock exam or practice session to allow the AI to analyze your mastery level and predict your final grade.
                        </p>
                    </div>
                    <Button size="lg" className="bg-white hover:bg-gray-100 text-gray-900 border border-white/20 font-black rounded-2xl px-10" asChild>
                        <Link href={`/mock-exam${activeCourse ? `?subject=${activeCourse.title.match(/\d+/)?.[0]}` : ""}`}>Launch Your First Mock →</Link>
                    </Button>
                </div>
            )}
        </div>
      </div>

      {/* 3. Performance Breakdown */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700">
            {analytics?.subjectMastery.map((mastery) => (
                <div key={mastery.name} className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <p className="font-black text-gray-900 uppercase tracking-tighter">{mastery.name}</p>
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", 
                            mastery.accuracy >= 80 ? "bg-green-100 text-green-600" : mastery.accuracy >= 60 ? "bg-orange-100 text-orange-600" : "bg-rose-100 text-rose-600"
                        )}>
                            {mastery.accuracy >= 80 ? "STRONG" : mastery.accuracy >= 60 ? "STABLE" : "WEAK"}
                        </span>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className="text-4xl font-black text-gray-900">{mastery.accuracy}%</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Accuracy</p>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000",
                            mastery.accuracy >= 80 ? "bg-green-500" : mastery.accuracy >= 60 ? "bg-orange-500" : "bg-rose-500"
                        )} style={{ width: `${mastery.accuracy}%` }}></div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* 4. A* Readiness Dashboard */}
      <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">A* Readiness Dashboard</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">Topic Targets and Exam Status</h3>
            <p className="text-sm text-gray-500 font-medium mt-1">
              You are {topicsOnTrack}/{readinessTopics.length || 0} topics on target in tracked areas.
            </p>
          </div>
          <div
            className={cn(
              "px-4 py-2 rounded-full text-xs font-black border uppercase tracking-widest w-fit",
              isExamReady
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}
          >
            {isExamReady ? "Exam Ready" : "Not Ready"}
          </div>
        </div>

        {readinessTopics.length > 0 ? (
          <div className="mt-6 space-y-3">
            {readinessTopics.map((topic) => (
              <div key={topic.name} className="border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-gray-900 truncate">{topic.name}</p>
                  <span
                    className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0",
                      topic.onTrack ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}
                  >
                    {topic.onTrack ? "On Target" : "Below Target"}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-gray-500 flex items-center justify-between">
                  <span>Current: {topic.accuracy}% ({topic.attempts} attempts)</span>
                  <span>Target: {topic.target}%{topic.isHighPriority ? " (high priority)" : ""}</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${topic.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6">
            <p className="text-sm font-black text-gray-700">Not enough topic data yet.</p>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Complete at least 2 attempts on multiple topics to unlock readiness tracking.
            </p>
          </div>
        )}
      </div>

      {/* 5. Performance History & AI Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                Exam History
                <span className="text-sm font-bold text-gray-400">({totalExams} Sessions)</span>
            </h3>
            <div className="space-y-4">
                {gradeHistory.length > 0 ? (
                    gradeHistory.map((exam) => (
                        <div key={exam.id} className="bg-white border-2 border-gray-100 rounded-3xl p-6 flex items-center justify-between hover:border-blue-100 transition-all shadow-sm group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border-2 transition-colors ${
                                    exam.grade === "A*" ? "bg-purple-50 border-purple-100 text-purple-600" :
                                    exam.grade === "A" ? "bg-blue-50 border-blue-100 text-blue-600" :
                                    "bg-gray-50 border-gray-100 text-gray-600"
                                }`}>
                                    {exam.grade}
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                                        {exam.examPaper?.title || "Mock Assessment"}
                                    </p>
                                    <p className="text-xs font-bold text-gray-400 mt-1">
                                        {new Date(exam.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-gray-900">{exam.percentage}%</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Correct Answers</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                        <div className="text-5xl mb-4 grayscale opacity-20">📝</div>
                        <p className="text-gray-500 font-black">No exam data yet.</p>
                        <p className="text-sm text-gray-400 font-medium">Your A* journey begins with your first mock exam.</p>
                    </div>
                )}
            </div>
        </div>

        {/* 6. A* Improvement Guidance (Real Performance Analysis) */}
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">AI Guidance</h3>
            <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                {analytics?.weakChapters && analytics.weakChapters.length > 0 ? (
                    <>
                        <div className="space-y-4">
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Focus Chapters</p>
                            <div className="space-y-3">
                                {analytics.weakChapters.map((chapter, i) => {
                                    const isHighPriority = topicAnalysis[chapter.name]?.priority === "HIGH";
                                    return (
                                        <div key={i} className={cn("flex items-center gap-3 p-4 rounded-2xl border transition-all",
                                            isHighPriority ? "bg-rose-50 border-rose-100 shadow-sm" : "bg-orange-50 border-orange-100"
                                        )}>
                                            <span className="text-2xl">{isHighPriority ? "🔥" : "⚠️"}</span>
                                            <div>
                                                <p className={cn("text-[10px] font-black uppercase tracking-tighter",
                                                    isHighPriority ? "text-rose-700" : "text-orange-700"
                                                )}>
                                                    {isHighPriority ? "CRITICAL CHAPTER" : "WEAK CHAPTER"}
                                                </p>
                                                <p className="text-sm font-black text-gray-900 line-clamp-1">{chapter.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Action Plan</p>
                            <ul className="space-y-4">
                                {analytics.weakSubTopics && analytics.weakSubTopics.length > 0 ? (
                                    <>
                                        <li className="flex gap-3 text-sm font-black text-gray-600">
                                            <span className="text-blue-600 shrink-0">01</span>
                                            <span>Eliminate errors in <span className="text-blue-600">&quot;{analytics.weakSubTopics[0].name}&quot;</span>.</span>
                                        </li>
                                        {analytics.weakSubTopics[1] && (
                                            <li className="flex gap-3 text-sm font-black text-gray-600">
                                                <span className="text-blue-600 shrink-0">02</span>
                                                <span>Review theory for <span className="text-blue-600">&quot;{analytics.weakSubTopics[1].name}&quot;</span>.</span>
                                            </li>
                                        )}
                                    </>
                                ) : (
                                    <li className="flex gap-3 text-sm font-black text-gray-600">
                                        <span className="text-blue-600 shrink-0">01</span>
                                        Target 100% accuracy in chapter &quot;{analytics.weakChapters[0].name}&quot;.
                                    </li>
                                )}
                                <li className="flex gap-3 text-sm font-black text-gray-600">
                                    <span className="text-blue-600 shrink-0">Auto</span>
                                    Complete more sessions to refine this AI guidance.
                                </li>
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="py-12 text-center space-y-4 grayscale opacity-40">
                        <div className="text-5xl">🤖</div>
                        <p className="text-sm font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                            Practice more to unlock <br/> personalized AI guidance.
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
