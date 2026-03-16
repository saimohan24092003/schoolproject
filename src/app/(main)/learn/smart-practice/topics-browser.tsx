"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Search, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type TopicPriority = "HIGH" | "MEDIUM" | "LOW";
type TopicItem = {
  name: string;
  count: number;
  roadmap: boolean;
  priority: TopicPriority;
  frequency: number;
  unitTitle?: string;
  coveredInSchool?: boolean;
  practiceMode?: "learn" | "review" | "hidden";
  paperCounts?: Record<number, number>;
};

type LevelState = { l1: boolean; l2: boolean; l3: boolean };
type FilterMode = "all" | "high" | "learn" | "review";
type PaperTypeFilter = "ALL" | "P2" | "P4" | "P6";

type Props = {
  subject: string;
  subjectCode?: string;
  topics: TopicItem[];
  topicLevelMap?: Record<string, LevelState>;
  initialPaperType?: "P2" | "P4" | "P6";
  roadmapLevel?: number;
  forcedLevel?: 1 | 2 | 3;
};

const paperTypeToNumber = (type: PaperTypeFilter): number | undefined => {
  if (type === "P2") return 2;
  if (type === "P4") return 4;
  if (type === "P6") return 6;
  return undefined;
};

function getTopicState(progress?: LevelState) {
  if (!progress) return "notstarted" as const;
  const completed = [progress.l1, progress.l2, progress.l3].filter(Boolean).length;
  if (completed === 3) return "mastered" as const;
  if (completed > 0) return "inprogress" as const;
  return "notstarted" as const;
}

function getNextLevel(progress?: LevelState): 1 | 2 | 3 {
  if (!progress || !progress.l1) return 1;
  if (!progress.l2) return 2;
  if (!progress.l3) return 3;
  return 1;
}

function getSectionTone(topicName: string, subjectCode?: string) {
  if (subjectCode === "0580") return "blue" as const;
  if (subjectCode === "0500") return "amber" as const;
  if (subjectCode === "0680") return "teal" as const;
  if (topicName.startsWith("B")) return "emerald" as const;
  if (topicName.startsWith("C")) return "violet" as const;
  if (topicName.startsWith("P")) return "sky" as const;
  return "slate" as const;
}

export default function TopicsBrowser({
  subject,
  subjectCode,
  topics,
  topicLevelMap = {},
  initialPaperType,
  roadmapLevel,
  forcedLevel,
}: Props) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");
  const [paperType, setPaperType] = useState<PaperTypeFilter>(initialPaperType ?? "ALL");

  const hasCoveredTopics = topics.some((topic) => topic.coveredInSchool);
  const showPaperTypeFilter =
    subjectCode === "0580" ||
    subjectCode === "0653" ||
    /\b0580\b/.test(subject) ||
    /\b0653\b/.test(subject);

  const activePaperNumber = paperTypeToNumber(paperType);

  const getTopicCount = (topic: TopicItem) => {
    if (activePaperNumber) {
      return topic.paperCounts?.[activePaperNumber] ?? 0;
    }
    return topic.count;
  };

  const topicsWithAvailableCount =
    activePaperNumber !== undefined
      ? topics.filter((topic) => getTopicCount(topic) > 0)
      : topics;

  const allCount = topicsWithAvailableCount.length;
  const highCount = topicsWithAvailableCount.filter((topic) => topic.priority === "HIGH").length;
  const learnCount = topicsWithAvailableCount.filter((topic) => topic.practiceMode === "learn" || !topic.practiceMode).length;
  const reviewCount = topicsWithAvailableCount.filter((topic) => topic.practiceMode === "review").length;

  const masteredCount = topicsWithAvailableCount.filter((topic) => getTopicState(topicLevelMap[topic.name]) === "mastered").length;
  const inProgressCount = topicsWithAvailableCount.filter((topic) => getTopicState(topicLevelMap[topic.name]) === "inprogress").length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const base = topicsWithAvailableCount.filter((topic) => {
      if (mode === "learn" && topic.practiceMode === "review") return false;
      if (mode === "review" && topic.practiceMode !== "review") return false;
      if (mode === "high" && topic.priority !== "HIGH") return false;

      if (!query) return true;
      return (
        topic.name.toLowerCase().includes(query) ||
        (topic.unitTitle || "").toLowerCase().includes(query)
      );
    });

    return [...base].sort((a, b) => {
      const stateOrder = { inprogress: 0, notstarted: 1, mastered: 2 } as const;
      const aState = stateOrder[getTopicState(topicLevelMap[a.name])];
      const bState = stateOrder[getTopicState(topicLevelMap[b.name])];
      if (aState !== bState) return aState - bState;

      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
      if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];

      const aCount = getTopicCount(a);
      const bCount = getTopicCount(b);
      if (aCount !== bCount) return bCount - aCount;
      return a.name.localeCompare(b.name);
    });
  }, [topicsWithAvailableCount, mode, search, topicLevelMap, paperType]);

  const groupedTopics = useMemo(() => {
    const grouped = new Map<string, typeof filtered>();
    for (const topic of filtered) {
      const key = topic.unitTitle || "Topics";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(topic);
    }
    return Array.from(grouped.entries());
  }, [filtered]);

  const subjectParam = subjectCode ?? subject;

  const toneClass = (tone: ReturnType<typeof getSectionTone>, state: "mastered" | "inprogress" | "notstarted") => {
    if (state === "mastered") return "border-emerald-200 bg-emerald-50/60";
    if (state === "inprogress") return "border-blue-200 bg-blue-50/60";

    if (tone === "emerald") return "border-emerald-100 bg-white";
    if (tone === "violet") return "border-violet-100 bg-white";
    if (tone === "sky") return "border-sky-100 bg-white";
    if (tone === "blue") return "border-blue-100 bg-white";
    if (tone === "amber") return "border-amber-100 bg-white";
    if (tone === "teal") return "border-teal-100 bg-white";
    return "border-slate-200 bg-white";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-900">{allCount}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Topics</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="text-xl font-black text-blue-700">{inProgressCount}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-500">In progress</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-xl font-black text-emerald-700">{masteredCount}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-500">Mastered</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="relative mb-2.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-500"
          />
        </div>

        <div className="mb-2 flex gap-1.5">
          {([
            { key: "all", label: `All (${allCount})` },
            { key: "high", label: `High (${highCount})` },
            ...(hasCoveredTopics
              ? [
                  { key: "learn", label: `New (${learnCount})` },
                  { key: "review", label: `Review (${reviewCount})` },
                ]
              : []),
          ] as Array<{ key: FilterMode; label: string }>).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={cn(
                "flex-1 rounded-xl px-2 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition touch-manipulation",
                mode === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showPaperTypeFilter && (
          <div className="flex gap-1.5">
            {(["ALL", "P2", "P4", "P6"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setPaperType(value)}
                className={cn(
                  "flex-1 rounded-xl px-2 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition touch-manipulation",
                  paperType === value
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-100"
                )}
              >
                {value === "ALL" ? "All" : value}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <BookOpen size={20} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-black text-slate-700">No matching topics</p>
          <p className="text-xs font-medium text-slate-500">Try a different keyword or filter</p>
        </div>
      )}

      {groupedTopics.map(([unitTitle, unitTopics]) => (
        <div key={unitTitle} className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{unitTitle}</p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2">
            {unitTopics.map((topic) => {
              const progress = topicLevelMap[topic.name];
              const state = getTopicState(progress);
              const nextLevel = getNextLevel(progress);
              const completedLevels = progress ? [progress.l1, progress.l2, progress.l3].filter(Boolean).length : 0;
              const tone = getSectionTone(topic.name, subjectCode);
              const topicCount = getTopicCount(topic);

              const levelForSession = forcedLevel ?? (state === "mastered" ? 1 : nextLevel);
              const href = `/learn/smart-practice/${encodeURIComponent(topic.name)}?${new URLSearchParams({
                subject: subjectParam,
                level: String(levelForSession),
                ...(showPaperTypeFilter && paperType !== "ALL" ? { paperType } : {}),
                ...(roadmapLevel ? { roadmapLevel: String(roadmapLevel) } : {}),
              }).toString()}`;

              return (
                <Link
                  key={topic.name}
                  href={topicCount > 0 ? href : "#"}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border p-3.5 transition touch-manipulation",
                    topicCount === 0
                      ? "pointer-events-none cursor-not-allowed opacity-50"
                      : "hover:shadow-sm active:scale-[0.99]",
                    toneClass(tone, state)
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    {state === "mastered" ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : state === "inprogress" ? (
                      <Target size={18} className="text-blue-600" />
                    ) : (
                      <BookOpen size={18} className="text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{topic.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">
                        {topicCount > 0 ? `${topicCount} questions` : "No questions yet"}
                      </span>
                      {topic.priority === "HIGH" && state !== "mastered" && (
                        <span className="rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-orange-700">
                          High yield
                        </span>
                      )}
                      {state === "inprogress" && (
                        <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700">
                          {completedLevels}/3 levels
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {([1, 2, 3] as const).map((level) => {
                      const done = level === 1 ? progress?.l1 : level === 2 ? progress?.l2 : progress?.l3;
                      const isNext = !done && state !== "mastered" && level === nextLevel;
                      return (
                        <span
                          key={level}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black",
                            done
                              ? "bg-emerald-500 text-white"
                              : isNext
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200 text-slate-500"
                          )}
                        >
                          {done ? "OK" : level}
                        </span>
                      );
                    })}
                  </div>

                  {topicCount > 0 && <ArrowRight size={16} className="text-slate-400 transition group-hover:text-slate-700" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
