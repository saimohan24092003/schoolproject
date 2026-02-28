import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { generateSmartPractice } from "@/server/actions/smart-practice";
import SmartSession from "./smart-session";
import { Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SmartPracticePageProps {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ subject?: string }>;
}

const SmartPracticeSessionPage = async ({ params, searchParams }: SmartPracticePageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { topic } = await params;
  const { subject } = await searchParams;

  const decodedTopic = decodeURIComponent(topic);
  const currentSubject = subject || "Combined Science (0653)";

  // Generate a practice session with 10 questions from the selected subject
  const sessionData = await generateSmartPractice(
    currentSubject,
    decodedTopic,
    10
  );

  if (!sessionData.questions || sessionData.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Topic Not Found</h1>
        <p className="text-gray-500 mb-6">
          We couldn&apos;t find enough questions for &quot;{decodedTopic}&quot; in our database.
        </p>
        <Button asChild>
          <Link href="/learn/smart-practice">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Topics
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <SmartSession
      initialData={sessionData}
      userId={user.id}
    />
  );
};

export default SmartPracticeSessionPage;
