"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type TheoryChallengeProps = {
  question: string;
  markingSchemeAnswer: string | null;
  onCheck: (status: "correct" | "wrong") => void;
  disabled?: boolean;
  status: "correct" | "wrong" | "none";
};

const TheoryChallenge = ({
  question,
  markingSchemeAnswer,
  onCheck,
  disabled,
  status,
}: TheoryChallengeProps) => {
  const [value, setValue] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flex flex-col gap-y-6 w-full max-w-[800px] mx-auto">
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Answer</h2>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your answer here based on the marking scheme requirements..."
          className="w-full min-h-[150px] p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 resize-none text-gray-700 transition-all outline-none"
          disabled={disabled || status !== "none"}
        />
      </div>

      {status === "none" && (
        <Button
          onClick={() => {
            setShowAnswer(true);
            onCheck("correct"); // Auto-correct for demo purposes when checking
          }}
          disabled={!value || disabled}
          size="lg"
          className="w-full h-14 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
        >
          Check with Marking Scheme →
        </Button>
      )}

      {(status === "correct" || showAnswer) && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Official Marking Scheme
            </span>
          </div>
          <div className="prose prose-green max-w-none">
            <p className="text-lg font-medium text-green-900 leading-relaxed whitespace-pre-wrap">
              {markingSchemeAnswer || "No specific marking scheme available for this question."}
            </p>
          </div>
          <p className="mt-4 text-sm text-green-700 italic border-t border-green-200 pt-4">
            Compare your answer with the points above. In the real exam, each point (marked with M1, M2, etc.) usually represents 1 mark.
          </p>
        </div>
      )}
    </div>
  );
};

export default TheoryChallenge;
