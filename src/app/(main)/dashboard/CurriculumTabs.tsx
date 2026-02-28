"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { OFFICIAL_0653_TOPICS_2025_2027, SYLLABUS_SUBTOPICS_0653 } from "@/lib/syllabus/combined-science-2025";

interface Props {
  units?: any[];
  topicAnalysis: Record<string, { priority: string; frequency: number }>;
}

// Static syllabus data — always available, no DB dependency
const TABS = [
  {
    label: "Biology",
    topics: OFFICIAL_0653_TOPICS_2025_2027.biology,
  },
  {
    label: "Chemistry",
    topics: OFFICIAL_0653_TOPICS_2025_2027.chemistry,
  },
  {
    label: "Physics",
    topics: OFFICIAL_0653_TOPICS_2025_2027.physics,
  },
] as const;

export const CurriculumTabs = ({ topicAnalysis }: Props) => {
  const [activeTab, setActiveTab] = useState<"Biology" | "Chemistry" | "Physics">("Biology");
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);

  const currentTab = TABS.find((t) => t.label === activeTab)!;

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Selectors */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
        {TABS.map(({ label }) => (
          <button
            key={label}
            onClick={() => {
              setActiveTab(label);
              setSelectedSubTopic(null);
            }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === label
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Topic Cards */}
      <div className="space-y-4">
        {currentTab.topics.map((topicTitle, idx) => {
          const subTopics = SYLLABUS_SUBTOPICS_0653[topicTitle] ?? [];
          const analysis = topicAnalysis[topicTitle] ?? { priority: "LOW", frequency: 0 };

          return (
            <div
              key={topicTitle}
              className="bg-white border-2 border-gray-100 hover:border-blue-100 rounded-3xl p-6 transition-all shadow-sm"
            >
              <div className="flex flex-col gap-6">
                {/* Topic Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-black text-xl text-gray-900">{topicTitle}</h4>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        analysis.priority === "HIGH"
                          ? "bg-rose-100 text-rose-600"
                          : analysis.priority === "MEDIUM"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-sky-100 text-sky-600"
                      }`}
                    >
                      {analysis.priority} PRIORITY
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                    Master the fundamental concepts and principles required for this chapter.
                  </p>
                </div>

                {/* Sub-Topics Grid */}
                <div className="bg-blue-50/30 rounded-2xl p-5 border border-blue-100/50">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-blue-400 rounded-full" />
                    Sub-Topics to Master
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subTopics.length > 0 ? (
                      subTopics.map((topic, i) => {
                        const isSelected = selectedSubTopic === topic;
                        return (
                          <button
                            key={topic}
                            onClick={() => setSelectedSubTopic(isSelected ? null : topic)}
                            className={`bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border transition-all text-start flex flex-col gap-2 group/topic ${
                              isSelected
                                ? "border-blue-600 shadow-md ring-4 ring-blue-50"
                                : "border-blue-100/50 hover:border-blue-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] shrink-0 font-black transition-colors ${
                                  isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
                                }`}
                              >
                                {i + 1}
                              </div>
                              <span
                                className={`text-xs font-bold transition-colors ${
                                  isSelected ? "text-blue-700" : "text-gray-700"
                                }`}
                              >
                                {topic}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="pt-2 border-t border-blue-50 mt-1 animate-in fade-in slide-in-from-top-1">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 px-1">
                                  A* Intelligence
                                </p>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-gray-500">Exam Frequency:</span>
                                    <span className="text-[10px] font-black text-blue-600">
                                      {analysis.frequency || 0} Points
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-gray-500">Priority Level:</span>
                                    <span
                                      className={cn(
                                        "text-[10px] font-black uppercase",
                                        analysis.priority === "HIGH" ? "text-rose-600" : "text-orange-600"
                                      )}
                                    >
                                      {analysis.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-4 px-2">
                        <span className="text-xs text-gray-400 italic">
                          Essential exam concepts being prioritized for this chapter...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
