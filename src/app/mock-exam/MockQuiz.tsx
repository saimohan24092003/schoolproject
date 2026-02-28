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
  }, [activeIndex, answers, calculateScore, handwrittenByQuestion, initialQuestions, isPending, isSubmitted, isTheory, subject]);

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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        {percentage >= 80 && <ReactConfetti width={width} height={height} recycle={false} />}
        <div className="max-w-2xl w-full bg-white rounded-[3rem] border-4 border-white shadow-2xl p-12 space-y-8">
          <div className="inline-flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest">
            Mock Exam Results
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900">Great Effort!</h1>
            <p className="text-gray-500 font-medium">{subject}</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-3xl p-8 text-white">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {isTheory ? "Attempted" : "Final Grade"}
              </p>
              <p className={cn("text-7xl font-black",
                grade === "A*" ? "text-purple-400" : grade === "A" ? "text-blue-400" : "text-orange-400"
              )}>
                {grade}
              </p>
            </div>
            <div className="bg-blue-50 rounded-3xl p-8 border-2 border-blue-100">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                {isTheory ? "Completion" : "Accuracy"}
              </p>
              <p className="text-5xl font-black text-gray-900">{displayPercentage}%</p>
              <p className="text-xs font-bold text-gray-400 mt-2">
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
          <div className="space-y-4">
            <Button size="lg" className="w-full h-16 rounded-2xl font-black text-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" className="w-full font-bold text-white" onClick={() => window.location.reload()}>
              <RotateCcw className="w-4 h-4 mr-2" /> Try Another Random Mock
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b-2 border-gray-100 px-6 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="hidden md:block">
              <h1 className="font-black text-gray-900 uppercase tracking-tighter">IGCSE Mock Simulator</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{title}</p>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-3 px-6 py-2 rounded-2xl border-2 transition-all",
            timeLeft < 300 ? "border-rose-200 bg-rose-50 text-rose-600 animate-pulse" : "border-gray-100 bg-gray-50 text-gray-600"
          )}>
            <Clock className="w-5 h-5" />
            <span className="font-black text-xl tabular-nums">{formatTime(timeLeft)}</span>
          </div>
          <Button onClick={onSubmit} disabled={isPending} className="bg-gray-900 hover:bg-black text-white font-black rounded-xl px-6">
            {isPending ? "Submitting..." : "Submit Paper"}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-12 px-6">
        <div className="max-w-3xl w-full space-y-10">
          {/* Progress dots */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {initialQuestions.map((_, i) => (
              <button key={i} onClick={() => setActiveIndex(i)} className={cn(
                "w-3 h-3 rounded-full transition-all border",
                activeIndex === i ? "bg-blue-600 border-blue-600 scale-125" :
                answers[i] ? "bg-green-400 border-green-400" : "bg-gray-100 border-gray-200"
              )} />
            ))}
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  {activeIndex + 1}
                </span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">
                  {currentQuestion.topic || "General"}
                </span>
                {isTheory && currentQuestion.marks && (
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg">
                    [{currentQuestion.marks} marks]
                  </span>
                )}
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-neutral-800 leading-snug">
                {promptText}
              </h2>
            </div>

            <QuestionResources question={currentQuestion} />

            {isTheory ? (
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Your Answer (Optional)</label>
                <textarea
                  disabled={isSubmitted || isPending}
                  value={answers[activeIndex] || ""}
                  onChange={(e) => setAnswers({ ...answers, [activeIndex]: e.target.value })}
                  rows={6}
                  placeholder="Type here if you want. You can also write on paper and upload photos/PDF below."
                  className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-blue-300 focus:outline-none text-gray-800 font-medium resize-none"
                />
                <div className="rounded-2xl border-2 border-gray-100 p-4 bg-gray-50">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Handwritten Submission (Optional)
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Write answers on paper, then upload clear photos or a PDF before finishing the exam.
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    multiple
                    onChange={handleHandwrittenFiles}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700"
                  />
                  {(handwrittenByQuestion[activeIndex]?.length || 0) > 0 && (
                    <p className="text-xs text-green-700 font-bold mt-2">
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
                    <button key={i} onClick={() => !isSubmitted && !isPending && setAnswers({ ...answers, [activeIndex]: option })}
                      className={cn(
                        "flex items-center gap-4 p-6 rounded-3xl border-2 text-start transition-all",
                        isSelected ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200" : "bg-white border-gray-100 hover:border-blue-200 text-gray-700"
                      )}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2",
                        isSelected ? "bg-white/20 border-white/20 text-white" : "bg-gray-50 border-gray-100 text-gray-400"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className={cn("text-lg", isSelected ? "font-bold text-white" : "font-medium text-neutral-700")}>
                        {option.replace(/^[A-D]:\s*/, "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-10 border-t border-gray-100">
            <Button variant="secondary" size="lg" className="font-black" disabled={activeIndex === 0} onClick={() => setActiveIndex(prev => prev - 1)}>
              <ArrowLeft className="w-5 h-5 mr-2" /> Previous
            </Button>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Question {activeIndex + 1} of {initialQuestions.length}
            </p>
            {activeIndex === initialQuestions.length - 1 ? (
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 rounded-2xl shadow-lg" onClick={onSubmit} disabled={isPending}>
                {isPending ? "Submitting..." : "Finish Exam"}
              </Button>
            ) : (
              <Button size="lg" className="bg-gray-900 hover:bg-black text-white font-black px-10 rounded-2xl" onClick={() => setActiveIndex(prev => prev + 1)}>
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MockQuiz;
