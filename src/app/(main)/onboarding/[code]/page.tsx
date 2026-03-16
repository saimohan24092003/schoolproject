import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTopicSetup } from "@/server/actions/topic-progress";
import OnboardingForm from "./onboarding-form";

const SUPPORTED = ["0653", "0680", "0580", "0500"];

const parsePaperFromSearch = (
  value: string | string[] | undefined
): "P2" | "P4" | "both" | undefined => {
  const paper = Array.isArray(value) ? value[0] : value;
  if (paper === "P2" || paper === "P4" || paper === "both") return paper;
  return undefined;
};

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams?: { paper?: string | string[] };
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { code } = params;
  if (!SUPPORTED.includes(code)) redirect("/dashboard");

  const setup = await getTopicSetup(code);
  const initialCovered: string[] = setup?.coveredTopics
    ? JSON.parse(setup.coveredTopics as string)
    : [];

  return (
    <OnboardingForm
      code={code}
      initialCovered={initialCovered}
      initialPaperPref={parsePaperFromSearch(searchParams?.paper)}
    />
  );
}
