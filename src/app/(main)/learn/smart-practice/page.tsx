import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSmartPracticeTopicCatalog } from "@/server/actions/smart-practice";
import { getUserProgress, getCourses } from "@/server/db/queries";
import TopicsBrowser from "./topics-browser";

interface Props {
  searchParams: {
    subject?: string;
  };
}

const SmartPracticePage = async ({ searchParams }: Props) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userProgress = await getUserProgress();
  const allCourses = await getCourses();
  const activeCourse = allCourses.find((c) => c.id === userProgress?.activeCourseId);
  const currentSubject = activeCourse?.title || "Combined Science (0653)";

  // Curriculum-roadmap aligned smart-practice catalog.
  const topics = await getSmartPracticeTopicCatalog(currentSubject, "O-Level");

  return (
    <div className="flex flex-col h-full max-w-[912px] px-6 pb-6 mx-auto">
      <div className="flex items-center gap-4 py-6">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-gray-900">Smart Practice: Topic Mastery ??</h1>
          <p className="text-gray-500 font-medium tracking-tight">
            Practice MCQs based on your curriculum roadmap and search topics by interest.
          </p>
        </div>
      </div>

      <TopicsBrowser subject={currentSubject} topics={topics} />
    </div>
  );
};

export default SmartPracticePage;
