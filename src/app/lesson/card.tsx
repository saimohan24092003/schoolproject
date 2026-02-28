import Image from "next/image";
import { useCallback } from "react";
import { useAudio, useKey } from "react-use";

import { cn } from "@/lib/utils";
import { challenges } from "@/server/db/schema";

type CardProps = {
  text: string;
  imageSrc: string | null;
  shortcut: string;
  selected?: boolean;
  onClick: () => void;
  status?: "correct" | "wrong" | "none";
  audioSrc: string | null;
  disabled?: boolean;
  isCorrectOption?: boolean;
  type: (typeof challenges.$inferSelect)["type"];
};

const Card = ({
  text,
  imageSrc,
  shortcut,
  selected,
  onClick,
  status,
  audioSrc,
  disabled,
  isCorrectOption,
  type,
}: CardProps) => {
  const [audio, _, controls] = useAudio({ src: audioSrc ?? "" });
  const revealCorrect = status === "wrong" && !!isCorrectOption;
  const selectedCorrect = selected && status === "correct";
  const selectedWrong = selected && status === "wrong";

  // useCallback() hook returns a memoized version of `handleClick` that only changes if one of the dependencies has changed
  // memoization is essential here because `handleClick` is being used as a dependency in another hook
  const handleClick = useCallback(() => {
    if (disabled) return;

    controls.play();
    onClick();
  }, [disabled, onClick, controls]);

  // it is important for `useKey` to provide a stable reference to the callback function
  // useCallback() hook ensures that the `handleClick` reference remains stable across renders unless its dependencies change
  useKey(shortcut, handleClick, {}, [handleClick]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "h-full border-2 rounded-xl border-b-4 hover:bg-black/5 cursor-pointer active:border-b-2 p-4 lg:p-6",
        {
          "border-sky-300 bg-sky-100 hover:bg-sky-100": selected,
          "border-green-300 bg-green-100 hover:bg-green-100": selectedCorrect,
          "border-rose-300 bg-rose-100 hover:bg-rose-100": selectedWrong,
          "border-emerald-300 bg-emerald-50 hover:bg-emerald-50": revealCorrect,
          "pointer-events-none hover:bg-white": disabled,
          "w-full lg:p-3": type === "ASSIST",
        }
      )}
    >
      {audio}

      {imageSrc && (
        <div className="relative aspect-square max-h-[80px] lg:max-h-[150px] w-full mb-4">
          <Image fill src={imageSrc} alt={text} />
        </div>
      )}

      <div
        className={cn("flex items-center justify-between", {
          "flex-row-reverse": type === "ASSIST",
        })}
      >
        {type === "ASSIST" && <div />}

        <p
          className={cn("text-neutral-600 text-sm lg:text-base", {
            "text-sky-500": selected,
            "text-green-500": selectedCorrect,
            "text-rose-500": selectedWrong,
            "text-emerald-700 font-semibold": revealCorrect,
          })}
        >
          {text}
        </p>

        <div
          className={cn(
            "flex items-center justify-center rounded-lg border-2 text-neutral-400 lg:w-[30px] lg:h-[30px] w-[20px] h-[20px] lg:text-[15px] text-xs font-semibold",
            {
              "border-sky-300 text-sky-500": selected,
              "border-green-500 text-green-500": selectedCorrect,
              "border-rose-500 text-rose-500": selectedWrong,
              "border-emerald-500 text-emerald-600": revealCorrect,
            }
          )}
        >
          {shortcut}
        </div>
      </div>

      {revealCorrect && (
        <p className="mt-2 text-xs font-black uppercase tracking-wider text-emerald-700">
          Correct answer
        </p>
      )}
    </div>
  );
};

export default Card;
