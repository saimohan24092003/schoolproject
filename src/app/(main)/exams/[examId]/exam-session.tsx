"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import {
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { createExamSession, submitExam } from "@/server/actions/exam-actions";
import { QuestionResources, stripResourceNotes } from "@/components/QuestionResources";

interface ExamPaper {
  id: number;
  year: number;
  season: string;
  paperNumber: number;
  title: string;
  content: string;
  timeLimit: number;
  totalMarks: number;
}

interface Question {
  number: number;
  text: string;
  marks: number;
  topic?: string;
  options?: string[];
  correctAnswer?: number;
}

interface ExamSessionProps {
  examPaper: ExamPaper;
  userId: string;
}

interface ProctoringEvent {
  type: string;
  timestamp: Date;
  details?: string;
}

export default function ExamSession({ examPaper }: ExamSessionProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [examType, setExamType] = useState<"MCQ" | "FREE_TEXT">("FREE_TEXT");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(examPaper.timeLimit * 60);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [result, setResult] = useState<{ 
    score: number; 
    grade: string;
    topicAnalysis?: Record<string, { correct: number; total: number }>;
  } | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(examPaper.content);
      setQuestions(parsed.questions || []);
      setExamType(parsed.type === "MCQ" ? "MCQ" : "FREE_TEXT");
    } catch {
      setQuestions([
        { number: 1, text: "Define 'elastic demand'.", marks: 2, topic: "Demand" },
        { number: 2, text: "Explain two factors that shift supply.", marks: 4, topic: "Supply" },
        { number: 3, text: "Analyse inflation impact on purchasing power.", marks: 6, topic: "Macro" },
        { number: 4, text: "Evaluate monetary policy effectiveness.", marks: 10, topic: "Macro" },
      ]);
      setExamType("FREE_TEXT");
    }
  }, [examPaper.content]);

  useEffect(() => {
    if (!isExamStarted || isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamStarted, isSubmitted]);

  useEffect(() => {
    if (!isExamStarted || isSubmitted) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const count = tabSwitchCount + 1;
        setTabSwitchCount(count);
        setProctoringEvents((prev) => [
          ...prev,
          { type: "tab_switch", timestamp: new Date(), details: `Tab switch #${count}` },
        ]);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamStarted, isSubmitted, tabSwitchCount]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const startExam = async () => {
    await startCamera();
    try {
      const session = await createExamSession(examPaper.id);
      setSessionId(session.id);
    } catch (err) {
      console.error("Failed to create exam session:", err);
    }
    setIsExamStarted(true);
  };

  const handleAnswerChange = (questionNumber: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: answer }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }

    try {
      if (sessionId !== null) {
        const res = await submitExam(sessionId, answers, proctoringEvents);
        setResult({ 
          score: res.score, 
          grade: res.grade,
          topicAnalysis: res.topicAnalysis 
        });
      }
    } catch (err) {
      console.error("Failed to submit exam:", err);
      // Still show the submitted screen even if DB save fails
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;

  if (!isExamStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{examPaper.title}</h1>
          <p className="text-gray-500 mb-6">Cambridge International A-Level Business (9609)</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Duration</p>
              <p className="text-xl font-bold">{examPaper.timeLimit} minutes</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Marks</p>
              <p className="text-xl font-bold">{examPaper.totalMarks}</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg mb-6 text-left">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <AlertTriangle size={20} />
              <span className="font-semibold">Proctoring Enabled</span>
            </div>
            <ul className="text-sm text-yellow-600 space-y-1">
              <li>• Camera must remain active</li>
              <li>• Tab switches will be recorded</li>
              <li>• Face must remain visible</li>
            </ul>
          </div>

          <Button onClick={startExam} size="lg" className="w-full">
            Start Exam
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Submitting...</h1>
          <p className="text-gray-500 mt-2">Saving your answers to the database</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
          <div className="text-center mb-6">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Exam Submitted!</h1>
            <p className="text-gray-500">Your answers have been recorded</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Questions Answered</p>
              <p className="text-2xl font-bold">{answeredCount}/{questions.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Time Used</p>
              <p className="text-2xl font-bold">{formatTime(examPaper.timeLimit * 60 - timeLeft)}</p>
            </div>
          </div>

          {result && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                <p className="text-sm text-blue-600">Score</p>
                <p className="text-2xl font-bold text-blue-800">{result.score}%</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                <p className="text-sm text-green-600">Grade</p>
                <p className="text-2xl font-bold text-green-800">{result.grade}</p>
              </div>
            </div>
          )}

          {result?.topicAnalysis && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Chapter Coverage</h3>
              <div className="space-y-3">
                {Object.entries(result.topicAnalysis).map(([topic, stats]) => {
                  const percentage = Math.round((stats.correct / stats.total) * 100);
                  return (
                    <div key={topic} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{topic}</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            percentage >= 80 ? "bg-green-500" : 
                            percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {percentage < 50 && (
                        <p className="text-xs text-red-500 italic">
                          You need to cover this chapter more!
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="primaryOutline" onClick={() => router.push("/exams")} className="flex-1">
              Back to Papers
            </Button>
            <Button onClick={() => router.push("/progress")} className="flex-1">
              View Progress
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-gray-800">{examPaper.title}</h1>
          <span className="text-sm text-gray-500">Question {currentQuestion + 1} of {questions.length}</span>
        </div>

        <div className="flex items-center gap-6">
          <div className={`p-2 rounded-full ${isCameraActive ? "bg-green-100" : "bg-red-100"}`}>
            <Camera size={18} className={isCameraActive ? "text-green-600" : "text-red-600"} />
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
            <Clock size={18} />
            <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>

          <Button onClick={handleSubmit} variant="secondary">
            Submit Exam
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">
                Topic: {questions[currentQuestion]?.topic || "General"}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {questions[currentQuestion]?.marks} marks
              </span>
            </div>

            <h2 className="text-lg font-medium text-gray-800 mb-4">
              {stripResourceNotes(questions[currentQuestion]?.text)}
            </h2>

            <QuestionResources question={questions[currentQuestion]} className="mb-4" />

            {examType === "MCQ" ? (
              <div className="space-y-3">
                {questions[currentQuestion]?.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerChange(questions[currentQuestion].number, option)}
                    className={`w-full p-4 text-left border rounded-xl transition-all ${
                      answers[questions[currentQuestion].number] === option
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm ${
                        answers[questions[currentQuestion].number] === option
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-gray-300 text-gray-500"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className={answers[questions[currentQuestion].number] === option ? "font-medium text-blue-900" : "text-gray-700"}>
                        {option}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full h-64 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your answer here..."
                value={answers[questions[currentQuestion]?.number] || ""}
                onChange={(e) => handleAnswerChange(questions[currentQuestion]?.number, e.target.value)}
              />
            )}

            <div className="flex items-center justify-between mt-4">
              <Button
                variant="primaryOutline"
                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft size={18} className="mr-1" /> Previous
              </Button>

              {currentQuestion < questions.length - 1 ? (
                <Button onClick={() => setCurrentQuestion((prev) => prev + 1)}>
                  Next <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  Submit Exam
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="w-72 bg-white border-l p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-4">Questions</h3>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {questions.map((q, idx) => (
              <button
                key={q.number}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-10 h-10 rounded-lg font-medium text-sm ${
                  idx === currentQuestion
                    ? "bg-blue-600 text-white"
                    : answers[q.number]
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {q.number}
              </button>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-600">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-gray-600">Answered ({answeredCount})</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-gray-700 mb-2">Proctoring</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tab switches</span>
                <span className={`${tabSwitchCount > 0 ? "text-red-600 font-medium" : "text-gray-700"}`}>
                  {tabSwitchCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
    </div>
  );
}
