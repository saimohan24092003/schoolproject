import { redirect } from "next/navigation";

import {
  getCourseProgress,
  getLessonPercentage,
  getUnits,
  getUserProgress,
  getUserSubscription
} from "@/server/db/queries";

import Header from "./header";
import Unit from "./unit";
import StickyWrapper from "@/components/StickyWrapper";
import FeedWrapper from "@/components/FeedWrapper";
import UserProgress from "@/components/UserProgress";
import Quests from "@/components/Quests";
import Promo from "@/components/Promo";

const LearnPage = async () => {
  const userProgressData = getUserProgress();
  const courseProgressData = getCourseProgress();
  const lessonPercentageData = getLessonPercentage();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();

  const [
    userProgress,
    courseProgress,
    lessonPercentage,
    units,
    userSubscription,
  ] = await Promise.all([
    userProgressData,
    courseProgressData,
    lessonPercentageData,
    unitsData,
    userSubscriptionData,
  ]);

  if (!userProgress || !userProgress.activeCourseId || !userProgress.activeCourse) {
    redirect("/dashboard");
  }

  if (!courseProgress) {
    redirect("/dashboard");
  }

  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          points={userProgress.points}
        />
      </StickyWrapper>

      <FeedWrapper>
        <Header title={userProgress.activeCourse.title} />
        {units.map((unit) => (
          <div key={unit.id} className="mb-10">
            <Unit
              id={unit.id}
              description={unit.description}
              title={unit.title}
              lessons={unit.lessons}
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};

export default LearnPage;
