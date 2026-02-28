import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getExamPaperById } from "@/server/db/queries";
import ExamSession from "./exam-session";
import { hasResourceReference, resolveQuestionImageSrc } from "@/lib/resource-fallback";

interface ExamPageProps {
  params: Promise<{ examId: string }>;
}

const ExamPage = async ({ params }: ExamPageProps) => {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const { examId } = await params;
  const examPaper = await getExamPaperById(parseInt(examId));

  if (!examPaper) {
    redirect("/exams");
  }

  // Auto-link diagram/table references to available resources where explicit imageSrc is missing.
  let hydratedPaper = examPaper;
  try {
    const content = JSON.parse(examPaper.content || "{}");
    const questions = Array.isArray(content.questions)
      ? content.questions
      : Array.isArray(content.data)
        ? content.data
        : [];

    if (Array.isArray(questions) && questions.length > 0) {
      const patched = questions
        .map((q: any) => {
        const questionText = String(q?.text || q?.question || "").trim();
        if (!questionText) return null;
        const resolved = resolveQuestionImageSrc(q?.imageSrc || null, questionText, {
          subject: (examPaper as any).subject,
          year: (examPaper as any).year,
          season: (examPaper as any).season,
          paperNumber: (examPaper as any).paperNumber,
          variant: (examPaper as any).variant,
        });
        if (hasResourceReference(questionText) && !resolved) {
          return null;
        }
        return { ...q, imageSrc: resolved ?? null };
      })
        .filter(Boolean);

      hydratedPaper = {
        ...examPaper,
        content: JSON.stringify({
          ...content,
          questions: Array.isArray(content.questions) ? patched : content.questions,
          data: Array.isArray(content.data) ? patched : content.data,
        }),
      } as typeof examPaper;
    }
  } catch {
    // Keep original paper payload if content is malformed.
  }

  return (
    <ExamSession 
      examPaper={hydratedPaper} 
      userId={user.id}
    />
  );
};

export default ExamPage;
