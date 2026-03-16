"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Download, CheckCircle2, Lock } from "lucide-react";
import { PaperSeries } from "@/lib/paper-catalog";
import { cn } from "@/lib/utils";

type Props = {
  subjectCode: string;
  groupedByPaper: Record<string, PaperSeries[]>;
};

export default function PastPapersLibrary({ subjectCode, groupedByPaper }: Props) {
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);

  const paperKeys = Object.keys(groupedByPaper).sort((a, b) => {
    if (a === "other") return 1;
    if (b === "other") return -1;
    return Number(a) - Number(b);
  });

  return (
    <div className="space-y-4">
      {paperKeys.map((groupKey) => {
        const papers = groupedByPaper[groupKey];
        const isExpanded = expandedPaper === groupKey;
        const title = groupKey === "other" ? "Other Components" : `${subjectCode} Paper ${groupKey}`;

        // Get years present in this paper group
        const years = Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a);

        return (
          <div 
            key={groupKey} 
            className={cn(
              "rounded-3xl border-2 transition-all duration-200 overflow-hidden bg-white shadow-sm",
              isExpanded ? "border-blue-500 shadow-md ring-4 ring-blue-500/10" : "border-slate-200 hover:border-slate-300"
            )}
          >
            {/* Header / Toggle */}
            <button
              onClick={() => setExpandedPaper(isExpanded ? null : groupKey)}
              className="w-full flex items-center justify-between p-5 md:p-6 text-left transition-colors hover:bg-slate-50 focus:outline-none"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  isExpanded ? "bg-blue-600 text-white shadow-inner" : "bg-slate-100 text-slate-500"
                )}>
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className={cn(
                    "text-lg md:text-xl font-black tracking-tight transition-colors",
                    isExpanded ? "text-slate-900" : "text-slate-800"
                  )}>
                    {title}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {papers.length} Series Available
                  </p>
                </div>
              </div>
              <div className={cn(
                "p-2 rounded-full transition-colors",
                isExpanded ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
              )}>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t-2 border-slate-100 bg-slate-50/50 p-5 md:p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                {years.map((year) => {
                  const yearPapers = papers.filter(p => p.year === year);
                  
                  return (
                    <div key={year} className="space-y-4">
                      {/* Year Divider */}
                      <div className="flex items-center gap-4">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-sm font-black text-slate-400">{year} Series</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      {/* Paper Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {yearPapers.map((series) => (
                          <div
                            key={`${series.sessionCode}-${series.paperCode}`}
                            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    {series.seasonLabel}
                                  </span>
                                  {series.variantNumber && (
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-black uppercase text-blue-600 tracking-widest">
                                      Variant {series.variantNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-slate-900 text-sm">
                                  {series.subjectName} ({series.subjectCode})
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <CheckCircle2 size={12} />
                                VERIFIED
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                              {series.questionPaper?.sourceUrl ? (
                                <a
                                  href={series.questionPaper.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wide hover:bg-black hover:shadow-lg transition-all active:scale-[0.98]"
                                >
                                  <Download size={14} />
                                  QP
                                </a>
                              ) : (
                                <button disabled className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-black uppercase tracking-wide cursor-not-allowed">
                                  <Lock size={14} />
                                  QP
                                </button>
                              )}
                              
                              {series.markScheme?.sourceUrl ? (
                                <a
                                  href={series.markScheme.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-wide hover:bg-emerald-600 hover:shadow-lg transition-all active:scale-[0.98]"
                                >
                                  <Download size={14} />
                                  MS
                                </a>
                              ) : (
                                <button disabled className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-black uppercase tracking-wide cursor-not-allowed">
                                  <Lock size={14} />
                                  MS
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
