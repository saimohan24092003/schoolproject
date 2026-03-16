import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { generateSmartPractice } from "@/server/actions/smart-practice";
import SmartSession from "./smart-session";
import { Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Map 4-digit codes (from URL) to full subject names stored in DB
const SUBJECT_CODE_MAP: Record<string, string> = {
  "0653": "Combined Science (0653)",
  "0680": "Environmental Management (0680)",
  "0457": "Global Perspectives (0457)",
  "0510": "English as a Second Language (0510)",
  "0500": "English First Language (0500)",
  "0549": "Hindi (0549)",
  "0580": "Mathematics (0580)",
};

interface SmartPracticePageProps {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ subject?: string; level?: string; paperType?: string; run?: string; roadmapLevel?: string }>;
}

const SmartPracticeSessionPage = async ({ params, searchParams }: SmartPracticePageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { topic } = await params;
  const { subject, level, paperType, run, roadmapLevel } = await searchParams;

  const decodedTopic = decodeURIComponent(topic);
  const currentSubject = SUBJECT_CODE_MAP[subject || ""] ?? subject ?? "Combined Science (0653)";
  const practiceLevel = level ? parseInt(level, 10) : undefined;
  const selectedPaperType =
    paperType === "P2" || paperType === "P4" ? paperType : undefined;

  const sessionData = await generateSmartPractice(
    currentSubject,
    decodedTopic,
    10,
    practiceLevel,
    selectedPaperType
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

  const roadmapLevelNum = roadmapLevel ? parseInt(roadmapLevel, 10) : undefined;

  return (
    <SmartSession
      key={`${decodedTopic}::${practiceLevel ?? 1}::${selectedPaperType ?? "ALL"}::${run ?? "0"}`}
      initialData={sessionData}
      userId={user.id}
      level={practiceLevel}
      subjectCode={subject}
      paperType={selectedPaperType}
      roadmapLevel={roadmapLevelNum}
    />
  );
};

export default SmartPracticeSessionPage;
