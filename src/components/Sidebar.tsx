import Link from "next/link";
import { cn } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { Separator } from "@/components/ui";
import { SidebarItem } from "@/components";
import { SidebarSubjectSelector } from "@/components/SidebarSubjectSelector";
import AccountControls from "@/components/AccountControls";
import { sidebarItems } from "@/constants";
import { getCourses, getUserProgress } from "@/server/db/queries";

type SidebarProps = {
  className?: string;
};

const Sidebar = async ({ className }: SidebarProps) => {
  const [user, courses, userProgress] = await Promise.all([
    currentUser(),
    getCourses(),
    getUserProgress(),
  ]);
  const activeCourseId = userProgress?.activeCourseId ?? null;

  // Deduplicate subjects by title for cleaner selector UI.
  // If duplicates exist, prefer the currently active course id.
  const uniqueCourses = (() => {
    const byTitle = new Map<string, (typeof courses)[number]>();
    for (const course of courses) {
      const key = course.title.trim().toLowerCase();
      const existing = byTitle.get(key);
      if (!existing) {
        byTitle.set(key, course);
        continue;
      }
      if (activeCourseId && course.id === activeCourseId) {
        byTitle.set(key, course);
      }
    }
    return Array.from(byTitle.values());
  })();

  return (
    <div
      className={cn(
        "left-0 top-0 flex flex-col h-full border-r-2 px-4 md:fixed md:w-[225px] lg:w-[256px] bg-white",
        className
      )}
    >
      <Link href="/dashboard">
        <div className="flex items-center gap-x-3 px-4 py-6">
          <h1 className="text-3xl font-extrabold tracking-wide text-blue-600">
            ExamPrep
          </h1>
        </div>
      </Link>

      {uniqueCourses.length > 0 && (
        <SidebarSubjectSelector
          courses={uniqueCourses}
          activeCourseId={activeCourseId}
        />
      )}

      <div className="flex flex-1 flex-col gap-y-2">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            iconSrc={item.iconSrc}
          />
        ))}
      </div>

      <Separator className="h-0.5" />

      <div className="flex flex-col gap-y-4 mt-4">
        <div className="flex flex-col items-start gap-y-2 mb-4">
          <AccountControls name={user?.firstName} />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
