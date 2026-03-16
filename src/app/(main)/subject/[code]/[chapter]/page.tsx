import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";
import db from "@/server/db/drizzle";
import { lessons, challenges, challengeProgress } from "@/server/db/schema";
import { ChevronLeft, Zap, Star, Trophy, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { getSubjectTopicProgress } from "@/server/actions/topic-progress";
import { getTopicsForSubject } from "@/server/actions/smart-practice";
import { getSubjectConfig } from "@/lib/subject-config";

export default async function ChapterPage({ params }: { params: { code: string; chapter: string } }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { code, chapter } = params;
  const topicTitle = decodeURIComponent(chapter);

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.title, topicTitle) });
  if (!lesson) redirect(`/subject/${code}`);

  const allChallenges = await db.query.challenges.findMany({ where: eq(challenges.lessonId, lesson.id) });

  const completedProgress = allChallenges.length
    ? await db.query.challengeProgress.findMany({
        where: and(
          eq(challengeProgress.userId, userId),
          eq(challengeProgress.completed, true),
          inArray(challengeProgress.challengeId, allChallenges.map((c) => c.id))
        ),
      })
    : [];

  const completedIds     = new Set(completedProgress.map((p) => p.challengeId));
  const theoryChallenges = allChallenges.filter((c) => c.type === "THEORY");
  const theoryDone       = theoryChallenges.filter((c) => completedIds.has(c.id)).length;
  const theoryPct        = theoryChallenges.length > 0 ? Math.round((theoryDone / theoryChallenges.length) * 100) : 0;

  // For MCQ Levels 1 & 2: questions come from examPapers (past paper JSON), not challenges table.
  // Use the same topic catalog data that smart-practice uses.
  const subjectTitle = (await db.query.courses.findFirst({
    where: (c, { like }) => like(c.title, `%${code}%`),
  }))?.title ?? code;

  const topicCatalog = await getTopicsForSubject(subjectTitle, "O-Level");
  const topicEntry   = topicCatalog.find(t =>
    t.name.toLowerCase().trim() === topicTitle.toLowerCase().trim()
  );
  const pastPaperCount = topicEntry?.count ?? 0;
  const subjectCfg = getSubjectConfig(code);
  const LEVELS = subjectCfg.levels.map(l => ({
    level: l.level, label: l.label, desc: l.desc,
    icon: l.level === 1 ? Zap : l.level === 2 ? Star : Trophy,
    gradient: l.gradient, bg: l.bg, border: l.border,
    text: l.text, btn: l.btn, xp: l.xp,
    type: l.type === "MCQ" ? "MCQ" : "STRUCTURED",
  }));

  // For MCQ subjects: L1+L2 use past-paper MCQs, L3 uses theory challenges
  // For non-MCQ subjects: all levels use past-paper structured questions
  const questionCounts = subjectCfg.hasMCQ
    ? [pastPaperCount, pastPaperCount, theoryChallenges.length]
    : [pastPaperCount, pastPaperCount, pastPaperCount];
  const levelProgress  = subjectCfg.hasMCQ
    ? [0, 0, theoryPct]
    : [0, 0, 0];

  // Fetch game-level completion from topicLevelProgress table
  const topicProgressRows = await getSubjectTopicProgress(code);
  const topicRow = topicProgressRows.find(r => r.topicName === topicTitle);
  const gameLevelDone = {
    1: topicRow?.levels[1]?.completed ?? false,
    2: topicRow?.levels[2]?.completed ?? false,
    3: topicRow?.levels[3]?.completed ?? false,
  };

  const smartSlug  = encodeURIComponent(topicTitle);
  const levelLinks = [
    `/learn/smart-practice/${smartSlug}?subject=${code}&level=1`,
    `/learn/smart-practice/${smartSlug}?subject=${code}&level=2`,
    `/learn/smart-practice/${smartSlug}?subject=${code}&level=3`,
  ];

  const totalAvailable = subjectCfg.hasMCQ ? pastPaperCount + theoryChallenges.length : pastPaperCount;
  const overallPct = totalAvailable > 0
    ? Math.round((completedIds.size / totalAvailable) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={`/subject/${code}`} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronLeft size={20} className="text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chapter</p>
            <h1 className="font-black text-gray-900 text-base leading-tight truncate">{topicTitle}</h1>
          </div>
          {overallPct > 0 && (
            <div className="text-right shrink-0">
              <p className="text-lg font-black text-blue-600">{overallPct}%</p>
              <p className="text-[10px] font-bold text-gray-400">Done</p>
            </div>
          )}
        </div>
        {totalAvailable > 0 && (
          <div className="max-w-2xl mx-auto mt-2.5 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Choose your level</p>

        {LEVELS.map((lvl, idx) => {
          const Icon    = lvl.icon;
          const pct     = levelProgress[idx];
          const total   = questionCounts[idx];
          // Use topicLevelProgress (game DB) as the source of truth for completion
          const isDone  = gameLevelDone[(lvl.level) as 1|2|3] || (pct === 100 && total > 0);
          const isEmpty = total === 0;
          // Level is locked if prev game-level not completed
          const prevDone = idx === 0 || gameLevelDone[(lvl.level - 1) as 1|2|3];
          const isLocked = idx > 0 && !prevDone && !isDone;

          return (
            <div
              key={lvl.level}
              className={`bg-white rounded-3xl border-2 overflow-hidden transition-all ${
                isEmpty || isLocked ? "opacity-50 border-gray-100" : `${lvl.border} hover:shadow-md`
              }`}
            >
              {/* Color bar */}
              <div className={`h-1.5 bg-gradient-to-r ${lvl.gradient}`} />

              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${lvl.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                    {isDone
                      ? <CheckCircle2 size={22} className="text-white" />
                      : isLocked
                      ? <Lock size={20} className="text-white" />
                      : <Icon size={22} className="text-white" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Level {lvl.level}</span>
                      {isDone && <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Complete!</span>}
                      {isLocked && <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔒 Locked</span>}
                    </div>
                    <h3 className={`text-lg font-black ${lvl.text}`}>{lvl.label}</h3>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">{lvl.desc}</p>
                  </div>
                  <span className={`text-[10px] font-black shrink-0 ${lvl.text} ${lvl.bg} px-2.5 py-1 rounded-full`}>
                    {lvl.xp}
                  </span>
                </div>

                {/* Progress */}
                {!isEmpty && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 mb-1.5">
                      <span>{total} questions · {lvl.type}</span>
                      <span className={pct > 0 ? lvl.text : ""}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${lvl.gradient} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA */}
                {isEmpty ? (
                  <p className="text-xs text-gray-400 font-bold italic">No {lvl.type} questions yet.</p>
                ) : isLocked ? (
                  <p className="text-xs text-gray-400 font-bold italic">Complete Level {lvl.level - 1} first.</p>
                ) : (
                  <Link
                    href={levelLinks[idx]}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-white ${lvl.btn} transition-all shadow-sm active:scale-[0.98]`}
                  >
                    {isDone ? "Practise Again" : "Start Practice"}
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
