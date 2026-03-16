import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft, TrendingUp, BarChart3, BookOpen, Zap, AlertCircle } from "lucide-react";
import { getSubjectInsights } from "@/server/actions/syllabus-insights";

const SUBJECT_META: Record<string, { name: string; emoji: string; gradient: string }> = {
  "0653": { name: "Combined Science",       emoji: "🔬", gradient: "from-emerald-600 to-teal-700"    },
  "0580": { name: "Mathematics",             emoji: "📐", gradient: "from-blue-600 to-indigo-700"     },
  "0500": { name: "English First Language",  emoji: "✍️", gradient: "from-amber-500 to-orange-600"   },
  "0680": { name: "Environmental Management",emoji: "🌍", gradient: "from-green-600 to-emerald-700"  },
};

const PRIORITY_CONFIG = {
  HIGH:   { label: "High Priority",   bg: "bg-red-100",    text: "text-red-700",    bar: "bg-red-500",    dot: "bg-red-500"    },
  MEDIUM: { label: "Medium Priority", bg: "bg-amber-100",  text: "text-amber-700",  bar: "bg-amber-500",  dot: "bg-amber-500"  },
  LOW:    { label: "Low Priority",    bg: "bg-gray-100",   text: "text-gray-600",   bar: "bg-gray-400",   dot: "bg-gray-400"   },
};

const SUPPORTED = ["0653", "0580", "0500", "0680"];

export default async function InsightsPage({ params }: { params: { code: string } }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { code } = params;
  if (!SUPPORTED.includes(code)) redirect("/dashboard");

  const meta     = SUBJECT_META[code] ?? { name: code, emoji: "📚", gradient: "from-gray-600 to-gray-700" };
  const insights = await getSubjectInsights(code);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className={`bg-gradient-to-br ${meta.gradient} text-white px-6 pt-6 pb-10`}>
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/subject/${code}`}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-black mb-5 transition-colors"
          >
            <ChevronLeft size={16} /> {meta.name}
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
              {meta.emoji}
            </div>
            <div>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Exam Insights</p>
              <h1 className="text-2xl font-black leading-tight">{meta.name}</h1>
              <p className="text-white/70 text-sm font-medium mt-0.5">
                Topic frequency analysis · 2017–2025 past papers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-10 space-y-5">

        {/* No data state */}
        {!insights && (
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 text-amber-500" size={32} />
            <p className="font-black text-gray-900 mb-1">No analysis data yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Run the pipeline to generate topic frequency data for this subject.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-xs font-mono text-gray-600 space-y-1">
              <p>1. python scripts/python/theory_pipeline.py --subject {code}</p>
              <p>2. npx tsx src/server/scripts/seed-theory-questions.ts</p>
              <p>3. python scripts/python/generate_topic_analysis.py --subject {code}</p>
            </div>
          </div>
        )}

        {insights && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: BookOpen,   label: "Papers",      value: insights.totalPapers,                       sub: `${insights.yearRange?.min ?? ""}–${insights.yearRange?.max ?? ""}` },
                { icon: BarChart3,  label: "Questions",   value: Math.round(insights.totalQuestions),         sub: `${insights.topicsByPriority.HIGH.length} high-priority` },
                { icon: TrendingUp, label: "Topics",      value: insights.topics.length,                      sub: `${insights.topicsByPriority.HIGH.length}H / ${insights.topicsByPriority.MEDIUM.length}M / ${insights.topicsByPriority.LOW.length}L` },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="bg-white rounded-2xl border-2 border-gray-100 p-4 text-center">
                  <Icon size={18} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-xl font-black text-gray-900">{value}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Paper 2 vs Paper 4 split (0580 only) */}
            {(insights.paper2Questions > 0 || insights.paper4Questions > 0) && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Paper Split</p>
                <div className="flex gap-4 mb-3">
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-black text-blue-600">{insights.paper2Questions}</p>
                    <p className="text-xs font-black text-gray-500">Paper 2 · Short Answer</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-black text-indigo-600">{insights.paper4Questions}</p>
                    <p className="text-xs font-black text-gray-500">Paper 4 · Extended</p>
                  </div>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${Math.round(insights.paper2Questions / (insights.paper2Questions + insights.paper4Questions) * 100)}%` }}
                  />
                  <div className="bg-indigo-500 flex-1" />
                </div>
              </div>
            )}

            {/* Year-by-year trend */}
            {Object.keys(insights.yearlyTrend).length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Questions per Year</p>
                <YearTrendChart trend={insights.yearlyTrend} />
              </div>
            )}

            {/* Priority sections */}
            {(["HIGH", "MEDIUM", "LOW"] as const).map((priority) => {
              const topics = insights.topicsByPriority[priority];
              if (topics.length === 0) return null;
              const cfg = PRIORITY_CONFIG[priority];
              const maxFreq = topics[0]?.frequency ?? 1;

              return (
                <div key={priority} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                  <div className={`flex items-center justify-between px-5 py-3 ${cfg.bg}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <p className={`text-xs font-black uppercase tracking-widest ${cfg.text}`}>{cfg.label}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {topics.length} topics
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {topics.map((t) => (
                      <div key={t.topic} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-black text-gray-800 leading-tight">{t.topic}</p>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {t.paper2Count > 0 && (
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">P2</span>
                            )}
                            {t.paper4Count > 0 && (
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">P4</span>
                            )}
                            <span className="text-xs font-black text-gray-500">{Math.round(t.frequency)}q</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${cfg.bar} rounded-full transition-all`}
                              style={{ width: `${Math.round((t.frequency / maxFreq) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 shrink-0">
                            {t.totalYears > 0 ? `${t.totalYears} yr${t.totalYears !== 1 ? "s" : ""}` : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Study recommendation CTA */}
            <Link
              href={`/learn/smart-practice?subject=${code}`}
              className="group flex items-center justify-between bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl p-5 hover:opacity-90 transition-opacity"
            >
              <div>
                <p className="font-black text-sm">Practice High-Priority Topics</p>
                <p className="text-blue-200 text-xs font-medium mt-0.5">
                  Smart Practice sorts by exam frequency
                </p>
              </div>
              <Zap size={24} className="text-yellow-300 fill-yellow-300 group-hover:scale-110 transition-transform" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline bar chart component ────────────────────────────────────────────────

function YearTrendChart({ trend }: { trend: Record<string, number> }) {
  const entries = Object.entries(trend).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {entries.map(([year, count]) => (
        <div key={year} className="flex-1 flex flex-col items-center gap-1">
          <p className="text-[9px] font-black text-gray-500">{Math.round(count)}</p>
          <div
            className="w-full bg-blue-500 rounded-t-sm transition-all"
            style={{ height: `${Math.round((count / max) * 52)}px` }}
          />
          <p className="text-[9px] font-black text-gray-400">{year.slice(2)}</p>
        </div>
      ))}
    </div>
  );
}
