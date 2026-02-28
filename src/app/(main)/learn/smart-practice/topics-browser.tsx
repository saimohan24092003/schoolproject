"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, BookOpen, BrainCircuit, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type TopicPriority = "HIGH" | "MEDIUM" | "LOW";

type TopicItem = {
  name: string;
  count: number;
  roadmap: boolean;
  priority: TopicPriority;
  frequency: number;
  unitTitle?: string;
};

type Props = {
  subject: string;
  topics: TopicItem[];
};

type FilterMode = "all" | "roadmap" | "high";

const TopicsBrowser = ({ subject, topics }: Props) => {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("roadmap");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((topic) => {
      if (mode === "roadmap" && !topic.roadmap) return false;
      if (mode === "high" && topic.priority !== "HIGH") return false;
      if (!q) return true;
      return (
        topic.name.toLowerCase().includes(q) ||
        (topic.unitTitle || "").toLowerCase().includes(q)
      );
    });
  }, [topics, mode, search]);

  const counts = useMemo(
    () => ({
      all: topics.length,
      roadmap: topics.filter((t) => t.roadmap).length,
      high: topics.filter((t) => t.priority === "HIGH").length,
    }),
    [topics]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border-2 border-blue-100 bg-blue-50/60 p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chapter/topic (e.g. respiration, acids, electricity)"
              className="w-full rounded-2xl border-2 border-blue-100 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("roadmap")}
              className={cn(
                "text-xs font-black px-3 py-2 rounded-xl border transition-colors",
                mode === "roadmap"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-blue-700 border-blue-100"
              )}
            >
              Roadmap ({counts.roadmap})
            </button>
            <button
              onClick={() => setMode("high")}
              className={cn(
                "text-xs font-black px-3 py-2 rounded-xl border transition-colors",
                mode === "high"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white text-rose-700 border-rose-100"
              )}
            >
              High Priority ({counts.high})
            </button>
            <button
              onClick={() => setMode("all")}
              className={cn(
                "text-xs font-black px-3 py-2 rounded-xl border transition-colors",
                mode === "all"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200"
              )}
            >
              All ({counts.all})
            </button>
          </div>
        </div>
        <p className="text-xs font-semibold text-blue-700 mt-3">
          Smart Practice is aligned to your curriculum roadmap. Search any interest topic and start MCQ drill instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {filtered.map((topic, index) => (
          <div key={`${topic.name}-${index}`} className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm hover:border-blue-200 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookOpen size={24} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn(
                  "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                  topic.count > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>
                  {topic.count} Questions
                </span>
                {topic.roadmap && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest bg-blue-100 text-blue-700 flex items-center gap-1">
                    <Target size={10} />
                    Roadmap
                  </span>
                )}
              </div>
            </div>

            <h3 className="font-black text-gray-900 text-lg mb-2 leading-tight">{topic.name}</h3>

            <div className="flex items-center gap-2 mb-4">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                topic.priority === "HIGH"
                  ? "bg-rose-100 text-rose-700"
                  : topic.priority === "MEDIUM"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-sky-100 text-sky-700"
              )}>
                {topic.priority} Priority
              </span>
              {topic.frequency > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                  <Sparkles size={10} />
                  {Math.round(topic.frequency)} Freq
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-6 font-medium min-h-[42px]">
              {topic.unitTitle
                ? `${topic.unitTitle}: roadmap-linked chapter practice.`
                : "Targeted chapter practice from past papers and mark schemes."}
            </p>

            <Button
              disabled={topic.count === 0}
              className="w-full gap-2 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 text-white disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
              asChild={topic.count > 0}
            >
              {topic.count > 0 ? (
                <Link href={`/learn/smart-practice/${encodeURIComponent(topic.name)}?subject=${encodeURIComponent(subject)}`}>
                  <BrainCircuit size={16} className="text-white" />
                  <span className="text-white">Start MCQ Drill</span>
                </Link>
              ) : (
                <span>No MCQ Yet</span>
              )}
            </Button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border-dashed border-2 border-gray-200">
            <div className="text-5xl mb-4 text-gray-300">🔎</div>
            <p className="text-gray-500 text-lg font-black">No topics matched your search.</p>
            <p className="text-sm text-gray-400 font-medium">Try a chapter name or keyword from your syllabus roadmap.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicsBrowser;
