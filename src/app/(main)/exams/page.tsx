import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui";
import { getCatalogSubjectSummary, getSeriesForSubject } from "@/lib/paper-catalog";
import { getUserProgress, getUnits, getCourses } from "@/server/db/queries";
import { COMBINED_SCIENCE_ALL_TYPE_PRACTICE_LINKS } from "@/lib/combined-science-paper2-plan";
import { getCombinedSciencePaper2Coverage } from "@/server/paper-library/combined-science-paper2";
import PastPapersLibrary from "./past-papers-library";

const ExamsPage = async () => {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userProgress = await getUserProgress();

  if (!userProgress?.activeCourseId) {
    redirect("/dashboard");
  }

  const allCourses = await getCourses();
  const activeCourse = allCourses.find((course) => course.id === userProgress.activeCourseId);
  const currentSubjectLabel = activeCourse?.title || "Combined Science (0653)";
  const currentSubjectCode = activeCourse?.title.match(/\d{4}/)?.[0] || "0653";

  const units = await getUnits();

  const totalLessons = units.reduce((accumulator, unit) => accumulator + unit.lessons.length, 0);
  const completedLessons = units.reduce(
    (accumulator, unit) => accumulator + unit.lessons.filter((lesson: any) => lesson.completed).length,
    0
  );
  const masteryPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const combinedScienceCoverage =
    currentSubjectCode === "0653" ? await getCombinedSciencePaper2Coverage() : [];
  const pairedDbCount = combinedScienceCoverage.filter((row) => row.isPairedInDb).length;
  const missingDbCount = combinedScienceCoverage.length - pairedDbCount;
  const readyForPracticeCount = combinedScienceCoverage.filter(
    (row) => row.isPairedInDb && row.questionCountInDb > 0
  ).length;

  const verifiedSeries = getSeriesForSubject(currentSubjectCode, {
    requireCompletePair: true,
    requireSyllabusAligned: true,
  });

  const groupedByPaper = verifiedSeries.reduce<Record<string, typeof verifiedSeries>>(
    (accumulator, series) => {
      const groupKey = series.paperNumber?.toString() || "other";
      if (!accumulator[groupKey]) {
        accumulator[groupKey] = [];
      }
      accumulator[groupKey].push(series);
      return accumulator;
    },
    {}
  );

  const availableOtherSubjects = getCatalogSubjectSummary().filter(
    (subject) => subject.subjectCode !== currentSubjectCode
  );

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">A* Mastery Hub</h1>
          <p className="text-gray-500 font-medium">
            Reach 100% mastery across all topics to secure your A* grade.
          </p>
        </div>
        <div className="px-4 py-2 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200">
          {currentSubjectLabel}
        </div>
      </div>

      <div className="bg-gray-900 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-400 text-xs font-black rounded-full border border-green-500/20 tracking-widest uppercase">
              Target: 100% Mastery
            </div>
            <h2 className="text-3xl lg:text-5xl font-black leading-tight">
              Road to <span className="text-blue-400">A* Excellence</span>
            </h2>
            <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-md">
              Practice important MCQs regularly. Papers shown below are filtered to paired QP+MS
              sets so answers follow mark schemes.
            </p>
            <Button
              size="lg"
              className="h-16 px-10 rounded-2xl font-black text-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/40 text-white"
              asChild
            >
              <Link href="/mock-exam">Start Full A* Mock Exam -&gt;</Link>
            </Button>
          </div>

          <div className="w-64 h-64 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-white/5"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-blue-500"
                strokeDasharray={691}
                strokeDashoffset={691 - (691 * masteryPercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-white">{masteryPercentage}%</span>
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Mastered</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {currentSubjectCode === "0653" && (
          <div className="space-y-5 rounded-3xl border-2 border-gray-100 bg-white p-5 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  0653 Paper 2 Coverage (2017-2025)
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  Current-syllabus bank with QP/MS links and live DB sync status for each variant.
                </p>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600">
                Syllabus window: 2025-2027
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Rows paired in DB
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {pairedDbCount}/{combinedScienceCoverage.length}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">
                  Missing in DB
                </p>
                <p className="mt-1 text-2xl font-black text-amber-900">{missingDbCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  With usable questions
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-900">{readyForPracticeCount}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left font-black">Year</th>
                    <th className="px-3 py-3 text-left font-black">Session</th>
                    <th className="px-3 py-3 text-left font-black">Paper</th>
                    <th className="px-3 py-3 text-left font-black">Printed</th>
                    <th className="px-3 py-3 text-left font-black">Practice Test</th>
                    <th className="px-3 py-3 text-left font-black">Question Paper</th>
                    <th className="px-3 py-3 text-left font-black">Mark Scheme</th>
                    <th className="px-3 py-3 text-left font-black">DB Status</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedScienceCoverage.map((row) => (
                    <tr key={`${row.year}-${row.sessionCode}-${row.paperCode}`} className="border-t border-gray-100">
                      <td className="px-3 py-3 font-semibold text-slate-900">{row.year}</td>
                      <td className="px-3 py-3 text-slate-700">{row.sessionLabel}</td>
                      <td className="px-3 py-3 text-slate-700">
                        Paper 2 / Variant {row.variantNumber} ({row.paperCode})
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">
                          [ ]
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={row.practiceHref}
                          className="inline-flex rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700"
                        >
                          Start Mock
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={row.questionPaperUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-black"
                        >
                          Open QP
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={row.markSchemeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-700"
                        >
                          Open MS
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        {row.isPairedInDb ? (
                          <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                            QP+MS in DB
                          </span>
                        ) : (
                          <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">
                            Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm font-black text-teal-900">
                All question modes are enabled for training, not only MCQ.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={COMBINED_SCIENCE_ALL_TYPE_PRACTICE_LINKS.mcq}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-black"
                >
                  Paper 2 MCQ
                </Link>
                <Link
                  href={COMBINED_SCIENCE_ALL_TYPE_PRACTICE_LINKS.theory}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-violet-700"
                >
                  Structured Theory
                </Link>
                <Link
                  href={COMBINED_SCIENCE_ALL_TYPE_PRACTICE_LINKS.mixed}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700"
                >
                  Mixed Roadmap
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            Verified Past Paper Library
          </h3>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            QP + MS Matched
          </span>
        </div>

        {verifiedSeries.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            No verified paper pairs found for {currentSubjectCode}. Run
            <code className="mx-1">python scripts/python/build_paper_catalog.py</code>
            to regenerate the dynamic catalog.
          </div>
        ) : (
          <PastPapersLibrary subjectCode={currentSubjectCode} groupedByPaper={groupedByPaper} />
        )}
      </div>

      {availableOtherSubjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Other Subject Banks</h3>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Dynamic Catalog
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOtherSubjects.map((subject) => (
              <div key={subject.subjectCode} className="rounded-3xl border-2 border-gray-100 bg-white p-5">
                <p className="text-sm font-black text-gray-900">
                  {subject.subjectName} ({subject.subjectCode})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Paired series: {subject.pairedSeries}/{subject.totalSeries}
                </p>
                <p className="text-xs text-gray-500">Latest year in bank: {subject.latestYear}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            Essential Chapter Mastery
          </h3>
          <span className="text-sm font-bold text-gray-400">Real-time Data</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {units.map((unit) => (
            <div key={unit.id} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <div className="h-px bg-gray-100 flex-1"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {unit.title}
                </span>
                <div className="h-px bg-gray-100 flex-1"></div>
              </div>
              {unit.lessons.map((lesson: any) => (
                <Link
                  key={lesson.id}
                  href={`/lesson/${lesson.id}?mode=practice`}
                  className={`bg-white border-2 rounded-3xl p-5 flex items-center justify-between hover:border-blue-200 transition-all shadow-sm group ${
                    lesson.completed ? "border-green-100 bg-green-50/20" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 transition-colors ${
                        lesson.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-gray-50 border-gray-100 text-gray-400"
                      }`}
                    >
                      {lesson.completed ? "OK" : lesson.order}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                        {lesson.title}
                      </p>
                      <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
                        {lesson.completed ? "Mastered" : "Needs Practice"}
                      </p>
                    </div>
                  </div>
                  <span className="text-blue-200 group-hover:text-blue-600 font-black text-xl">-&gt;</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExamsPage;
