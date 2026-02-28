import { cn } from "@/lib/utils";
import { challengeOptions, challenges } from "@/server/db/schema";

import Card from "./card";

type ChallengeProps = {
  options: (typeof challengeOptions.$inferSelect)[];
  onSelect: (id: number) => void;
  status: "correct" | "wrong" | "none";
  disabled?: boolean;
  selectedOption?: number;
  correctOptionId?: number;
  type: (typeof challenges.$inferSelect)["type"];
};

const Challenge = ({
  options,
  onSelect,
  status,
  disabled,
  selectedOption,
  correctOptionId,
  type,
}: ChallengeProps) => {
  return (
    <div
      className={cn("flex flex-col gap-y-3 w-full")}
    >
      {options.map((option, i) => (
        <Card
          key={option.id}
          text={option.text}
          imageSrc={option.imageSrc}
          shortcut={`${i + 1}`}
          selected={selectedOption === option.id}
          onClick={() => onSelect(option.id)}
          status={status}
          audioSrc={option.audioSrc}
          disabled={disabled}
          isCorrectOption={option.id === correctOptionId}
          type={type}
        />
      ))}
    </div>
  );
};

export default Challenge;
