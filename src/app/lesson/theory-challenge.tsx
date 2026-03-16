"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui";

type TheoryChallengeProps = {
  question: string;
  markingSchemeAnswer: string | null;
  onCheck: (answer: string) => void;
  disabled?: boolean;
  status: "correct" | "wrong" | "none";
  feedback?: string;
  hint?: string;
  awardedMarks?: number;
  maxMarks?: number;
};

const TheoryChallenge = ({
  question: _question,
  markingSchemeAnswer,
  onCheck,
  disabled,
  status,
  feedback,
  hint,
  awardedMarks,
  maxMarks,
}: TheoryChallengeProps) => {
  const [value, setValue] = useState("");
  const [showReference, setShowReference] = useState(false);

  useEffect(() => {
    if (status === "none") {
      setShowReference(false);
    }
  }, [status]);

  return (
    <div className="flex flex-col gap-y-6 w-full max-w-[800px] mx-auto">
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Answer</h2>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your answer here based on the marking scheme requirements..."
          className="w-full min-h-[150px] p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 resize-none text-gray-700 transition-all outline-none"
          disabled={disabled || status === "correct"}
        />
      </div>

      {status === "none" && (
        <Button
          onClick={() => onCheck(value.trim())}
          disabled={!value.trim() || disabled}
          size="lg"
          className="w-full h-14 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
        >
          Check with Marking Scheme
        </Button>
      )}

      {status !== "none" && (
        <div
          className={`border-2 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            status === "correct"
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                status === "correct"
                  ? "bg-green-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {status === "correct" ? "Excellent" : "Needs Improvement"}
            </span>
            {typeof awardedMarks === "number" && typeof maxMarks === "number" && (
              <span className="text-sm font-bold text-gray-700">
                {awardedMarks}/{maxMarks} marks
              </span>
            )}
          </div>

          <p className="text-base font-semibold text-gray-800">
            {feedback ||
              (status === "correct"
                ? "Strong response. You covered the required marking points."
                : "Review the key terms and expand your reasoning.")}
          </p>

          {status === "wrong" && hint && (
            <p className="mt-3 text-sm text-amber-800">
              Hint: <span className="font-semibold">{hint}</span>
            </p>
          )}

          {(status === "correct" || showReference) && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                Official Marking Scheme
              </p>
              <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                {markingSchemeAnswer || "No specific marking scheme available for this question."}
              </p>
            </div>
          )}

          {status === "wrong" && !showReference && !!markingSchemeAnswer && (
            <button
              type="button"
              onClick={() => setShowReference(true)}
              className="mt-4 text-sm font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
            >
              Show reference answer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TheoryChallenge;
