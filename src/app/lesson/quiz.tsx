"use client";

import Image from "next/image";
import { toast } from "sonner";
import ReactConfetti from "react-confetti";
import { useRouter } from "next/navigation";
import { useMount, useWindowSize } from "react-use";
import { useRef, useState, useTransition } from "react";

import Header from "./header";
import Footer from "./footer";
import Challenge from "./challenge";
import TheoryChallenge from "./theory-challenge";
import ResultCard from "./result-card";
import QuestionBubble from "./question-bubble";
import { QuestionResources } from "@/components/QuestionResources";

import {
  challengeOptions,
  challenges,
  userSubscription,
} from "@/server/db/schema";

import { usePracticeModal } from "@/store/use-practice-modal";
import { upsertChallengeProgress } from "@/server/actions/challenge-progress";
import { gradeLessonTheoryAnswer } from "@/server/actions/theory-grading";

import {
  DEFAULT_POINTS_START,
  POINTS_PER_CHALLENGE,
} from "@/constants";

import { Button } from "@/components/ui";

type QuizProps = {
  initialLessonId: number;
  initialLessonChallenges: (typeof challenges.$inferSelect & {
    completed: boolean;
    challengeOptions: (typeof challengeOptions.$inferSelect)[];
  })[];
  initialPercentage: number;
  userSubscription:
  | (typeof userSubscription.$inferSelect & {
    isActive: boolean;
  })
  | null;
  lesson: {
    id: number;
    title: string;
    description: string | null;
  };
};

type TheoryEvaluation = {
  feedback: string;
  hint: string;
  awardedMarks: number;
  maxMarks: number;
  isCorrect: boolean;
};

const Quiz = ({
  initialLessonId,
  initialLessonChallenges,
  initialPercentage,
  userSubscription,
  lesson,
}: QuizProps) => {
  const router = useRouter();
  const { width, height } = useWindowSize();
  const [pending, startTransition] = useTransition();

  const { open: openPracticeModal } = usePracticeModal();

  useMount(() => {
    if (initialPercentage === 100) {
      openPracticeModal();
    }
  });

  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const incorrectAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishAudioRef = useRef<HTMLAudioElement | null>(null);

  const [lessonId] = useState<number>(initialLessonId);

  const [percentage, setPercentage] = useState<number>(() =>
    initialPercentage === 100 ? DEFAULT_POINTS_START : initialPercentage
  );

  const [challenges] = useState(initialLessonChallenges);

  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = challenges.findIndex(
      (challenge) => !challenge.completed
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });

  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"correct" | "wrong" | "none">("none");
  const [isLearning, setIsLearning] = useState(true); // New state for Learning Phase
  const [theoryEvaluation, setTheoryEvaluation] = useState<TheoryEvaluation | null>(null);

  const currentChallenge = challenges[activeIndex];
  const options = currentChallenge?.challengeOptions ?? [];
  const correctOption = options.find((option) => option.correct);
  const selectedOptionModel = options.find((option) => option.id === selectedOption);

  const onStartPractice = () => {
    setIsLearning(false);
  };

  const onSelect = (id: number) => {
    if (status !== "none") return;

    setSelectedOption(id);
  };

  const onContinue = () => {
    if (!selectedOption && currentChallenge.type !== "THEORY") return;

    if (status === "wrong") {
      setStatus("none");
      setSelectedOption(undefined);
      setTheoryEvaluation(null);
      return;
    }

    if (status === "correct") {
      onNext();
      return;
    }

    if (!correctOption && currentChallenge.type !== "THEORY") {
      return;
    }

    if (currentChallenge.type === "THEORY") {
      // Logic for theory questions is slightly different
      // Handled inside the TheoryChallenge component
      return;
    }

    if (correctOption && correctOption.id === selectedOption) {
      startTransition(() => {
        upsertChallengeProgress(currentChallenge.id)
          .then((response: { error?: string } | void) => {
            if (response && "error" in response && response.error === "hearts") {
              // Handle hearts error if needed
              return;
            }

            correctAudioRef.current?.play();
            setStatus("correct");
            setPercentage((prev) => prev + 100 / challenges.length);

            // This is a practice, so we don't restart hearts
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      });
    } else {
      startTransition(() => {
        // Handle wrong answer progress/hearts if needed
        incorrectAudioRef.current?.play();
        setStatus("wrong");
      });
    }
  };

  const onNext = () => {
    setActiveIndex((current) => current + 1);
    setStatus("none");
    setSelectedOption(undefined);
    setTheoryEvaluation(null);
  };

  const onTheoryCheck = (answer: string) => {
    if (!answer.trim()) return;

    startTransition(() => {
      gradeLessonTheoryAnswer({
        challengeId: currentChallenge.id,
        answer,
      })
        .then((result) => {
          setTheoryEvaluation({
            feedback: result.feedback,
            hint: result.hint,
            awardedMarks: result.awardedMarks,
            maxMarks: result.maxMarks,
            isCorrect: result.isCorrect,
          })
          if (!result.isCorrect) {
            incorrectAudioRef.current?.play();
            setStatus("wrong");
            return;
          }

          upsertChallengeProgress(currentChallenge.id)
            .then((response: { error?: string } | void) => {
              if (response && "error" in response && response.error === "hearts") return;

              correctAudioRef.current?.play();
              setStatus("correct");
              setPercentage((prev) => prev + 100 / challenges.length);
            })
            .catch(() => toast.error("Something went wrong. Please try again."));
        })
        .catch(() => toast.error("Something went wrong. Please try again."));
    });
  };

  if (isLearning) {
    return (
      <>
        <Header percentage={0} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-[800px] w-full bg-white border-4 border-blue-100 rounded-3xl p-8 lg:p-12 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Learning Phase</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black text-gray-900 mb-6">
                {lesson.title || "Topic Overview"}
            </h1>
            <div className="prose lg:prose-xl text-gray-600 leading-relaxed mb-10">
                <p className="text-xl lg:text-2xl font-medium italic">
                    {lesson.description || "In this topic, you will learn the fundamental concepts required for the exam. Read carefully before starting the practice test."}
                </p>
            </div>
            <Button 
                onClick={onStartPractice}
                size="lg" 
                className="w-full h-16 rounded-2xl font-black text-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
                I Understand, Start Practice →
            </Button>
          </div>
        </div>
        <Footer 
            onCheck={onStartPractice} 
            status="none" 
            disabled={false}
        />
      </>
    );
  }

  if (!currentChallenge) {
    return (
      <>
        <audio ref={finishAudioRef} src="/finish.mp3" autoPlay />

        <ReactConfetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10000}
        />

        <div className="flex flex-col items-center justify-center h-full gap-y-4 lg:gap-y-8 max-w-lg mx-auto text-center">
          <Image
            src="/finish.svg"
            alt="Finish"
            height={100}
            width={100}
            className="hidden lg:block"
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            height={50}
            width={50}
            className="block lg:hidden"
          />

          <h1 className="text-xl lg:text-3xl font-bold text-neutral-700">
            Great job! <br /> You&apos;ve completed the practice session.
          </h1>

          <div className="flex items-center gap-x-4 w-full">
            <ResultCard
              variant="points"
              value={challenges.length * POINTS_PER_CHALLENGE}
            />
          </div>
        </div>

        <Footer
          onCheck={() => router.push("/learn")}
          status="completed"
          lessonId={lessonId}
        />
      </>
    );
  }

  const title = currentChallenge.type === "ASSIST"
    ? "Select the correct meaning"
    : currentChallenge.question;

  return (
    <>
      <audio ref={correctAudioRef} src="/correct.wav" />
      <audio ref={incorrectAudioRef} src="/incorrect.wav" />

      <Header
        percentage={percentage}
      />

      <div className="flex-1">
        <div className="flex items-center justify-center h-full py-8 lg:py-12">
          <div className="flex flex-col w-full max-w-[900px] gap-y-8 px-6 lg:px-0">
            <h1 className="text-2xl lg:text-4xl font-black text-gray-900 leading-tight">
              {currentChallenge.type === "THEORY" ? "Theory Question" : title}
            </h1>

            <div className="w-full">
              {currentChallenge.type === "ASSIST" && (
                <QuestionBubble question={currentChallenge.question} />
              )}

              {currentChallenge.type === "THEORY" && (
                <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 lg:p-8 mb-8">
                    <p className="text-xl lg:text-3xl font-bold text-gray-800 leading-relaxed italic">
                        &quot;{currentChallenge.question}&quot;
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Marks: {currentChallenge.totalMarks}</span>
                    </div>
                </div>
              )}

              <QuestionResources
                question={{ ...currentChallenge, text: currentChallenge.question }}
                className="mb-8"
              />

              {currentChallenge.type === "THEORY" ? (
                <TheoryChallenge
                    question={currentChallenge.question}
                    markingSchemeAnswer={currentChallenge.markingSchemeAnswer}
                    onCheck={onTheoryCheck}
                    disabled={pending}
                    status={status}
                    feedback={theoryEvaluation?.feedback}
                    hint={theoryEvaluation?.hint}
                    awardedMarks={theoryEvaluation?.awardedMarks}
                    maxMarks={theoryEvaluation?.maxMarks}
                />
              ) : (
                <Challenge
                  options={options}
                  onSelect={onSelect}
                  status={status}
                  disabled={pending}
                  selectedOption={selectedOption}
                  correctOptionId={correctOption?.id}
                  type={currentChallenge.type}
                />
              )}

              {currentChallenge.type !== "THEORY" && status !== "none" && (
                <div
                  className={`mt-6 rounded-2xl border-2 p-4 ${
                    status === "correct"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <p
                    className={`text-sm font-black uppercase tracking-widest mb-2 ${
                      status === "correct" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {status === "correct" ? "Correct" : "Incorrect"}
                  </p>
                  <p className="text-sm text-gray-700">
                    Your answer:{" "}
                    <span className="font-semibold">
                      {selectedOptionModel?.text || "Not selected"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Correct answer:{" "}
                    <span className="font-semibold">{correctOption?.text || "Not available"}</span>
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    Hint:{" "}
                    <span className="font-medium">
                      {currentChallenge.explanation ||
                        "Review the concept tags and mark scheme pattern for this topic."}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!(currentChallenge.type === "THEORY" && status === "none") && (
        <Footer
          onCheck={onContinue}
          status={status}
          disabled={pending || (status === "none" && currentChallenge.type !== "THEORY" && !selectedOption)}
          hint={
            currentChallenge.type === "THEORY"
              ? theoryEvaluation?.hint
              : currentChallenge.explanation || undefined
          }
          lessonId={lessonId}
        />
      )}
    </>
  );
};

export default Quiz;
