import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getUserProgress, getCourses } from "@/server/db/queries";
import { generateMockExam } from "@/server/actions/smart-practice";
import MockQuiz from "./MockQuiz";

const MockExamPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userProgress = await getUserProgress();
  const allCourses = await getCourses();
  const activeCourse = allCourses.find(c => c.id === userProgress?.activeCourseId);
  const subject = activeCourse?.title || "Combined Science (0653)";

  const mockExam = await generateMockExam(subject);

  if (!mockExam || mockExam.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Failed to generate mock exam</h1>
        <p className="text-gray-500 mb-6">We couldn't find enough questions for <strong>{subject}</strong> right now.</p>
        <a href="/dashboard" className="text-blue-600 font-bold hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  return (
    <MockQuiz
      initialQuestions={mockExam.questions}
      timeLimit={mockExam.timeLimit}
      title={mockExam.title}
      subject={subject}
      questionType={mockExam.questionType as "MCQ" | "THEORY"}
    />
  );
};

export default MockExamPage;
