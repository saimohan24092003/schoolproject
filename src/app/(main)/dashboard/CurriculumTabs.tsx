"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  units: any[];
  topicAnalysis: Record<string, { priority: string, frequency: number }>;
}

export const CurriculumTabs = ({ units, topicAnalysis }: Props) => {
  // Dynamic tabs based on units in DB
  const tabList = units.map(u => u.title);
  const [activeTab, setActiveTab] = useState(tabList[0] || "Biology");
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);

  // Auto-switch tab if the list changes (e.g. subject switch)
  if (tabList.length > 0 && !tabList.includes(activeTab)) {
    setActiveTab(tabList[0]);
  }

  const currentUnit = units.find(u => u.title === activeTab);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Selectors */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
        {tabList.map((tab) => (
          <button
            key={tab}
            onClick={() => {
                setActiveTab(tab);
                setSelectedSubTopic(null);
            }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === tab 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {currentUnit ? (
          currentUnit.lessons.map((lesson: any) => {
            const isCompleted = lesson.completed;
            const subTopics = lesson.subTopics || [];
            const analysis = topicAnalysis[lesson.title] || { priority: "LOW", frequency: 0 };

            return (
              <div 
                key={lesson.id}
                className={`bg-white border-2 rounded-3xl p-6 transition-all shadow-sm group ${
                  isCompleted ? "border-green-100 bg-green-50/30" : "border-gray-100 hover:border-blue-100"
                }`}
              >
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className={`font-black text-xl transition-colors ${
                        isCompleted ? "text-green-700" : "text-gray-900"
                      }`}>
                        {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <span className="text-[8px] font-black text-green-600 uppercase tracking-widest bg-green-100 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        ) : (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            analysis.priority === "HIGH" ? "bg-rose-100 text-rose-600" :
                            analysis.priority === "MEDIUM" ? "bg-orange-100 text-orange-600" :
                            "bg-sky-100 text-sky-600"
                          }`}>
                            {analysis.priority} PRIORITY
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed max-w-2xl ${
                      isCompleted ? "text-green-600/70" : "text-gray-500"
                    }`}>
                      {lesson.description || "Master the fundamental concepts and principles required for this chapter."}
                    </p>
                  </div>

                  {/* Sub-Topics Grid */}
                  <div className="bg-blue-50/30 rounded-2xl p-5 border border-blue-100/50 relative overflow-hidden">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-blue-400 rounded-full"></span>
                      Sub-Topics to Master
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subTopics.length > 0 ? (
                        subTopics.map((topic: string, i: number) => {
                          const isSelected = selectedSubTopic === topic;
                          return (
                            <button 
                                key={i} 
                                onClick={() => setSelectedSubTopic(isSelected ? null : topic)}
                                className={`bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border transition-all text-start flex flex-col gap-2 group/topic
                                    ${isSelected ? "border-blue-600 shadow-md ring-4 ring-blue-50" : "border-blue-100/50 hover:border-blue-300"}`}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] shrink-0 font-black transition-colors
                                        ${isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"}`}>
                                        {i + 1}
                                    </div>
                                    <span className={`text-xs font-bold transition-colors ${isSelected ? "text-blue-700" : "text-gray-700"}`}>{topic}</span>
                                </div>
                                {isSelected && (
                                    <div className="pt-2 border-t border-blue-50 mt-1 animate-in fade-in slide-in-from-top-1">
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 px-1">A* Intelligence</p>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[10px] font-bold text-gray-500">Exam Frequency:</span>
                                                <span className="text-[10px] font-black text-blue-600">{analysis.frequency || 0} Points</span>
                                            </div>
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[10px] font-bold text-gray-500">Priority Level:</span>
                                                <span className={cn("text-[10px] font-black uppercase",
                                                    analysis.priority === "HIGH" ? "text-rose-600" : "text-orange-600"
                                                )}>{analysis.priority}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-4 px-2">
                            <span className="text-xs text-gray-400 italic">Essential exam concepts being prioritized for this chapter...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center flex flex-col items-center gap-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 w-full">
            <div className="text-5xl">🔭</div>
            <div>
              <p className="text-gray-900 font-black text-lg">Content Coming Soon</p>
              <p className="text-gray-500 text-sm">We&apos;re currently preparing materials for this section.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
