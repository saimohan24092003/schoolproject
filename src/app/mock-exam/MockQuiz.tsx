"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";
import { toast } from "sonner";
import { submitMockExam, gradeTheoryMockSubmission } from "@/server/actions/smart-practice";
import { QuestionResources, stripResourceNotes } from "@/components/QuestionResources";

interface Props {
  initialQuestions: any[];
  timeLimit: number;
  title: string;
  subject: string;
  questionType: "MCQ" | "THEORY";
}

const MockQuiz = ({ initialQuestions, timeLimit, title, subject, questionType }: Props) => {
  const router = useRouter();
  const { width, height } = useWindowSize();
  const isTheory = questionType === "THEORY";
  const subjectCode = subject.match(/\b\d{4}\b/)?.[0];

  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [handwrittenByQuestion, setHandwrittenByQuestion] = useState<Record<number, File[]>>({});
  const [theoryGrade, setTheoryGrade] = useState<{ percentage: number; grade: string; feedback: Array<{ questionIndex: number; feedback: string; hint: string; awardedMarks: number; maxMarks: number }> } | null>(null);
  const [mockInsights, setMockInsights] = useState<{
    grade: string;
    percentage: number;
    predictedPercentage: number;
    predictedGrade: string;
    focusTopics: Array<{ topic: string; scorePercent: number; reason: string }>;
    feedbackSummary: string;
  } | null>(null);

  const buildMockHref = useCallback((withRun = false) => {
    const params = new URLSearchParams();
    if (subjectCode) params.set("subject", subjectCode);
    if (withRun) params.set("run", String(Date.now()));
    const query = params.toString();
    return query ? `/mock-exam?${query}` : "/mock-exam";
  }, [subjectCode]);

  const progressHref = subjectCode ? `/progress?subject=${subjectCode}` : "/progress";

  const handleHandwrittenFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const merged = [...(handwrittenByQuestion[activeIndex] || []), ...selected];
    const deduped = merged.filter(
      (file, index, arr) =>
        arr.findIndex((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified) === index
    );
    setHandwrittenByQuestion((prev) => ({ ...prev, [activeIndex]: deduped }));
  };

  const calculateScore = useCallback(() => {
    if (isTheory) {
      const typedCount = Object.keys(answers).length;
      const handwrittenCount = Object.keys(handwrittenByQuestion).length;
      const attempted = handwrittenCount > 0 ? Math.max(typedCount, handwrittenCount) : typedCount;
      return { score: attempted, total: initialQuestions.length };
    }
    let correct = 0;
    initialQuestions.forEach((q, i) => {
      const userAns = answers[i]?.split(":")[0].trim();
      if (userAns === q.correctAnswer) correct++;
    });
    return { score: correct, total: initialQuestions.length };
  }, [answers, handwrittenByQuestion, initialQuestions, isTheory]);

  const onSubmit = useCallback(async () => {
    if (isPending || isSubmitted) return;
    setIsPending(true);
    const loadingToast = toast.loading("Analyzing your performance...");
    try {
      let uploadedCount = 0;
      const allHandwritten = Object.values(handwrittenByQuestion).flat();
      if (isTheory && allHandwritten.length > 0) {
        const formData = new FormData();
        allHandwritten.forEach((file) => formData.append("files", file));
        const uploadRes = await fetch("/api/mock-handwritten", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const body = await uploadRes.json();
          uploadedCount = Array.isArray(body.uploaded) ? body.uploaded.length : 0;
        } else {
          toast.error("Could not upload handwritten files, but exam will still submit.");
        }
      }

      const baseline = calculateScore();
      let submitScore = baseline.score;
      let submitTotal = baseline.total;
      let theoryFeedback: Array<{
        questionIndex: number;
        feedback: string;
        hint: string;
        awardedMarks: number;
        maxMarks: number;
      }> = [];

      if (isTheory) {
        const mergedAnswers: Record<number, string> = { ...answers };
        const ocrForm = new FormData();
        Object.entries(handwrittenByQuestion).forEach(([idx, files]) => {
          files.forEach((file) => ocrForm.append(`q_${idx}`, file));
        });
        if (Array.from(ocrForm.keys()).length > 0) {
          const ocrRes = await fetch("/api/handwritten-ocr", { method: "POST", body: ocrForm });
          if (ocrRes.ok) {
            const payload = await ocrRes.json();
            const extracted = (payload?.extracted || {}) as Record<string, string>;
            Object.entries(extracted).forEach(([key, text]) => {
              const idx = Number(key.replace("q_", ""));
              if (!mergedAnswers[idx]?.trim() && text?.trim()) {
                mergedAnswers[idx] = text.trim();
              }
            });
          }
        }

        const graded = await gradeTheoryMockSubmission(initialQuestions, mergedAnswers);
        theoryFeedback = graded.feedback;
        setTheoryGrade({
          percentage: graded.percentage,
          grade: graded.grade,
          feedback: graded.feedback,
        });
        submitScore = graded.awarded;
        submitTotal = graded.available;
      }

      const topicStatsMap = new Map<
        string,
        { topic: string; correct: number; total: number; awardedMarks: number; maxMarks: number }
      >();

      initialQuestions.forEach((question: any, index: number) => {
        const topic = question.topic || "General";
        const current = topicStatsMap.get(topic) || {
          topic,
          correct: 0,
          total: 0,
          awardedMarks: 0,
          maxMarks: 0,
        };

        if (isTheory) {
          const graded = theoryFeedback.find((f) => f.questionIndex === index);
          const awarded = graded?.awardedMarks || 0;
          const max = graded?.maxMarks || Math.max(1, Number(question.marks || 1));
          current.awardedMarks += awarded;
          current.maxMarks += max;
          current.correct += awarded >= Math.ceil(max * 0.6) ? 1 : 0;
          current.total += 1;
        } else {
          const userAns = answers[index]?.split(":")[0]?.trim();
          const isCorrect = userAns === question.correctAnswer;
          current.correct += isCorrect ? 1 : 0;
          current.total += 1;
          current.awardedMarks += isCorrect ? 1 : 0;
          current.maxMarks += 1;
        }

        topicStatsMap.set(topic, current);
      });

      const insights = await submitMockExam(
        submitScore,
        submitTotal,
        subject,
        Array.from(topicStatsMap.values())
      );
      setMockInsights(insights);
      setIsSubmitted(true);
      setShowSummary(true);
      toast.success(
        uploadedCount > 0
          ? `Exam recorded. Uploaded ${uploadedCount} handwritten file(s).`
          : "Exam results recorded!",
        { id: loadingToast }
      );
    } catch {
      toast.error("Failed to save results.", { id: loadingToast });
    } finally {
      setIsPending(false);
    }
  }, [answers, calculateScore, handwrittenByQuestion, initialQuestions, isPending, isSubmitted, isTheory, subject]);

  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitted && !isPending) onSubmit();
  }, [timeLeft, isSubmitted, isPending, onSubmit]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const currentQuestion = initialQuestions[activeIndex];
  const promptText = stripResourceNotes(currentQuestion?.question);
  const { score, total } = calculateScore();
  const percentage = Math.round((score / total) * 100);
  const completionPct = Math.round(((activeIndex + 1) / initialQuestions.length) * 100);
  const attemptedCount = new Set([
    ...Object.keys(answers).map((key) => Number(key)),
    ...Object.keys(handwrittenByQuestion).map((key) => Number(key)),
  ]).size;

  const getGrade = (p: number) => {
    if (p >= 90) return "A*";
    if (p >= 80) return "A";
    if (p >= 70) return "B";
    if (p >= 60) return "C";
    if (p >= 50) return "D";
    if (p >= 40) return "E";
    return "U";
  };

  if (showSummary) {
    const grade = mockInsights?.grade || (isTheory ? (theoryGrade?.grade || getGrade(percentage)) : getGrade(percentage));
    const displayPercentage = mockInsights?.percentage ?? (isTheory ? (theoryGrade?.percentage ?? percentage) : percentage);
    const predictedGrade = mockInsights?.predictedGrade || grade;
    const predictedPercentage = mockInsights?.predictedPercentage ?? displayPercentage;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-blue-50 flex flex-col items-center justify-center p-6 text-center">
        {percentage >= 80 && <ReactConfetti width={width} height={height} recycle={false} />}
        <div className="max-w-3xl w-full bg-white rounded-[2.2rem] border border-slate-200 shadow-xl p-8 md:p-10 space-y-6 text-left">
          <div className="inline-flex items-center px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest">
            Mock Exam Results
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">Session Complete</h1>
            <p className="text-slate-500 font-medium">{subject}</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 rounded-3xl p-8 text-white">
              <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest mb-1">
                {isTheory ? "Attempted" : "Final Grade"}
              </p>
              <p className={cn("text-7xl font-black",
                grade === "A*" ? "text-emerald-300" : grade === "A" ? "text-blue-300" : "text-amber-300"
              )}>
                {grade}
              </p>
            </div>
            <div className="bg-blue-50 rounded-3xl p-8 border-2 border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                {isTheory ? "Completion" : "Accuracy"}
              </p>
              <p className="text-5xl font-black text-slate-900">{displayPercentage}%</p>
              <p className="text-xs font-bold text-slate-500 mt-2">
                {isTheory ? "Mark-scheme validated" : `${score} / ${total} Correct`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-2xl p-5 border-2 border-indigo-100 text-left">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Future Prediction</p>
              <p className="text-2xl font-black text-indigo-900">{predictedGrade}</p>
              <p className="text-sm font-bold text-indigo-700">Estimated next: {predictedPercentage}%</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-5 border-2 border-emerald-100 text-left">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Focus Topics</p>
              {(mockInsights?.focusTopics || []).slice(0, 3).map((topic, index) => (
                <p key={`${topic.topic}-${index}`} className="text-sm text-emerald-800 font-medium">
                  {index + 1}. {topic.topic} ({topic.scorePercent}%)
                </p>
              ))}
              {(mockInsights?.focusTopics || []).length === 0 && (
                <p className="text-sm text-emerald-700 font-medium">Maintain balanced revision across all chapters.</p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">AI Exam Coach Summary</p>
            <p className="text-sm text-slate-700 font-medium">
              {mockInsights?.feedbackSummary || "Performance summary is being prepared from your latest attempt."}
            </p>
          </div>

          {isTheory && (
            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-left space-y-2">
              <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Marking Scheme Feedback</p>
              <p className="text-sm text-gray-600">Scored using deterministic mark-scheme matching.</p>
              {Object.values(handwrittenByQuestion).flat().length > 0 && (
                <p className="text-xs font-bold text-amber-700">
                  Handwritten files attached: {Object.values(handwrittenByQuestion).flat().length}
                </p>
              )}
              <div className="max-h-60 overflow-y-auto space-y-3 pt-2">
                {(theoryGrade?.feedback || []).map((f, i) => (
                  <div key={i} className="border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500">Q{i + 1}: {f.awardedMarks}/{f.maxMarks}</p>
                    <p className="text-xs text-blue-700 mt-1"><span className="font-bold">Feedback:</span> {f.feedback}</p>
                    <p className="text-xs text-amber-700 mt-1"><span className="font-bold">Hint:</span> {f.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-black"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-black"
              onClick={() => router.push(progressHref)}
            >
              View Progress
            </Button>
            <Button
              className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 font-black"
              onClick={() => router.push(buildMockHref(true))}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Try Another Mock
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="border-b border-slate-200 px-4 py-3 sticky top-0 bg-white/90 backdrop-blur-md z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" onClick={() => router.push("/dashboard")} className="border border-slate-200 bg-white hover:bg-slate-50">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="font-black text-slate-900 uppercase tracking-tight text-sm md:text-base">IGCSE Mock Simulator</h1>
              <p className="text-[10px] font-black text-violet-600 uppercase tracking-[0.12em] truncate max-w-[160px] md:max-w-[360px]">{title}</p>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all",
            timeLeft < 300 ? "border-rose-200 bg-rose-50 text-rose-600 animate-pulse" : "border-slate-200 bg-slate-100 text-slate-600"
          )}>
            <Clock className="w-4 h-4" />
            <span className="font-black text-base tabular-nums">{formatTime(timeLeft)}</span>
          </div>
          <Button onClick={onSubmit} disabled={isPending} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl px-4">
            {isPending ? "Submitting..." : "Submit Paper"}
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <section className="rounded-3xl border border-white/40 bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 p-5 text-white shadow-xl shadow-slate-900/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-100">Live Mock Session</p>
                <h2 className="text-xl font-black md:text-2xl">{subject}</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-teal-100">Progress</p>
                  <p className="text-lg font-black">{completionPct}%</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-teal-100">Attempted</p>
                  <p className="text-lg font-black">{attemptedCount}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-teal-100">Remaining</p>
                  <p className="text-lg font-black">{Math.max(0, initialQuestions.length - activeIndex - 1)}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all duration-300" style={{ width: `${completionPct}%` }} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-5 flex flex-wrap gap-2">
              {initialQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "h-8 min-w-8 rounded-full px-2 text-xs font-black transition",
                    activeIndex === i
                      ? "bg-slate-900 text-white"
                      : answers[i]
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">
                  {activeIndex + 1}
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">
                  {currentQuestion.topic || "General"}
                </span>
                {isTheory && currentQuestion.marks && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
                    {currentQuestion.marks} marks
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black leading-snug text-slate-900 md:text-2xl">
                {promptText}
              </h2>

              <div className="mt-4">
                <QuestionResources question={currentQuestion} />
              </div>
            </div>

            <div className="mt-5">
              {isTheory ? (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-[0.1em]">Your Answer (Optional)</label>
                  <textarea
                    disabled={isSubmitted || isPending}
                    value={answers[activeIndex] || ""}
                    onChange={(e) => setAnswers({ ...answers, [activeIndex]: e.target.value })}
                    rows={6}
                    placeholder="Type here if you want. You can also write on paper and upload photos/PDF below."
                    className="w-full p-4 rounded-2xl border border-slate-300 focus:border-violet-400 focus:outline-none text-slate-800 font-medium resize-none"
                  />
                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.1em] mb-2">
                      Handwritten Submission (Optional)
                    </p>
                    <p className="text-xs text-slate-600 mb-3">
                      Write answers on paper, then upload clear photos or a PDF before finishing the exam.
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      multiple
                      onChange={handleHandwrittenFiles}
                      className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-violet-700"
                    />
                    {(handwrittenByQuestion[activeIndex]?.length || 0) > 0 && (
                      <p className="text-xs text-emerald-700 font-bold mt-2">
                        {handwrittenByQuestion[activeIndex].length} file(s) attached for this question.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.options.map((option: string, i: number) => {
                    const isSelected = answers[activeIndex] === option;
                    return (
                      <button
                        key={i}
                        onClick={() => !isSubmitted && !isPending && setAnswers({ ...answers, [activeIndex]: option })}
                        className={cn(
                          "flex items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all md:px-5",
                          isSelected
                            ? "border-violet-500 bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-blue-200"
                            : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/30"
                        )}
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-sm font-black border-2 shrink-0",
                          isSelected ? "bg-white/20 border-white/30 text-white" : "bg-slate-100 border-slate-200 text-slate-500"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className={cn("text-base", isSelected ? "font-bold text-white" : "font-semibold text-slate-700")}>
                          {option.replace(/^[A-D]:\s*/, "")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
              <Button
                variant="secondary"
                size="lg"
                className="font-black border border-slate-300 bg-white hover:bg-slate-50"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((prev) => prev - 1)}
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> Previous
              </Button>
              <p className="text-xs font-black text-slate-500 uppercase tracking-[0.12em]">
                Question {activeIndex + 1} of {initialQuestions.length}
              </p>
              {activeIndex === initialQuestions.length - 1 ? (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-black px-8 rounded-2xl"
                  onClick={onSubmit}
                  disabled={isPending}
                >
                  {isPending ? "Submitting..." : "Finish Exam"}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 rounded-2xl"
                  onClick={() => setActiveIndex((prev) => prev + 1)}
                >
                  Next <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MockQuiz;
