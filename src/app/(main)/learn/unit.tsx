import { lessons, units } from "@/server/db/schema";
import { Check, Star, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";

import UnitBanner from "./unit-banner";

type UnitProps = {
  id: number;
  title: string;
  description: string;
  lessons: (typeof lessons.$inferSelect & {
    completed: boolean;
  })[];
};

const Unit = ({
  id,
  title,
  description,
  lessons,
}: UnitProps) => {
  return (
    <>
      <UnitBanner title={title} description={description} access={true} />

      <div className="flex flex-col gap-4 mt-6">
        {lessons.map((lesson) => {
          const isCompleted = lesson.completed;

          return (
            <div
              key={lesson.id}
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${isCompleted ? 'border-green-200 bg-green-50' : 'border-neutral-200 bg-white'
                }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-3 rounded-full ${isCompleted ? 'bg-green-100 text-green-500' : 'bg-neutral-100 text-neutral-400'
                  }`}>
                  {isCompleted ? <Check className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-neutral-700">{lesson.title}</h4>
                  <p className="text-sm text-neutral-500 line-clamp-1">{lesson.description || "Practice basic concepts and questions."}</p>
                </div>
              </div>

              <Link href={`/lesson/${lesson.id}`}>
                <Button size="lg" variant={isCompleted ? "secondary" : "primary"} className="ml-4 min-w-[120px]">
                  {isCompleted ? "Review" : "Practice"} <Play className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Unit;
