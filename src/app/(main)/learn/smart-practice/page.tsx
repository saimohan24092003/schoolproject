import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Target, Zap, PenLine } from "lucide-react";
import { getSmartPracticeTopicCatalog } from "@/server/actions/smart-practice";
import { getSubjectTopicProgress } from "@/server/actions/topic-progress";
import { getCourses, getUserProgress } from "@/server/db/queries";
import { getSubjectConfig } from "@/lib/subject-config";
import TopicsBrowser from "./topics-browser";

interface Props {
  searchParams: {
    subject?: string;
    paperType?: string;
    level?: string;
    roadmapLevel?: string;
  };
}

const SmartPracticePage = async ({ searchParams }: Props) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const roadmapLevelNum = searchParams.roadmapLevel ? parseInt(searchParams.roadmapLevel, 10) : undefined;
  const forcedLevel = searchParams.level ? (parseInt(searchParams.level, 10) as 1 | 2 | 3) : undefined;

  const [userProgress, allCourses] = await Promise.all([getUserProgress(), getCourses()]);
  const activeCourse = allCourses.find((course) => course.id === userProgress?.activeCourseId);

  const subjectOverride = searchParams.subject
    ? allCourses.find((course) => course.title.includes(searchParams.subject!))?.title
    : undefined;

  const currentSubject = subjectOverride ?? activeCourse?.title ?? "Combined Science (0653)";
  const subjectCode = searchParams.subject?.match(/^\d{4}$/)
    ? searchParams.subject
    : currentSubject.match(/\((\d{4})\)/)?.[1] ?? "0653";

  const topics = await getSmartPracticeTopicCatalog(currentSubject, "O-Level", user.id);

  const levelProgressRows = await getSubjectTopicProgress(subjectCode);
  const topicLevelMap: Record<string, { l1: boolean; l2: boolean; l3: boolean }> = {};
  for (const row of levelProgressRows) {
    topicLevelMap[row.topicName] = {
      l1: row.levels[1]?.completed ?? false,
      l2: row.levels[2]?.completed ?? false,
      l3: row.levels[3]?.completed ?? false,
    };
  }

  const initialPaperType =
    ["P2", "P4", "P6"].includes(searchParams.paperType ?? "")
      ? (searchParams.paperType as "P2" | "P4" | "P6")
      : undefined;

  const masteredCount = Object.values(topicLevelMap).filter((state) => state.l1 && state.l2 && state.l3).length;
  const inProgressCount = Object.values(topicLevelMap).filter((state) => (state.l1 || state.l2 || state.l3) && !(state.l1 && state.l2 && state.l3)).length;

  const subjectCfg = getSubjectConfig(subjectCode);
  const isTheoryOnly = !subjectCfg.hasMCQ;

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-teal-700 via-teal-800 to-blue-900 p-6 text-white shadow-lg shadow-slate-900/15 md:p-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-teal-100 transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-teal-200">Smart Practice</p>
            <h1 className="mt-1 text-3xl font-black">Topic Mastery Track</h1>
            <p className="mt-2 text-sm font-medium text-teal-100">{currentSubject}</p>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-200">
              Complete level 1 to 3 in each topic. Progress unlocks stronger exam-style questions automatically.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
              <BookOpen size={16} className="mx-auto mb-1 text-teal-100" />
              <p className="text-lg font-black">{topics.length}</p>
              <p className="text-[11px] font-bold text-teal-100">Topics</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
              <Target size={16} className="mx-auto mb-1 text-teal-100" />
              <p className="text-lg font-black">{inProgressCount}</p>
              <p className="text-[11px] font-bold text-teal-100">In progress</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
              <Zap size={16} className="mx-auto mb-1 fill-yellow-200 text-yellow-200" />
              <p className="text-lg font-black">{masteredCount}</p>
              <p className="text-[11px] font-bold text-teal-100">Mastered</p>
            </div>
          </div>
        </div>
      </section>

      {isTheoryOnly && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-600">
              <PenLine size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-violet-900">Written Answer Practice</p>
              <p className="mt-0.5 text-xs font-medium text-violet-700">
                Type or photograph your answer — AI marks it against the Cambridge mark scheme and gives instant feedback with hints.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjectCfg.levels.map(l => (
                  <span key={l.level} className="rounded-full bg-violet-100 border border-violet-200 px-2.5 py-1 text-[10px] font-black text-violet-700">
                    L{l.level}: {l.label} · {l.markRange ? `${l.markRange[0]}–${l.markRange[1] > 50 ? `${l.markRange[0]}+` : l.markRange[1]}m` : "Mixed"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Choose topic and level</p>
          <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-teal-600">
            Start
            <ArrowRight size={14} />
          </span>
        </div>

        <TopicsBrowser
          subject={currentSubject}
          topics={topics}
          topicLevelMap={topicLevelMap}
          subjectCode={subjectCode}
          initialPaperType={initialPaperType}
          roadmapLevel={roadmapLevelNum}
          forcedLevel={forcedLevel}
        />
      </section>
    </div>
  );
};

export default SmartPracticePage;
