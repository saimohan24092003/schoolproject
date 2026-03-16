import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Compass,
  FileText,
  Layers,
  Target,
} from "lucide-react";
import { getTopicSetup } from "@/server/actions/topic-progress";
import { getUserRoadmapProgress } from "@/server/actions/roadmap";
import { getRoadmapForSubject, type PaperPref } from "@/lib/roadmap-config";

const SUBJECT_CODE = "0653";

const PAPER_OPTIONS: Array<{
  value: PaperPref;
  title: string;
  subtitle: string;
  description: string;
}> = [
  {
    value: "P2",
    title: "Paper 2",
    subtitle: "MCQ",
    description: "Fast objective questions from past papers.",
  },
  {
    value: "P4",
    title: "Paper 4",
    subtitle: "Theory",
    description: "Structured answers with mark-scheme depth.",
  },
  {
    value: "both",
    title: "Paper 2 + 4",
    subtitle: "Full prep",
    description: "Recommended for complete A* preparation.",
  },
];

const CombinedScienceDashboardPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [setup, roadmapProgress] = await Promise.all([
    getTopicSetup(SUBJECT_CODE),
    getUserRoadmapProgress(SUBJECT_CODE),
  ]);

  const onboardingDone = setup?.onboardingDone ?? false;
  const selectedPaper = (setup?.paperPreference as PaperPref) ?? "both";
  const selectedPaperLabel =
    selectedPaper === "both" ? "Paper 2 + Paper 4" : selectedPaper;
  const targetGrade = setup?.targetGrade ?? "A*";
  let coveredTopics = 0;
  if (setup?.coveredTopics) {
    try {
      coveredTopics = (JSON.parse(setup.coveredTopics as string) as string[]).length;
    } catch {
      coveredTopics = 0;
    }
  }

  const nextLevel = roadmapProgress?.nextLevel ?? 1;
  const roadmapPct = roadmapProgress?.pct ?? 0;
  const completedCount = roadmapProgress?.completedCount ?? 0;

  const paperTypeQuery =
    selectedPaper === "both" ? "" : `&paperType=${selectedPaper}`;
  const nextPracticeHref = `/learn/smart-practice?subject=${SUBJECT_CODE}&level=${nextLevel}${paperTypeQuery}`;

  const roadmap = getRoadmapForSubject(SUBJECT_CODE);
  const mcqCount = roadmap.filter((level) => level.questionType === "MCQ").length;
  const theoryCount = roadmap.filter((level) => level.questionType === "THEORY").length;
  const mixedCount = roadmap.filter((level) => level.questionType === "MIX").length;

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-700 via-teal-800 to-blue-900 p-6 text-white shadow-lg shadow-slate-900/20 md:p-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-200">Dashboard - 1</p>
            <h1 className="mt-1 text-3xl font-black">Combined Science Journey</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-100">
              Choose Paper 2, Paper 4, or both. Then complete onboarding so we can personalize your roadmap from
              level 1 to level 50.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Roadmap status</p>
            <p className="mt-1 text-3xl font-black">{roadmapPct}%</p>
            <p className="text-xs font-bold text-emerald-100">
              {completedCount}/50 levels complete
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Step 1</p>
            <h2 className="text-lg font-black text-slate-900">Choose your paper</h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {PAPER_OPTIONS.map((paper) => {
            const isSelected = selectedPaper === paper.value;
            return (
              <Link
                key={paper.value}
                href={`/onboarding/${SUBJECT_CODE}?paper=${paper.value}`}
                className={`rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-900">{paper.title}</p>
                  {isSelected ? (
                    <CheckCircle2 size={16} className="text-blue-600" />
                  ) : (
                    <Circle size={16} className="text-slate-300" />
                  )}
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{paper.subtitle}</p>
                <p className="mt-2 text-xs font-medium text-slate-600">{paper.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
            <Compass size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Step 2</p>
            <h2 className="text-lg font-black text-slate-900">Personalized onboarding</h2>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-600">
          Onboarding captures what the student already learned, paper preference, and target grade so new users do not
          get the same generic plan.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Paper</p>
            <p className="mt-1 text-sm font-black text-slate-900">{selectedPaperLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Target</p>
            <p className="mt-1 text-sm font-black text-slate-900">{targetGrade}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Topics marked learned</p>
            <p className="mt-1 text-sm font-black text-slate-900">{coveredTopics}</p>
          </div>
        </div>

        <Link
          href={`/onboarding/${SUBJECT_CODE}?paper=${selectedPaper}`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-violet-500"
        >
          {onboardingDone ? "Update onboarding" : "Start onboarding"}
          <ArrowRight size={14} />
        </Link>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Step 3</p>
            <h2 className="text-lg font-black text-slate-900">Roadmap level 1 to level 50</h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-xl font-black text-slate-900">{mcqCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">MCQ levels</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-xl font-black text-slate-900">{theoryCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Theory levels</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-xl font-black text-slate-900">{mixedCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Mixed levels</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm font-semibold text-teal-900">
            {"Training progression: Foundation -> Intermediate -> Advanced -> Full paper simulations."}
          </p>
          <p className="mt-1 text-xs font-semibold text-teal-700">
            Past-paper question sources and diagram resources are shown in practice sessions whenever content exists.
          </p>
        </div>

        <Link
          href={nextPracticeHref}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:from-emerald-500 hover:to-teal-500"
        >
          <Target size={14} />
          Continue from level {nextLevel}
        </Link>

        <div className="mt-3">
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            <FileText size={14} />
            Open paper library
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        <div className="flex items-center gap-2">
          <BookOpen size={16} />
          If you want us to add more past papers or missing diagram resources, share the content and we can ingest it.
        </div>
      </section>
    </div>
  );
};

export default CombinedScienceDashboardPage;
