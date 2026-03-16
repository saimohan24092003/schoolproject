"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  submitSmartPractice, getAIExplanation, validateSmartPracticeAnswer,
} from "@/server/actions/smart-practice";
import { markLevelComplete } from "@/server/actions/topic-progress";
import { markRoadmapLevelComplete } from "@/server/actions/roadmap";
import {
  startPracticeSession,
  recordQuestionAttempt,
  completePracticeSession,
} from "@/server/actions/activity-tracker";
import { QuestionResources, stripResourceNotes } from "@/components/QuestionResources";
import { cleanMarkSchemeForDisplay } from "@/lib/marking-scheme";
import type { ChangeEvent } from "react";
import {
  X, Heart, Zap, CheckCircle2, XCircle, ArrowRight,
  RotateCcw, Sparkles, Loader2, Trophy, Star, Flame,
  Lightbulb, Lock, BookOpen, Target,
} from "lucide-react";

/* â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
interface Question {
  id?: number; challengeId?: number; number: number;
  text: string; marks: number; topic?: string;
  questionType?: "MCQ" | "THEORY";
  options?: string[];
  correctAnswer?: number;
  markingSchemeAnswer?: string; sourcePaper?: string;
  imageSrc?: string | null;
  audioSrc?: string | null;
}
interface SmartSessionProps {
  initialData: { title: string; topic: string; questions: Question[]; sessionType?: string };
  userId: string; level?: number; subjectCode?: string; paperType?: string; roadmapLevel?: number;
}
type Phase = "question" | "feedback" | "complete";
type Verdict = "correct" | "wrong" | null;

/* XP constants */
const XP_CORRECT_BASE = 10;   // base XP per correct answer
const XP_LEVEL_BONUS = [0, 0, 5, 10]; // extra per level (L1=0, L2=5, L3=10)
const XP_STREAK_DIVISOR = 3;    // every 3-streak gives +bonus
const XP_HINT_PENALTY = 2;    // each hint used reduces final XP by this much

/* â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ Sound helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
function playSound(type: "correct" | "wrong" | "hint" | "complete") {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    if (type === "correct") {
      [[523, 0], [659, .12], [784, .24]].forEach(([freq, when]) => {
        const o = ctx.createOscillator();
        o.connect(gain); o.frequency.value = freq; o.type = "sine";
        gain.gain.setValueAtTime(.18, ctx.currentTime + when!);
        gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + when! + .18);
        o.start(ctx.currentTime + when!); o.stop(ctx.currentTime + when! + .22);
      });
    } else if (type === "wrong") {
      const o = ctx.createOscillator();
      o.connect(gain); o.frequency.value = 260; o.type = "sawtooth";
      gain.gain.setValueAtTime(.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .35);
      o.start(); o.stop(ctx.currentTime + .38);
    } else if (type === "hint") {
      const o = ctx.createOscillator();
      o.connect(gain); o.frequency.value = 440; o.type = "sine";
      gain.gain.setValueAtTime(.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .2);
      o.start(); o.stop(ctx.currentTime + .22);
    } else {
      [[523, 0], [659, .1], [784, .2], [1047, .35]].forEach(([freq, when]) => {
        const o = ctx.createOscillator();
        o.connect(gain); o.frequency.value = freq; o.type = "sine";
        gain.gain.setValueAtTime(.2, ctx.currentTime + when!);
        gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + when! + .25);
        o.start(ctx.currentTime + when!); o.stop(ctx.currentTime + when! + .3);
      });
    }
  } catch { }
}

/* â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ Confetti â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
function Confetti() {
  const PIECES = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    color: ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"][i % 7],
    left: `${(i * 37) % 100}%`,
    delay: `${(i * 0.07) % 1.4}s`,
    size: 7 + (i % 6) * 2,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {PIECES.map((p) => (
        <div key={p.id} className="absolute top-0 animate-float-score"
          style={{ left: p.left, animationDelay: p.delay, animationDuration: "1.8s" }}>
          <div style={{
            width: p.size, height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? "50%" : "2px",
            transform: `rotate(${p.id * 23}deg)`,
          }} />
        </div>
      ))}
    </div>
  );
}

/* â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ XP Float label â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
function XPFloat({ amount, visible }: { amount: number; visible: boolean }) {
  return visible ? (
    <div className="fixed top-20 right-6 z-50 flex items-center gap-1.5 bg-yellow-400 text-yellow-900 font-black text-sm px-4 py-2 rounded-full shadow-lg animate-float-score pointer-events-none">
      <Zap size={14} className="fill-yellow-900" /> +{amount} XP
    </div>
  ) : null;
}

/* â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ Hint Levels â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
const HINT_LEVELS = [
  {
    label: "Direction Hint",
    emoji: "🧭",
    bg: "bg-amber-50", border: "border-amber-300",
    header: "bg-amber-100", text: "text-amber-900",
    badge: "bg-amber-200 text-amber-800",
    dot: "bg-amber-400",
  },
  {
    label: "Concept Clue",
    emoji: "💡",
    bg: "bg-orange-50", border: "border-orange-300",
    header: "bg-orange-100", text: "text-orange-900",
    badge: "bg-orange-200 text-orange-800",
    dot: "bg-orange-400",
  },
  {
    label: "Narrow It Down",
    emoji: "🎯",
    bg: "bg-rose-50", border: "border-rose-300",
    header: "bg-rose-100", text: "text-rose-900",
    badge: "bg-rose-200 text-rose-800",
    dot: "bg-rose-400",
  },
  {
    label: "Final Clue",
    emoji: "🔑",
    bg: "bg-red-50", border: "border-red-300",
    header: "bg-red-100", text: "text-red-900",
    badge: "bg-red-200 text-red-800",
    dot: "bg-red-400",
  },
];

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const MAX_HINTS = 4;

/* â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ Main component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
export default function SmartSession({
  initialData, userId, level, subjectCode, paperType, roadmapLevel,
}: SmartSessionProps) {
  const router = useRouter();
  const questions = initialData.questions;

  /* â"€â"€ State â"€â"€ */
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [selected, setSelected] = useState<string | null>(null);
  const [textAns, setTextAns] = useState("");
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [feedback, setFeedback] = useState({ text: "", hint: "", marks: 0, max: 1 });
  const [checking, setChecking] = useState(false);
  const [hearts, setHearts] = useState(5);
  const [heartAnim, setHeartAnim] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [xpFloat, setXpFloat] = useState(false);
  const [xpFloatAmt, setXpFloatAmt] = useState(0);
  const [optionShake, setOptionShake] = useState(false);
  const [results, setResults] = useState<Record<number, { correct: boolean; answer: string; hintsUsed: number }>>({});
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingExp, setLoadingExp] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Record<number, File[]>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<Record<number, "ok" | "failed" | "none">>({});
  // Per-question wrong attempt counter (for hint gating)
  const [qWrongCount, setQWrongCount] = useState<Record<number, number>>({});
  // Hints already shown per question
  const [shownHints, setShownHints] = useState<Record<number, string[]>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [timerSec, setTimerSec] = useState(0);

  const xpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(Date.now());
  const qStartTime = useRef<number>(Date.now());

  const question = questions[qIdx];
  const isTheory = question?.questionType === "THEORY" || !question?.options?.length;
  const isHindi = subjectCode === "0549";
  // Hindi mode: image-upload is primary answer (only for explicit THEORY type, not image-MCQs)
  const imageOnlyMode = isHindi && question?.questionType === "THEORY";
  const progress = ((qIdx + 1) / questions.length) * 100;

  const lvl = level ?? 1;
  const xpBase = XP_CORRECT_BASE + (XP_LEVEL_BONUS[lvl] ?? 0);
  const currentHints = shownHints[qIdx]?.length ?? 0;

  /* â"€â"€ Session timer â"€â"€ */
  useEffect(() => {
    const id = setInterval(() => setTimerSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* â"€â"€ Start session in DB â"€â"€ */
  useEffect(() => {
    startPracticeSession({
      subjectCode: subjectCode ?? "unknown",
      topicName: initialData.topic,
      level: lvl,
      paperType: paperType as "P2" | "P4" | undefined ?? null,
    }).then(id => setSessionId(id)).catch(() => { });
    qStartTime.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* â"€â"€ Show XP popup â"€â"€ */
  const showXP = useCallback((amt: number) => {
    setXpFloatAmt(amt); setXpFloat(true);
    if (xpTimer.current) clearTimeout(xpTimer.current);
    xpTimer.current = setTimeout(() => setXpFloat(false), 1400);
  }, []);

  /* â"€â"€ Compute XP for this question â"€â"€ */
  const computeXP = useCallback((
    isCorrect: boolean, streakAtTime: number, hintsUsed: number
  ): number => {
    if (!isCorrect) return 0;
    const streakBonus = streakAtTime >= XP_STREAK_DIVISOR
      ? Math.floor(streakAtTime / XP_STREAK_DIVISOR) * 3
      : 0;
    const hintPenalty = hintsUsed * XP_HINT_PENALTY;
    return Math.max(1, xpBase + streakBonus - hintPenalty);
  }, [xpBase]);

  /* â"€â"€ Check answer â"€â"€ */
  const handleCheck = async () => {
    if (checking || phase !== "question") return;
    const answer = isTheory ? textAns : (selected ?? "");
    if (!answer.trim()) return;
    setChecking(true);

    try {
      const res = await validateSmartPracticeAnswer({
        challengeId: question.challengeId ?? question.id,
        questionText: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        markingSchemeAnswer: question.markingSchemeAnswer,
        marks: question.marks || 1,
        userAnswer: answer,
        clientAttempts: qWrongCount[qIdx] || 0,
        subjectCode: subjectCode,
        latestHintShown: (shownHints[qIdx] ?? []).slice(-1)[0],
        hintHistory: shownHints[qIdx] ?? [],
      });

      setFeedback({ text: res.feedback, hint: res.hint, marks: res.awardedMarks, max: res.maxMarks });
      setVerdict(res.isCorrect ? "correct" : "wrong");

      const hintsThisQ = shownHints[qIdx]?.length ?? 0;

      if (res.isCorrect) {
        const earned = computeXP(true, streak, hintsThisQ);
        setTotalXP(prev => prev + earned);
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak(prev => Math.max(prev, newStreak));
        showXP(earned);
        playSound("correct");
        setResults(prev => ({ ...prev, [qIdx]: { correct: true, answer, hintsUsed: hintsThisQ } }));

        // Record to DB
        if (sessionId) {
          recordQuestionAttempt({
            sessionId,
            challengeId: question.challengeId ?? question.id ?? null,
            isCorrect: true,
            hintsUsedThisQuestion: hintsThisQ,
            xpEarned: earned,
            timeTaken: Math.round((Date.now() - qStartTime.current) / 1000),
          }).catch(() => { });
        }
      } else {
        const newWrong = (qWrongCount[qIdx] || 0) + 1;
        setQWrongCount(prev => ({ ...prev, [qIdx]: newWrong }));
        setStreak(0);
        setHearts(prev => Math.max(0, prev - 1));
        setHeartAnim(true);
        setOptionShake(true);
        playSound("wrong");
        setResults(prev => ({ ...prev, [qIdx]: { correct: false, answer, hintsUsed: hintsThisQ } }));
        setTimeout(() => { setHeartAnim(false); setOptionShake(false); }, 600);

        // Show hint if available
        if (newWrong <= MAX_HINTS && res.hint) {
          const existing = shownHints[qIdx] ?? [];
          const hintText = res.hint;
          if (!existing.includes(hintText)) {
            setShownHints(prev => ({
              ...prev,
              [qIdx]: [...existing, hintText],
            }));
            playSound("hint");
          }
        }

        // Record wrong attempt
        if (sessionId) {
          recordQuestionAttempt({
            sessionId,
            challengeId: question.challengeId ?? question.id ?? null,
            isCorrect: false,
            hintsUsedThisQuestion: 0,
            xpEarned: 0,
            timeTaken: Math.round((Date.now() - qStartTime.current) / 1000),
          }).catch(() => { });
        }
      }
      setPhase("feedback");
    } finally {
      setChecking(false);
    }
  };

  /* â"€â"€ Try Again (wrong answer retry) â"€â"€ */
  const handleTryAgain = () => {
    const wrongSoFar = qWrongCount[qIdx] || 0;
    if (wrongSoFar >= MAX_HINTS) {
      // Exhausted all hints — force move on
      handleContinue();
      return;
    }
    setPhase("question");
    setSelected(null);
    setTextAns("");
    setQuestionExpanded(false);
    setVerdict(null);
    qStartTime.current = Date.now();
  };

  /* â"€â"€ Continue to next â"€â"€ */
  const handleContinue = async () => {
    if (qIdx < questions.length - 1) {
      setQIdx(prev => prev + 1);
      setPhase("question");
      setSelected(null);
      setTextAns("");
      setVerdict(null);
      qStartTime.current = Date.now();
    } else {
      // Session complete
      const correct = Object.values(results).filter(r => r.correct).length;
      const score = Math.round((correct / questions.length) * 100);
      const wrongCount = questions.length - correct;
      const totalHints = Object.values(shownHints).reduce((s, arr) => s + arr.length, 0);

      try {
        const res = await submitSmartPractice(userId, initialData.topic, score, questions.length);
        setSessionXP(res.points + totalXP);
      } catch { setSessionXP(totalXP); }

      // Persist level completion
      if (lvl && subjectCode) {
        try { await markLevelComplete(subjectCode, initialData.topic, lvl, score); } catch { }
        if (roadmapLevel) {
          try { await markRoadmapLevelComplete(subjectCode, roadmapLevel, score, totalXP); } catch { }
        }
      }

      // Persist full session stats
      if (sessionId) {
        completePracticeSession({
          sessionId,
          subjectCode: subjectCode ?? "unknown",
          topicName: initialData.topic,
          level: lvl,
          score,
          totalXP,
          wrongAnswers: wrongCount,
          totalHints,
          status: "completed",
        }).catch(() => { });
      }

      setShowConfetti(score >= 70);
      playSound("complete");
      setPhase("complete");
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploads(prev => ({ ...prev, [qIdx]: [...(prev[qIdx] || []), ...files] }));
    // Auto-transcribe with OCR
    setOcrLoading(true);
    setOcrStatus(prev => ({ ...prev, [qIdx]: "none" }));
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("q_0", f));
      console.log("[OCR] Uploading", files.length, "file(s):", files.map(f => `${f.name} (${f.type}, ${f.size}B)`));
      const res = await fetch("/api/handwritten-ocr", { method: "POST", body: fd });
      console.log("[OCR] Response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[OCR] Response data:", data);
        const transcribed = (data.extracted?.q_0 || "").trim();
        const rawDebug = data.debug?.raw?.q_0?.raw ?? "";
        if (transcribed) {
          setTextAns(prev => prev ? `${prev}\n${transcribed}` : transcribed);
          setOcrStatus(prev => ({ ...prev, [qIdx]: "ok" }));
        } else {
          const status = rawDebug === "RATE_LIMIT" ? "failed:RATE_LIMIT" : "failed";
          setOcrStatus(prev => ({ ...prev, [qIdx]: status as any }));
        }
      } else {
        const errText = await res.text().catch(() => "");
        console.error("[OCR] HTTP error", res.status, errText);
        setOcrStatus(prev => ({ ...prev, [qIdx]: "failed" }));
      }
    } catch (err) {
      console.error("[OCR] Fetch exception:", err);
      setOcrStatus(prev => ({ ...prev, [qIdx]: "failed" }));
    }
    setOcrLoading(false);
  };

  const handleGetExplanation = async (idx: number) => {
    const q = questions[idx];
    setLoadingExp(idx);
    try {
      const exp = await getAIExplanation(
        q.text, q.options || [],
        q.options?.[q.correctAnswer as number] || q.markingSchemeAnswer || "",
        results[idx]?.answer || "",
        q.topic || initialData.topic,
        q.markingSchemeAnswer || undefined
      );
      setExplanations(prev => ({ ...prev, [idx]: exp }));
    } catch { }
    setLoadingExp(null);
  };

  // Auto-load explanations for all wrong answers when session completes
  const autoExplainDone = useRef(false);
  useEffect(() => {
    if (phase !== "complete" || autoExplainDone.current) return;
    autoExplainDone.current = true;
    const wrongIdxs = questions
      .map((_, i) => i)
      .filter(i => results[i] && !results[i].correct);
    wrongIdxs.forEach(idx => handleGetExplanation(idx));
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* â"€â"€ Option styling helper â"€â"€ */
  const optionClass = (opt: string) => {
    const isSelected = selected === opt;
    const correctText = question?.options?.[question.correctAnswer as number] ?? "";
    const isCorrectOpt = opt === correctText;
    // Only reveal correct answer once hints are exhausted
    const revealCorrect = hintsExhausted;

    if (phase === "question") {
      return isSelected
        ? "border-blue-500 bg-blue-50 scale-[1.01] shadow-md shadow-blue-100"
        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:scale-[1.01]";
    }
    if (revealCorrect && isCorrectOpt) return "border-emerald-400 bg-emerald-50";
    if (isSelected && verdict === "wrong") return `border-red-300 bg-red-50 ${optionShake ? "animate-shake" : ""}`;
    // Other options: neutral, not marked wrong — just slightly dimmed
    return "border-gray-200 bg-white opacity-50 cursor-not-allowed";
  };

  /* â"€â"€ Timer format â"€â"€ */
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const buildSessionHref = useCallback((targetLevel: number, runToken?: string) => {
    const params = new URLSearchParams();
    if (subjectCode) params.set("subject", subjectCode);
    params.set("level", String(targetLevel));
    if (paperType === "P2" || paperType === "P4") params.set("paperType", paperType);
    if (runToken) params.set("run", runToken);
    return `/learn/smart-practice/${encodeURIComponent(initialData.topic)}?${params.toString()}`;
  }, [initialData.topic, paperType, subjectCode]);

  const getTopicsHref = useCallback(() => {
    if (!subjectCode) return "/learn/smart-practice";
    return `/learn/smart-practice?subject=${encodeURIComponent(subjectCode)}`;
  }, [subjectCode]);

  const handleRetryLevel = useCallback(() => {
    router.push(buildSessionHref(lvl, String(Date.now())));
  }, [buildSessionHref, lvl, router]);

  /* â•â•â•â•â•â•â•â•â•â• COMPLETE SCREEN â•â•â•â•â•â•â•â•â•â• */
  if (phase === "complete") {
    const correct = Object.values(results).filter(r => r.correct).length;
    const finalPct = Math.round((correct / questions.length) * 100);
    const grade = finalPct >= 80 ? "A*" : finalPct >= 70 ? "A" : finalPct >= 60 ? "B" : finalPct >= 50 ? "C" : "D";
    const gradeTone = finalPct >= 80
      ? "from-emerald-500 to-teal-500"
      : finalPct >= 60
        ? "from-blue-500 to-indigo-500"
        : "from-amber-500 to-orange-500";
    const totalWrong = Object.values(results).filter(r => !r.correct).length;
    const totalHints = Object.values(shownHints).reduce((s, arr) => s + arr.length, 0);

    const wrongEntries = questions
      .map((q, idx) => ({
        idx,
        question: q,
        result: results[idx],
        hintCount: shownHints[idx]?.length ?? 0,
      }))
      .filter((entry) => entry.result && !entry.result.correct);

    const conceptFocus = wrongEntries.slice(0, 3).map((entry) => {
      const aiExplanation = explanations[entry.idx]?.trim();
      const markSchemeNote = cleanMarkSchemeForDisplay(entry.question.markingSchemeAnswer || "").trim();
      const concept = aiExplanation || markSchemeNote || "Review this step carefully and compare your method with the model approach.";
      return {
        ...entry,
        concept,
      };
    });

    const weakTopics = Array.from(
      new Set(
        wrongEntries
          .map((entry) => entry.question.topic?.trim())
          .filter((topic): topic is string => !!topic)
      )
    ).slice(0, 3);

    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-100 via-white to-blue-50">
        {showConfetti && <Confetti />}

        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-slate-200 bg-white p-2 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <X size={18} className="text-slate-500" />
            </button>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Session Complete</p>
              <p className="text-sm font-bold text-slate-800">{initialData.topic}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:py-8">
          <section className={`rounded-3xl border border-white/40 bg-gradient-to-br ${gradeTone} p-6 text-white shadow-xl shadow-slate-900/10 md:p-7`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Trophy size={28} className="text-white" />
                </div>
                <h1 className="text-3xl font-black md:text-4xl">
                  {grade} - {finalPct}%
                </h1>
                <p className="mt-1 text-sm font-semibold text-white/90">
                  {roadmapLevel ? `Roadmap Level ${roadmapLevel}/50 · ` : ""}Level {lvl} complete in {fmtTime(timerSec)}
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Heart
                    key={i}
                    size={18}
                    className={i < hearts ? "fill-rose-200 text-rose-200" : "fill-white/25 text-white/25"}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-3xl font-black text-emerald-700">{correct}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">Correct</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-center">
              <p className="text-3xl font-black text-yellow-700">{sessionXP}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-yellow-600">XP Earned</p>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
              <p className="text-3xl font-black text-orange-700">{bestStreak}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-orange-600">Best Streak</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
              <p className="text-3xl font-black text-rose-700">{totalWrong}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">Wrong</p>
            </div>
          </section>

          {totalHints > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-amber-800">
                <Lightbulb size={16} />
                {totalHints} hint{totalHints !== 1 ? "s" : ""} used this session
              </p>
              <p className="mt-1 text-xs font-semibold text-amber-700">Good recovery. Try to solve with fewer hints next round.</p>
            </section>
          )}

          {finalPct >= 60 && lvl < 3 && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-blue-800">
                <Star size={16} className="fill-blue-500 text-blue-500" />
                Level {lvl + 1} unlocked
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-700">You passed 60 percent, so the next level is now available.</p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              <Target size={13} />
              Concepts To Revise
            </p>
            {conceptFocus.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-700">Excellent work. No weak concepts detected in this session.</p>
            ) : (
              <div className="space-y-3">
                {conceptFocus.map((entry) => (
                  <div key={entry.idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Q{entry.idx + 1}{entry.question.topic ? ` - ${entry.question.topic}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700 line-clamp-2">
                      {stripResourceNotes(entry.question.text)}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-line">
                      {entry.concept}
                    </p>
                    {entry.hintCount > 0 && (
                      <p className="mt-2 text-xs font-bold text-amber-700">
                        Hints used: {entry.hintCount}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {weakTopics.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-slate-600">
                Next focus: {weakTopics.join(", ")}.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Question Review</p>
            <div className="space-y-2.5">
              {questions.map((q, idx) => {
                const r = results[idx];
                const hCount = shownHints[idx]?.length ?? 0;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 ${r?.correct ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/60"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${r?.correct ? "bg-emerald-500" : "bg-rose-500"}`}>
                        {r?.correct ? <CheckCircle2 size={13} className="text-white" /> : <XCircle size={13} className="text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">{stripResourceNotes(q.text)}</p>
                        {r?.answer && (
                          <p className={`mt-1 text-xs font-bold ${r.correct ? "text-emerald-700" : "text-rose-700"}`}>
                            Your answer: {r.answer.length > 60 ? `${r.answer.slice(0, 60)}...` : r.answer}
                          </p>
                        )}
                        {!r?.correct && explanations[idx] && (
                          <p className="mt-2 whitespace-pre-line text-xs font-medium leading-relaxed text-slate-700">
                            {explanations[idx]}
                          </p>
                        )}
                        {!r?.correct && !explanations[idx] && loadingExp !== idx && (
                          <button
                            onClick={() => handleGetExplanation(idx)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700 transition hover:text-blue-500"
                          >
                            <Sparkles size={11} />
                            Explain concept
                          </button>
                        )}
                        {loadingExp === idx && (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                            <Loader2 size={11} className="animate-spin" />
                            Generating explanation...
                          </p>
                        )}
                      </div>
                      {hCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                          {hCount} hint{hCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 pb-8">
            {lvl < 3 ? (
              <button
                onClick={() => router.push(buildSessionHref(lvl + 1, String(Date.now())))}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:from-violet-500 hover:to-blue-500"
              >
                <Star size={15} />
                {finalPct >= 60 ? `Start Level ${lvl + 1}` : `Open Level ${lvl + 1}`}
              </button>
            ) : (
              <button
                onClick={() => router.push(getTopicsHref())}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-black text-white transition hover:from-emerald-500 hover:to-teal-500"
              >
                <Trophy size={15} />
                Topic Mastered - Pick Next Topic
              </button>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                onClick={() => router.push(getTopicsHref())}
                className="rounded-2xl border border-slate-300 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Topics
              </button>
              <button
                onClick={handleRetryLevel}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
              >
                <RotateCcw size={14} />
                Retry Level
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl border border-slate-300 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* HEARTS OUT screen */
  if (hearts === 0 && phase === "feedback" && verdict === "wrong" && (qWrongCount[qIdx] || 0) >= MAX_HINTS) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-4 animate-bounce-in">💔</div>
        <h2 className="text-2xl font-black text-white mb-2">Out of Hearts!</h2>
        <p className="text-slate-400 font-medium mb-8">Take a break, review your notes, then come back stronger.</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push("/dashboard")}
            className="flex-1 py-3 rounded-2xl border border-slate-700 font-black text-slate-300">
            Home
          </button>
          <button onClick={handleRetryLevel}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* â•â•â•â•â•â•â•â•â•â• ACTIVE QUESTION SCREEN â•â•â•â•â•â•â•â•â•â• */
  const correctOptText = question?.options?.[question.correctAnswer as number] ?? "";
  const wrongThisQ = qWrongCount[qIdx] || 0;
  const hintsForThisQ = shownHints[qIdx] ?? [];
  const lastHint = hintsForThisQ[hintsForThisQ.length - 1] ?? "";
  const hintsExhausted = wrongThisQ >= MAX_HINTS;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      <XPFloat amount={xpFloatAmt} visible={xpFloat} />

      {/* â"€â"€ Top bar â"€â"€ */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0 bg-white">
        <button onClick={() => {
          if (sessionId) {
            completePracticeSession({
              sessionId,
              subjectCode: subjectCode ?? "unknown",
              topicName: initialData.topic,
              level: lvl,
              score: 0,
              totalXP,
              wrongAnswers: Object.values(results).filter(r => !r.correct).length,
              totalHints: Object.values(shownHints).reduce((s, a) => s + a.length, 0),
              status: "abandoned",
            }).catch(() => { });
          }
          router.back();
        }} className="p-1.5 rounded-lg hover:bg-gray-100">
          <X size={20} className="text-gray-400" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          {roadmapLevel && (
            <span className="hidden sm:inline text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
              L{roadmapLevel}/50
            </span>
          )}
          {/* Timer */}
          <span className="text-xs font-black text-gray-400 tabular-nums">
            {fmtTime(timerSec)}
          </span>
          {/* Hearts */}
          <div className={`flex gap-0.5 ${heartAnim ? "animate-shake" : ""}`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart key={i} size={17}
                className={i < hearts
                  ? `fill-red-500 text-red-500 ${heartAnim && i === hearts ? "animate-heartbeat" : ""}`
                  : "fill-gray-300 text-gray-300"}
              />
            ))}
          </div>
        </div>
      </div>

      {/* â"€â"€ Streak banner â"€â"€ */}
      {streak >= 2 && (
        <div className="flex items-center justify-center gap-2 py-2 bg-orange-50 border-b border-orange-200 shrink-0">
          <Flame size={15} className="text-orange-500 fill-orange-400 animate-streak-fire" />
          <span className="text-xs font-black text-orange-600">{streak} in a row!</span>
          <span className="text-[10px] text-orange-500 font-bold">Streak bonus active</span>
        </div>
      )}

      {/* â"€â"€ XP + Topic row â"€â"€ */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-gray-200">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-yellow-500 fill-yellow-400" />
          <span className="text-xs font-black text-yellow-600">{totalXP} XP</span>
        </div>
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[200px]">
          {initialData.topic}
        </span>
        <span className="text-xs font-black text-gray-500">
          {qIdx + 1}<span className="text-gray-300">/{questions.length}</span>
        </span>
      </div>

      {/* â"€â"€ Question area â"€â"€ */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-xl mx-auto">
          {/* Level + type badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {question?.topic && (
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                {question.topic}
              </span>
            )}
            {isTheory && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
                <BookOpen size={10} /> Written Answer
              </span>
            )}
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ml-auto ${lvl === 1 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : lvl === 2 ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-violet-50 text-violet-700 border border-violet-200"
              }`}>
              Level {lvl}
            </span>
          </div>

          {/* Audio player for listening questions (e.g. Hindi Paper 2) */}
          {question?.audioSrc && (
            <div className="mb-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
                🎧 Listen — then answer below
              </p>
              <audio
                controls
                className="w-full rounded-xl"
                src={question.audioSrc}
                preload="metadata"
              >
                Your browser does not support audio playback.
              </audio>
              <p className="mt-1.5 text-[10px] text-amber-500 font-medium">
                💡 This clip contains the audio for this question group. You may listen as many times as needed.
              </p>
            </div>
          )}

          {/* Question text */}
          <div className={`bg-white rounded-2xl p-5 mb-5 shadow-sm ${isTheory ? "border-2 border-violet-200" : "border-2 border-gray-200"}`}>
            {isTheory && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 border border-violet-200 text-[10px] font-black px-2.5 py-1 rounded-full">
                  {(question?.marks ?? 1)} {(question?.marks ?? 1) !== 1 ? "marks" : "mark"}
                </span>
                {question?.sourcePaper && (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    {question.sourcePaper}
                  </span>
                )}
              </div>
            )}
            {!isTheory && question?.marks && question.marks > 1 && (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                [{question.marks} marks]
              </p>
            )}
            {(() => {
              const fullText = stripResourceNotes(question?.text) ?? "";
              const COLLAPSE_THRESHOLD = 300; // chars
              const isLong = fullText.length > COLLAPSE_THRESHOLD;
              const displayText = isLong && !questionExpanded
                ? fullText.slice(0, COLLAPSE_THRESHOLD) + "…"
                : fullText;
              return (
                <>
                  <p className="text-base font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {displayText}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setQuestionExpanded(e => !e)}
                      className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-800 underline underline-offset-2"
                    >
                      {questionExpanded ? "Show less ▲" : "Show full question ▼"}
                    </button>
                  )}
                </>
              );
            })()}
            <QuestionResources question={question} className="mt-3" />
          </div>

          {/* â"€â"€ Hint history (for this question) â"€â"€ */}
          {hintsForThisQ.length > 0 && phase === "question" && (
            <div className="mb-4 space-y-2">
              {hintsForThisQ.map((hint, hi) => {
                const hl = HINT_LEVELS[hi] ?? HINT_LEVELS[3];
                const cleanHint = hint
                  .replace(/Attempt\s+\d+\s+of\s+\d+\s+free\s+hints\.?/i, "")
                  .replace(/^Hint:\s*/i, "")
                  .trim();
                return (
                  <div key={hi} className={`rounded-2xl border overflow-hidden ${hl.border} ${hl.bg}`}>
                    <div className={`flex items-center gap-2 px-3 py-2 ${hl.header}`}>
                      <span>{hl.emoji}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                        Hint {hi + 1}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hl.badge}`}>
                        {hl.label}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {Array.from({ length: MAX_HINTS }).map((_, di) => (
                          <div key={di} className={`w-2 h-2 rounded-full ${di <= hi ? hl.dot : "bg-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className={`text-sm font-semibold leading-relaxed ${hl.text}`}>{cleanHint}</p>
                      {hi === MAX_HINTS - 1 && (
                        <p className="text-[11px] font-black text-red-600 mt-2 flex items-center gap-1">
                          All hints used — type your best answer!
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* â"€â"€ MCQ options â"€â"€ */}
          {!isTheory && question?.options && (
            <div className="space-y-3">
              {question.options.map((opt, idx) => {
                const letter = OPTION_LETTERS[idx];
                const isSelected = selected === opt;
                const isCorrectOpt = opt === correctOptText;
                return (
                  <button
                    key={idx}
                    onClick={() => phase === "question" && setSelected(opt)}
                    disabled={phase === "feedback"}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${optionClass(opt)}`}
                  >
                    <span className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-black shrink-0 transition-all ${phase === "question" && isSelected
                        ? "bg-blue-500 border-blue-500 text-white"
                        : phase === "feedback" && hintsExhausted && isCorrectOpt
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : phase === "feedback" && isSelected && verdict === "wrong"
                            ? "bg-red-400 border-red-400 text-white"
                            : "border-gray-300 text-gray-500"
                      }`}>
                      {phase === "feedback" && hintsExhausted && isCorrectOpt
                        ? <CheckCircle2 size={16} />
                        : phase === "feedback" && isSelected && verdict === "wrong"
                          ? <XCircle size={16} />
                          : letter}
                    </span>
                    <span className="font-semibold text-sm text-gray-900 leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* â"€â"€ Theory textarea â"€â"€ */}
          {isTheory && (
            <div className="space-y-3">
              {imageOnlyMode ? (
                /* Hindi: image upload is primary answer — no textarea */
                phase === "question" && (
                  <label className={`block rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-colors ${
                    ocrLoading ? "border-orange-300 bg-orange-50"
                    : ocrStatus[qIdx] === "ok" ? "border-emerald-400 bg-emerald-50"
                    : "border-orange-300 bg-white hover:border-orange-500"
                  }`}>
                    <p className="text-[11px] font-black text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      ✍️ {ocrLoading ? "Reading your handwriting with AI..." : "Write your answer on paper and upload a photo"}
                    </p>
                    <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" disabled={ocrLoading} />
                    <span className={`text-sm font-bold flex items-center gap-2 ${
                      String(ocrStatus[qIdx]).startsWith("failed") ? "text-red-500"
                      : ocrStatus[qIdx] === "ok" ? "text-emerald-600"
                      : "text-orange-500"
                    }`}>
                      {ocrLoading
                        ? <><Loader2 size={13} className="animate-spin" /> AI is reading your handwriting...</>
                        : ocrStatus[qIdx] === "ok"
                          ? <>✅ Photo uploaded — AI has read your answer</>
                          : String(ocrStatus[qIdx]) === "failed:RATE_LIMIT"
                            ? "AI busy — wait 1 minute and try again"
                            : String(ocrStatus[qIdx]).startsWith("failed:")
                              ? "Could not read image — try again with better lighting"
                              : <>📷 Tap to take a photo or upload from gallery</>}
                    </span>
                    {ocrStatus[qIdx] === "ok" && textAns && (
                      <p className="mt-2 text-xs text-gray-500 italic line-clamp-2">&ldquo;{textAns.slice(0, 120)}&rdquo;</p>
                    )}
                  </label>
                )
              ) : (
                /* Normal mode — textarea + optional handwritten upload */
                <>
                  <textarea
                    value={textAns}
                    onChange={e => phase === "question" && setTextAns(e.target.value)}
                    disabled={phase === "feedback"}
                    placeholder={`Write your answer here. Aim for ${question?.marks ?? 1} ${(question?.marks ?? 1) !== 1 ? "marks" : "mark"}. Use key terms.`}
                    rows={5}
                    className="w-full border-2 border-violet-200 bg-white text-gray-900 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-violet-400 resize-none placeholder-gray-400 disabled:opacity-60 transition-colors"
                  />
                  {phase === "question" && (
                    <label className={`block rounded-2xl border-2 border-dashed p-3 bg-white cursor-pointer transition-colors ${ocrLoading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                        {ocrLoading ? "Transcribing..." : "Upload Handwritten (Optional)"}
                      </p>
                      <input type="file" accept="image/*,.pdf" multiple onChange={handleUpload} className="hidden" disabled={ocrLoading} />
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${String(ocrStatus[qIdx]).startsWith("failed") ? "text-red-500" : "text-blue-500"}`}>
                        {ocrLoading
                          ? <><Loader2 size={12} className="animate-spin" /> Reading your handwriting with AI...</>
                          : ocrStatus[qIdx] === "ok"
                            ? `${uploads[qIdx]?.length ?? 1} file(s) attached — text added to answer box`
                            : String(ocrStatus[qIdx]) === "failed:RATE_LIMIT"
                              ? "AI busy — wait 1 minute and try again"
                              : String(ocrStatus[qIdx]).startsWith("failed:")
                                ? "Could not read image — please type your answer manually"
                                : ocrStatus[qIdx] === "failed"
                                  ? "Could not read handwriting — please type your answer manually"
                                  : "Tap to attach photo — AI will read it for you"}
                      </span>
                    </label>
                  )}
                </>
              )}

              {/* Show mark scheme on feedback (both correct and wrong) */}
              {phase === "feedback" && question.markingSchemeAnswer && (
                <div className={`border rounded-2xl p-4 ${verdict === "correct" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={12} className={verdict === "correct" ? "text-emerald-600" : "text-amber-600"} />
                    <p className={`text-[10px] font-black uppercase tracking-wider ${verdict === "correct" ? "text-emerald-700" : "text-amber-700"}`}>
                      Cambridge Mark Scheme
                    </p>
                  </div>
                  <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-line">{cleanMarkSchemeForDisplay(question.markingSchemeAnswer)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* â"€â"€ CHECK button â"€â"€ */}
      {phase === "question" && (
        <div className="shrink-0 px-4 pb-8 pt-3 border-t border-gray-200 bg-white" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {wrongThisQ > 0 && wrongThisQ < MAX_HINTS && (
                <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
                  <Lightbulb size={11} /> {MAX_HINTS - wrongThisQ} hint{MAX_HINTS - wrongThisQ !== 1 ? "s" : ""} remaining
                </p>
              )}
              {hintsExhausted && (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                  <Lock size={11} /> All hints used
                </p>
              )}
              <span className="ml-auto text-xs font-black text-gray-400">
                +{Math.max(1, xpBase - currentHints * XP_HINT_PENALTY)} XP
              </span>
            </div>
            <button
              onClick={handleCheck}
              disabled={checking || (isTheory ? (imageOnlyMode ? ocrStatus[qIdx] !== "ok" : !textAns.trim()) : !selected)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-blue-900/40"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Checking...
                </span>
              ) : "CHECK ANSWER"}
            </button>
          </div>
        </div>
      )}

      {/* â"€â"€ Feedback panel â"€â"€ */}
      {phase === "feedback" && (
        <div className={`shrink-0 animate-slide-up border-t-2 ${verdict === "correct"
            ? "bg-emerald-50 border-emerald-300"
            : "bg-red-50 border-red-300"
          }`}>
          <div className="max-w-xl mx-auto px-4 py-5">
            {/* Verdict */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${verdict === "correct" ? "bg-emerald-500" : "bg-red-500"
                }`}>
                {verdict === "correct"
                  ? <CheckCircle2 size={22} className="text-white" />
                  : <XCircle size={22} className="text-white" />
                }
              </div>
              <div className="flex-1">
                <p className={`font-black text-lg ${verdict === "correct" ? "text-emerald-700" : "text-red-700"}`}>
                  {verdict === "correct" ? "Excellent! 🎉" : hintsExhausted ? "Hints Exhausted" : `Incorrect — Hint ${wrongThisQ} of ${MAX_HINTS}`}
                </p>
                {verdict === "wrong" && hintsExhausted && correctOptText && !isTheory && (
                  <p className="text-sm font-bold text-gray-600 mt-0.5">
                    Answer: <span className="text-emerald-600 font-black">{correctOptText}</span>
                  </p>
                )}
                {verdict === "correct" && feedback.text && (
                  <p className="text-sm font-medium text-emerald-700">{feedback.text}</p>
                )}
              </div>
              {verdict === "correct" && streak >= 2 && (
                <div className="ml-auto flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full border border-orange-200">
                  <Flame size={14} className="fill-orange-500" />
                  <span className="text-xs font-black">{streak}×</span>
                </div>
              )}
            </div>

            {/* Marks earned for theory answers */}
            {isTheory && verdict !== null && (
              <div className={`flex items-center gap-3 mb-3 px-4 py-3 rounded-2xl ${verdict === "correct" ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className={`text-2xl font-black ${verdict === "correct" ? "text-emerald-600" : "text-amber-600"}`}>
                  {feedback.marks}/{feedback.max}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Marks</p>
                  <p className="text-sm font-semibold text-gray-700 leading-snug">{feedback.text}</p>
                </div>
              </div>
            )}

            {/* Theory hint when wrong */}
            {isTheory && verdict === "wrong" && feedback.hint && (
              <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-100">
                  <Lightbulb size={13} className="text-amber-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Guidance</span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold leading-relaxed text-amber-900">{feedback.hint}</p>
                </div>
              </div>
            )}

            {/* Hint card for wrong MCQ (shown in feedback too) */}
            {verdict === "wrong" && lastHint && !isTheory && (() => {
              const hi = wrongThisQ - 1;
              const hl = HINT_LEVELS[Math.min(hi, 3)];
              const cleanHint = lastHint
                .replace(/Attempt\s+\d+\s+of\s+\d+\s+free\s+hints\.?/i, "")
                .replace(/^Hint:\s*/i, "")
                .trim();
              return (
                <div className={`mb-4 rounded-2xl border overflow-hidden ${hl.border} ${hl.bg}`}>
                  <div className={`flex items-center justify-between px-3 py-2 ${hl.header}`}>
                    <div className="flex items-center gap-2">
                      <span>{hl.emoji}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Hint {wrongThisQ}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hl.badge}`}>{hl.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: MAX_HINTS }).map((_, di) => (
                        <div key={di} className={`w-2 h-2 rounded-full ${di < wrongThisQ ? hl.dot : "bg-gray-300"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className={`text-sm font-semibold leading-relaxed ${hl.text}`}>{cleanHint}</p>
                  </div>
                </div>
              );
            })()}

            {/* Mark scheme concept — shown immediately on wrong MCQ (no AI needed) */}
            {verdict === "wrong" && !isTheory && hintsExhausted && question.markingSchemeAnswer && (
              <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-100">
                  <BookOpen size={12} className="text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-800">Cambridge Mark Scheme</span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium leading-relaxed text-blue-900 whitespace-pre-line">{question.markingSchemeAnswer}</p>
                </div>
              </div>
            )}

            {/* XP earned */}
            {verdict === "correct" && (
              <div className="flex items-center gap-1.5 mb-4 pl-1">
                <Zap size={14} className="text-yellow-500 fill-yellow-400" />
                <span className="text-sm font-black text-yellow-600">+{computeXP(true, streak - 1, shownHints[qIdx]?.length ?? 0)} XP earned</span>
                {streak >= 3 && <span className="text-xs font-black text-orange-600 ml-1">(streak bonus!)</span>}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {verdict === "wrong" && !hintsExhausted && (
                <button
                  onClick={handleTryAgain}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-gray-300 text-gray-700 font-black text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} /> Try Again
                </button>
              )}
              <button
                onClick={handleContinue}
                className={`flex-1 py-3.5 rounded-2xl font-black text-base transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 ${verdict === "correct"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : hintsExhausted
                      ? "bg-gray-600 hover:bg-gray-700 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
              >
                {verdict === "correct" ? "CONTINUE" : hintsExhausted ? "SKIP →" : "NEXT →"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

