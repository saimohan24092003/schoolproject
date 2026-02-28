"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { CheckCircle, ChevronLeft, ChevronRight, BrainCircuit, Sparkles } from "lucide-react";
import { submitSmartPractice, getAIExplanation, validateSmartPracticeAnswer } from "@/server/actions/smart-practice";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Loader2 } from "lucide-react";
import { QuestionResources, stripResourceNotes } from "@/components/QuestionResources";
import type { ChangeEvent } from "react";

interface Question {
  id?: number;
  challengeId?: number;
  number: number;
  text: string;
  marks: number;
  topic?: string;
  questionType?: "MCQ" | "THEORY";
  options?: string[];
  correctAnswer?: number;
  markingSchemeAnswer?: string;
  sourcePaper?: string;
}

interface SmartSessionProps {
  initialData: {
    title: string;
    topic: string;
    questions: Question[];
    sessionType?: string;
  };
  userId: string;
}

export default function SmartSession({ initialData, userId }: SmartSessionProps) {
  const router = useRouter();
  const { width, height } = useWindowSize();

  const questions = initialData.questions;
  const isTheorySession = initialData.sessionType === "THEORY" || questions.some(q => q.questionType === "THEORY");

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<number | null>(null);
  const [validated, setValidated] = useState<Record<number, { isCorrect: boolean; feedback: string; hint: string; awardedMarks: number; maxMarks: number; locked?: boolean }>>({});
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [uploads, setUploads] = useState<Record<number, File[]>>({});
  const [checkingAnswer, setCheckingAnswer] = useState(false);

  const question = questions[currentQ];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const allFiles = Object.values(uploads).flat();
    if (allFiles.length > 0) {
      const formData = new FormData();
      allFiles.forEach((file) => formData.append("files", file));
      await fetch("/api/mock-handwritten", { method: "POST", body: formData });
    }

    const totalAwarded = Object.values(validated).reduce((acc, v) => acc + v.awardedMarks, 0);
    const totalMax = questions.reduce((acc, q) => acc + Math.max(1, q.marks || 1), 0);
    const finalScore = totalMax > 0 ? Math.round((totalAwarded / totalMax) * 100) : 0;

    setScore(finalScore);
    try {
      const res = await submitSmartPractice(userId, initialData.topic, finalScore, questions.length);
      setPointsEarned(res.points);
    } catch (e) {}
    setIsSubmitted(true);
  };

  const handleValidateCurrent = async () => {
    if (checkingAnswer) return;
    setCheckingAnswer(true);
    const q = questions[currentQ];
    let userAnswer = answers[currentQ] || "";

    if (!userAnswer.trim() && (uploads[currentQ]?.length || 0) > 0) {
      const ocrForm = new FormData();
      uploads[currentQ].forEach((file) => ocrForm.append(`q_${currentQ}`, file));
      const ocrRes = await fetch("/api/handwritten-ocr", { method: "POST", body: ocrForm });
      if (ocrRes.ok) {
        const payload = await ocrRes.json();
        const extracted = payload?.extracted?.[`q_${currentQ}`] || "";
        if (String(extracted).trim()) {
          userAnswer = String(extracted).trim();
          setAnswers((prev) => ({ ...prev, [currentQ]: userAnswer }));
        }
      }
    }
    try {
      const result = await validateSmartPracticeAnswer({
        challengeId: q.challengeId || q.id,
        questionText: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        markingSchemeAnswer: q.markingSchemeAnswer,
        marks: q.marks || 1,
        userAnswer,
        clientAttempts: attempts[currentQ] || 0,
      });

      setValidated((prev) => ({
        ...prev,
        [currentQ]: {
          isCorrect: result.isCorrect,
          feedback: result.feedback,
          hint: result.hint,
          awardedMarks: result.awardedMarks,
          maxMarks: result.maxMarks,
          locked: result.locked,
        },
      }));
      setAttempts((prev) => ({ ...prev, [currentQ]: result.repetitionCount }));
    } finally {
      setCheckingAnswer(false);
    }
  };

  const handleUploadForCurrent = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploads((prev) => ({
      ...prev,
      [currentQ]: [...(prev[currentQ] || []), ...files],
    }));
  };

  const handleGetExplanation = async (idx: number) => {
    const q = questions[idx];
    setLoadingExplanation(idx);
    try {
      const exp = await getAIExplanation(
        q.text,
        q.options || [],
        q.options?.[q.correctAnswer as number] || q.markingSchemeAnswer || "",
        answers[idx] || "",
        q.topic || initialData.topic
      );
      setExplanations(prev => ({ ...prev, [idx]: exp }));
    } catch (e) {}
    setLoadingExplanation(null);
  };

  // ── Results screen ─────────────────────────────────────────────────────────
  if (isSubmitted) {
    const allAssessed = Object.keys(validated).length === questions.length;

    return (
      <div className="flex flex-col items-center bg-gray-50 min-h-screen p-6">
        {score >= 80 && allAssessed && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}

        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full">
          {/* Score header */}
          <div className="text-center mb-6">
            <BrainCircuit className="mx-auto h-12 w-12 text-blue-500 mb-3" />
            <h1 className="text-2xl font-black text-gray-800">Practice Complete!</h1>
            <p className="text-gray-500 font-medium">{initialData.topic}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-xs text-blue-600 font-black uppercase">Score</p>
              <p className="text-3xl font-black text-blue-800">{score}%</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="text-xs text-yellow-600 font-black uppercase">XP Earned</p>
              <p className="text-3xl font-black text-yellow-800">+{pointsEarned}</p>
            </div>
          </div>

          {(
            // MCQ review
            <div className="space-y-4 mb-6">
              <h3 className="font-black text-gray-700 border-b pb-2 text-sm uppercase tracking-widest flex items-center gap-2">
                Review <Sparkles className="text-blue-500" size={14} />
              </h3>
              {questions.map((q, idx) => {
                const ua = answers[idx] || "";
                const evalResult = validated[idx];
                const isCorrect = !!evalResult?.isCorrect;
                return (
                  <div key={idx} className={`p-5 rounded-xl border-2 ${isCorrect ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-black text-gray-700 text-sm">Q{idx + 1}</span>
                      <span className="text-[10px] font-bold text-gray-400">{q.sourcePaper}</span>
                    </div>
                    <p className="text-gray-800 font-medium mb-3">{q.text}</p>
                    <div className="text-sm flex flex-col gap-1">
                      <span className={`font-bold ${isCorrect ? "text-green-700" : "text-red-700"}`}>Your answer: {ua || "Skipped"}</span>
                      {evalResult && (
                        <>
                          <span className="text-blue-700 font-medium">Feedback: {evalResult.feedback}</span>
                          <span className="text-amber-700 font-medium">Hint: {evalResult.hint}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                      {validated[idx]?.locked ? (
                        <Button size="sm" className="h-7 text-xs bg-gray-900 text-white" onClick={() => router.push("/shop")}>
                          Upgrade for AI Coaching
                        </Button>
                      ) : explanations[idx] ? (
                        <div className="text-sm text-gray-700 bg-white/60 p-3 rounded-lg border border-blue-100 italic">
                          <span className="font-bold not-italic text-blue-600 flex items-center gap-1 mb-1"><Sparkles size={12} /> Gemini AI:</span>
                          {explanations[idx]}
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" className="h-7 text-xs text-blue-600 bg-transparent border-0 shadow-none gap-1"
                          onClick={() => handleGetExplanation(idx)} disabled={loadingExplanation === idx}>
                          {loadingExplanation === idx ? <><Loader2 size={12} className="animate-spin" /> Analyzing...</> : <><Sparkles size={12} /> {isCorrect ? "Explain concept" : "Why wrong?"}</>}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="primaryOutline" onClick={() => router.push("/learn/smart-practice")} className="flex-1">
              Pick Another Topic
            </Button>
            <Button onClick={() => window.location.reload()} className="flex-1">
              Practice Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active question screen ─────────────────────────────────────────────────
  const isCurrentTheory = question?.questionType === "THEORY" || (!question?.options?.length);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="bg-transparent border-0 shadow-none text-slate-500 hover:bg-slate-100"
            onClick={() => router.back()}>
            <ChevronLeft size={18} />
          </Button>
          <div>
            <h1 className="font-bold text-gray-800 text-sm">{initialData.title}</h1>
            <span className="text-xs text-gray-400">{isTheorySession ? "Short Answer" : "MCQ"} Practice</span>
          </div>
        </div>
        <span className="text-sm font-bold text-gray-500">
          {currentQ + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-5">
          <div className="flex items-center justify-between mb-5">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase">
              {question?.topic}
            </span>
            <span className="text-xs text-gray-400">{question?.sourcePaper}</span>
          </div>

          {question?.marks && (
            <div className="text-right mb-2">
              <span className="text-xs font-black text-gray-400">[{question.marks} mark{question.marks !== 1 ? "s" : ""}]</span>
            </div>
          )}

          <p className="text-lg font-medium text-gray-800 mb-6 leading-relaxed whitespace-pre-wrap">
            {stripResourceNotes(question?.text)}
          </p>

          <QuestionResources question={question} className="mb-6" />

          {/* MCQ options */}
          {!isCurrentTheory && question?.options && (
            <div className="space-y-3">
              {question.options.map((opt, idx) => (
                <button key={idx} onClick={() => setAnswers({ ...answers, [currentQ]: opt })}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    answers[currentQ] === opt
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      answers[currentQ] === opt ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 text-gray-500"
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={answers[currentQ] === opt ? "font-medium text-blue-900" : "text-gray-700"}>{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* THEORY textarea */}
          {isCurrentTheory && (
            <div className="space-y-3">
              <textarea
                value={answers[currentQ] || ""}
                onChange={e => setAnswers({ ...answers, [currentQ]: e.target.value })}
                placeholder="Write your answer here (optional if uploading handwritten response)."
                rows={6}
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-gray-800 font-medium text-sm focus:outline-none focus:border-blue-400 resize-none placeholder-gray-300"
              />
              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Upload Handwritten (Optional)</p>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={handleUploadForCurrent}
                  className="block w-full text-xs text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-1.5 file:text-[10px] file:font-bold file:text-white hover:file:bg-blue-700"
                />
                {(uploads[currentQ]?.length || 0) > 0 && (
                  <p className="text-xs text-green-700 font-bold mt-1">{uploads[currentQ].length} file(s) attached for this question.</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Button onClick={handleValidateCurrent} disabled={checkingAnswer} className="bg-blue-600 hover:bg-blue-700 text-white">
              {checkingAnswer ? "Checking..." : "Check Answer"}
            </Button>
            {validated[currentQ] && (
              <div
                className={`rounded-xl p-3 border ${
                  validated[currentQ].isCorrect
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <p className="text-sm font-bold">{validated[currentQ].feedback}</p>
                <p className="text-xs mt-1">Hint: {validated[currentQ].hint}</p>
                <p className="text-xs mt-1">Attempts: {attempts[currentQ] || 0}</p>
                {!validated[currentQ].locked && (
                  <p className="text-xs mt-1">
                    Free hints remaining: {Math.max(0, 4 - (attempts[currentQ] || 0))}
                  </p>
                )}
                {validated[currentQ].locked && (
                  <div className="mt-2">
                    <Button size="sm" className="bg-gray-900 text-white" onClick={() => router.push("/shop")}>
                      Upgrade to Unlock AI Coaching
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="secondary" className="bg-transparent border-0 shadow-none text-slate-500 hover:bg-slate-100"
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0}>
            <ChevronLeft size={18} className="mr-1" /> Previous
          </Button>

          {currentQ < questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(prev => prev + 1)}>
              Next <ChevronRight size={18} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="px-8 bg-green-600 hover:bg-green-700 text-white">
              Submit Practice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
