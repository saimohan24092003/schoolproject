import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getLesson,
  getUserProgress,
  getUserSubscription
} from "@/server/db/queries";
import { Button } from "@/components/ui";
import Quiz from "../quiz";

interface LessonIdPageProps {
  params: {
    lessonId: string;
  };
  searchParams: {
    mode?: string;
  };
}

const LessonIdPage = async ({ params, searchParams }: LessonIdPageProps) => {
  const lessonData = getLesson(Number(params.lessonId));
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();

  const [lesson, userProgress, userSubscription] = await Promise.all([
    lessonData,
    userProgressData,
    userSubscriptionData,
  ]);

  if (!lesson || !userProgress) {
    redirect("/learn");
  }

  // If mode is 'practice', show the quiz interface
  if (searchParams.mode === "practice") {
    const initialPercentage =
      (lesson.challenges.filter((challenge) => challenge.completed).length /
        lesson.challenges.length) *
      100;

    return (
      <Quiz
        initialLessonId={lesson.id}
        initialLessonChallenges={lesson.challenges}
        initialPercentage={initialPercentage}
        userSubscription={userSubscription}
        lesson={lesson}
      />
    );
  }

  // DEFAULT: Show Learning Phase
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-3xl border-2 border-gray-100 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-white">
          <Link href="/dashboard" className="text-blue-200 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black mt-4">{lesson.title}</h1>
          <p className="text-blue-100 font-medium">Syllabus Overview & Key Concepts</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              What you need to cover:
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {/* Placeholder dynamic content logic */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-4 items-start">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="font-bold text-gray-800">Core Objectives</p>
                  <p className="text-sm text-gray-500">Master the fundamental definitions and terminology specific to {lesson.title}.</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-4 items-start">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-bold text-gray-800">Visual Identification</p>
                  <p className="text-sm text-gray-500">Learn to identify diagrams, structures, and graph patterns frequently asked in MCQs.</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-4 items-start">
                <span className="text-2xl">🧪</span>
                <div>
                  <p className="font-bold text-gray-800">Practical Applications</p>
                  <p className="text-sm text-gray-500">Understand how these concepts apply to real-world experiments and observations.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LessonIdPage;
