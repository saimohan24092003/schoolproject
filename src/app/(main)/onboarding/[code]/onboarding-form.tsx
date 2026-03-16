"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTopicSetup } from "@/server/actions/topic-progress";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft, Loader2,
  BookOpen, Target, Zap, Star, Trophy, FileText,
  GraduationCap, Flame,
} from "lucide-react";

/* ─── Syllabus sections per subject ──────────────────────────────────────── */
type Section = { label: string; color: string; topics: string[] };

const SECTIONS_0653: Section[] = [
  {
    label: "Biology", color: "emerald",
    topics: [
      "B1. Cell Structure and Organisation", "B2. Biological Molecules",
      "B3. Enzymes", "B4. Plant Nutrition", "B5. Animal Nutrition",
      "B6. Plant Transport", "B7. Human Gas Exchange", "B8. Respiration",
      "B9. Excretion", "B10. Coordination and Response",
      "B11. Reproduction", "B12. Inheritance", "B13. Ecology",
    ],
  },
  {
    label: "Chemistry", color: "violet",
    topics: [
      "C1. States of Matter", "C2. Atomic Structure", "C3. Chemical Bonding",
      "C4. Stoichiometry", "C5. Electricity and Chemistry",
      "C6. Chemical Energetics", "C7. Chemical Reactions",
      "C8. Acids, Bases and Salts", "C9. Organic Chemistry",
      "C10. Experimental Techniques", "C11. Metals",
    ],
  },
  {
    label: "Physics", color: "sky",
    topics: [
      "P1. Motion", "P2. Forces", "P3. Energy",
      "P4. Waves", "P5. Light", "P6. Electricity",
      "P7. Magnetism", "P8. Thermal Physics", "P9. Nuclear Physics",
    ],
  },
];

const SECTIONS_0680: Section[] = [
  {
    label: "Environmental Management", color: "emerald",
    topics: [
      "1. Atmosphere and weather", "2. Hydrosphere",
      "3. Lithosphere", "4. Biosphere",
      "5. Human population", "6. Agriculture",
      "7. Energy and the environment", "8. Industry",
    ],
  },
];

const SECTIONS_0580: Section[] = [
  {
    label: "Number & Algebra", color: "blue",
    topics: [
      "1.1 Types of numbers", "1.2 Fractions, decimals and percentages",
      "1.3 Powers and roots", "1.4 Ratio and proportion",
      "1.5 Estimation and bounds", "2.1 Algebraic manipulation",
      "2.2 Solving equations", "2.3 Inequalities",
      "2.4 Sequences", "2.5 Functions", "2.6 Graphs of functions",
    ],
  },
  {
    label: "Geometry & Mensuration", color: "violet",
    topics: [
      "3.1 Straight-line graphs", "4.1 Angles and lines",
      "4.2 Triangles and quadrilaterals", "4.3 Circles",
      "5.1 Perimeter and area", "5.2 Volume and surface area",
      "5.3 Similar shapes",
    ],
  },
  {
    label: "Trigonometry & Statistics", color: "sky",
    topics: [
      "6.1 Right-angled triangles", "6.2 Sine and cosine rules",
      "7.1 Transformations", "7.2 Vectors",
      "8.1 Probability", "8.2 Statistical diagrams",
      "8.3 Measures of central tendency",
    ],
  },
];

const SECTIONS_0500: Section[] = [
  {
    label: "Reading", color: "amber",
    topics: [
      "1.1 Purpose and audience", "1.2 Tone, attitude and bias",
      "1.3 Inference and deduction", "1.4 Language and effect",
      "1.5 Note-making", "1.6 Summary writing",
    ],
  },
  {
    label: "Writing", color: "orange",
    topics: [
      "2.1 Directed writing — adapting style",
      "2.2 Directed writing — selecting information",
      "2.3 Composition — narrative", "2.4 Composition — descriptive",
      "2.5 Composition — argumentative", "2.6 Composition — discursive",
    ],
  },
];

function getSections(code: string): Section[] {
  if (code === "0680") return SECTIONS_0680;
  if (code === "0580") return SECTIONS_0580;
  if (code === "0500") return SECTIONS_0500;
  return SECTIONS_0653;
}

const COLOR_CLASSES: Record<string, { badge: string; check: string; border: string }> = {
  emerald: { badge: "bg-emerald-100 text-emerald-700", check: "text-emerald-500", border: "border-emerald-200" },
  violet:  { badge: "bg-violet-100 text-violet-700",   check: "text-violet-500",  border: "border-violet-200"  },
  sky:     { badge: "bg-sky-100 text-sky-700",          check: "text-sky-500",     border: "border-sky-200"     },
  blue:    { badge: "bg-blue-100 text-blue-700",        check: "text-blue-500",    border: "border-blue-200"    },
  amber:   { badge: "bg-amber-100 text-amber-700",      check: "text-amber-500",   border: "border-amber-200"   },
  orange:  { badge: "bg-orange-100 text-orange-700",    check: "text-orange-500",  border: "border-orange-200"  },
  gray:    { badge: "bg-gray-100 text-gray-700",        check: "text-gray-500",    border: "border-gray-200"    },
};

function colorClasses(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;
}

const SUBJECT_NAMES: Record<string, string> = {
  "0653": "Combined Science",
  "0580": "Mathematics",
  "0500": "English First Language",
  "0680": "Environmental Management",
};

// Only 0653 has a Paper 2 / Paper 4 choice
const HAS_PAPER_CHOICE = new Set(["0653"]);

type PaperPref   = "P2" | "P4" | "both";
type SelfAssess  = "starter" | "some_practice" | "revision";
type TargetGrade = "A*" | "A" | "B";

interface Props {
  code: string;
  initialCovered: string[];
  initialPaperPref?: PaperPref;
}

export default function OnboardingForm({ code, initialCovered, initialPaperPref }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const hasPaperChoice = HAS_PAPER_CHOICE.has(code);
  // Steps: paperChoice? → selfAssess → targetGrade → topics
  const totalSteps = hasPaperChoice ? 4 : 3;

  const [step, setStep]           = useState(1);
  const [paperPref, setPaperPref] = useState<PaperPref>(initialPaperPref ?? "both");
  const [selfAssess, setSelf]     = useState<SelfAssess>("starter");
  const [targetGrade, setTarget]  = useState<TargetGrade>("A*");
  const [covered, setCovered]     = useState<Set<string>>(new Set(initialCovered));

  const sections  = getSections(code);
  const allTopics = sections.flatMap(s => s.topics);
  const subName   = SUBJECT_NAMES[code] ?? "Your Subject";
  const pct       = Math.round(((step - 1) / totalSteps) * 100);

  const toggle = (topic: string) => {
    setCovered(prev => {
      const next = new Set(prev);
      next.has(topic) ? next.delete(topic) : next.add(topic);
      return next;
    });
  };

  const toggleSection = (topics: string[]) => {
    const allChecked = topics.every(t => covered.has(t));
    setCovered(prev => {
      const next = new Set(prev);
      topics.forEach(t => allChecked ? next.delete(t) : next.add(t));
      return next;
    });
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveTopicSetup(code, Array.from(covered), "all", {
        paperPreference: hasPaperChoice ? paperPref : "both",
        selfAssessment:  selfAssess,
        targetGrade,
      });
      router.push(code === "0653" ? "/dashboard/combined-science" : `/subject/${code}`);
    } catch {
      setSaving(false);
    }
  };

  // ─── Step resolver ───
  // hasPaperChoice: step 1=paper, 2=assess, 3=target, 4=topics
  // no paper:       step 1=assess, 2=target, 3=topics
  const paperStep  = hasPaperChoice ? 1 : -1;
  const assessStep = hasPaperChoice ? 2 : 1;
  const targetStep = hasPaperChoice ? 3 : 2;
  const topicsStep = hasPaperChoice ? 4 : 3;

  const goNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {subName} · Setup
            </span>
            <span className="text-xs font-black text-gray-500">Step {step}/{totalSteps}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">

        {/* ═════════════════ STEP: Paper Choice ════════════════════════════ */}
        {step === paperStep && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">
                Which paper are you sitting?
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                Cambridge IGCSE {subName} has two written papers. Choose your focus.
              </p>
            </div>

            {(
              [
                {
                  v: "P2" as PaperPref,
                  icon: "🔵",
                  title: "Paper 2 — Multiple Choice",
                  sub: "40 questions · 45 minutes",
                  desc: "Nail the MCQ section with speed and accuracy.",
                  c: "border-blue-400 bg-blue-50",
                },
                {
                  v: "P4" as PaperPref,
                  icon: "🟣",
                  title: "Paper 4 — Extended Theory",
                  sub: "Structured questions · 75 minutes",
                  desc: "Deep understanding, written explanations and mark scheme answers.",
                  c: "border-violet-400 bg-violet-50",
                },
                {
                  v: "both" as PaperPref,
                  icon: "⭐",
                  title: "Both — Full A* Preparation",
                  sub: "Recommended",
                  desc: "Train on both MCQ and theory for maximum marks.",
                  c: "border-emerald-400 bg-emerald-50",
                },
              ] as const
            ).map(opt => (
              <button
                key={opt.v}
                onClick={() => setPaperPref(opt.v)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  paperPref === opt.v ? opt.c + " shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">{opt.title}</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">{opt.sub}</p>
                    <p className="text-sm text-gray-600 mt-2">{opt.desc}</p>
                  </div>
                  {paperPref === opt.v && (
                    <CheckCircle2 size={22} className="shrink-0 text-emerald-500" />
                  )}
                </div>
              </button>
            ))}

            <button
              onClick={goNext}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ═════════════════ STEP: Self-Assessment ══════════════════════════ */}
        {step === assessStep && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap size={32} className="text-orange-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">
                Where are you right now?
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                {"We'll build your personalised Level 1\u219250 roadmap to A*."}
              </p>
            </div>

            {(
              [
                {
                  v: "starter" as SelfAssess,
                  icon: <Zap size={20} className="text-blue-600" />,
                  bg: "bg-blue-100",
                  title: "Just Starting Out",
                  sub: "Haven't studied much yet",
                  desc: "Roadmap starts at Level 1 — we build everything from scratch.",
                  c: "border-blue-400 bg-blue-50",
                },
                {
                  v: "some_practice" as SelfAssess,
                  icon: <BookOpen size={20} className="text-amber-600" />,
                  bg: "bg-amber-100",
                  title: "Done Some Practice",
                  sub: "Know the basics, need to go deeper",
                  desc: "Starts at Level 15 — skip basics, go straight to intermediate.",
                  c: "border-amber-400 bg-amber-50",
                },
                {
                  v: "revision" as SelfAssess,
                  icon: <Flame size={20} className="text-red-600" />,
                  bg: "bg-red-100",
                  title: "Full Revision Mode",
                  sub: "Exam is close — need to sharpen up",
                  desc: "Starts at Level 30 — advanced mixed questions and paper simulations.",
                  c: "border-red-400 bg-red-50",
                },
              ] as const
            ).map(opt => (
              <button
                key={opt.v}
                onClick={() => setSelf(opt.v)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  selfAssess === opt.v ? opt.c + " shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${opt.bg} flex items-center justify-center shrink-0`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">{opt.title}</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">{opt.sub}</p>
                    <p className="text-sm text-gray-600 mt-2">{opt.desc}</p>
                  </div>
                  {selfAssess === opt.v && (
                    <CheckCircle2 size={22} className="shrink-0 text-emerald-500" />
                  )}
                </div>
              </button>
            ))}

            <div className="flex gap-3">
              {hasPaperChoice && (
                <button
                  onClick={goBack}
                  className="px-5 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 font-black text-gray-700 flex items-center gap-1 transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                onClick={goNext}
                className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════ STEP: Target Grade ════════════════════════════ */}
        {step === targetStep && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy size={32} className="text-yellow-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">
                What&apos;s your target grade?
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                {"We'll tailor the roadmap difficulty to your goal."}
              </p>
            </div>

            {(
              [
                {
                  v: "A*" as TargetGrade,
                  icon: "🌟",
                  title: "A* — Excellence",
                  sub: "Top 5% · The highest grade",
                  desc: "Full 50-level roadmap: MCQ + theory, all years, hardest questions.",
                  c: "border-yellow-400 bg-yellow-50",
                },
                {
                  v: "A" as TargetGrade,
                  icon: "⭐",
                  title: "A — Very Good",
                  sub: "Top 15% · Strong performance",
                  desc: "40 levels — core topics + intermediate theory questions.",
                  c: "border-blue-400 bg-blue-50",
                },
                {
                  v: "B" as TargetGrade,
                  icon: "✅",
                  title: "B — Good",
                  sub: "Solid pass",
                  desc: "30 levels — foundation and intermediate MCQ practice.",
                  c: "border-emerald-400 bg-emerald-50",
                },
              ] as const
            ).map(opt => (
              <button
                key={opt.v}
                onClick={() => setTarget(opt.v)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  targetGrade === opt.v ? opt.c + " shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">{opt.title}</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">{opt.sub}</p>
                    <p className="text-sm text-gray-600 mt-2">{opt.desc}</p>
                  </div>
                  {targetGrade === opt.v && (
                    <CheckCircle2 size={22} className="shrink-0 text-emerald-500" />
                  )}
                </div>
              </button>
            ))}

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="px-5 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 font-black text-gray-700 flex items-center gap-1 transition-all"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={goNext}
                className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════ STEP: Topics Covered ══════════════════════════ */}
        {step === topicsStep && (
          <div className="space-y-6 animate-slide-up pb-28">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">
                What have you covered in school?
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                Tick what your teacher has taught you — or skip if you&apos;re just starting.
              </p>
            </div>

            {/* Skip link */}
            <button
              onClick={() => { setCovered(new Set()); handleFinish(); }}
              className="w-full text-center text-sm font-black text-blue-500 hover:text-blue-700 transition-colors py-1"
            >
              I&apos;m just starting — skip this step →
            </button>

            {/* Topic sections */}
            {sections.map(section => {
              const cls = colorClasses(section.color);
              const sectionDone = section.topics.every(t => covered.has(t));
              const sectionSome = section.topics.some(t => covered.has(t));
              return (
                <div key={section.label} className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.topics)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${cls.badge}`}>
                      {section.label[0]}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-gray-900">{section.label}</p>
                      <p className="text-xs font-bold text-gray-400">
                        {section.topics.filter(t => covered.has(t)).length}/{section.topics.length} covered
                      </p>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${cls.badge}`}>
                      {sectionDone ? "All ✓" : sectionSome ? "Partial" : "Select all"}
                    </span>
                  </button>
                  <div className={`border-t-2 ${cls.border}`}>
                    {section.topics.map(topic => {
                      const isChecked = covered.has(topic);
                      return (
                        <button
                          key={topic}
                          onClick={() => toggle(topic)}
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors text-left"
                        >
                          {isChecked
                            ? <CheckCircle2 size={20} className={cls.check} />
                            : <Circle size={20} className="text-gray-300" />
                          }
                          <span className={`text-sm font-semibold flex-1 ${isChecked ? "text-gray-900" : "text-gray-500"}`}>
                            {topic}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Insight box */}
            {covered.size > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <Star size={18} className="text-blue-600 shrink-0" />
                <p className="text-sm font-bold text-blue-700">
                  <span className="font-black">{covered.size}</span> topics marked as covered.
                  They&apos;ll appear in your &ldquo;Review&rdquo; lane first.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fixed bottom CTA (for topics step) ──────────────────────────── */}
      {step === topicsStep && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto flex gap-3 items-center">
            <button
              onClick={goBack}
              className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-black text-gray-700 flex items-center gap-1 transition-all"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-black text-gray-900">{covered.size} topics selected</p>
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-[0.98]"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {covered.size === 0 ? "Skip & Start" : "🚀 Build My Roadmap"}
            </button>
          </div>
        </div>
      )}

      {/* ── Global saving overlay ────────────────────────────────────────── */}
      {saving && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 border border-gray-200">
            <Loader2 size={22} className="animate-spin text-blue-600" />
            <span className="font-black text-gray-900">Building your A* roadmap…</span>
          </div>
        </div>
      )}
    </div>
  );
}
