import Link from "next/link";
import { cn } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { SidebarClient } from "@/components/SidebarClient";
import { getCourses, getUserProgress } from "@/server/db/queries";
import { BookOpenCheck, Flame, LogOut, Target, Zap } from "lucide-react";

type SidebarProps = { className?: string };

const Sidebar = async ({ className }: SidebarProps) => {
  const [user, courses, userProgress] = await Promise.all([
    currentUser(),
    getCourses(),
    getUserProgress(),
  ]);

  const activeCourseId = userProgress?.activeCourseId ?? null;
  const points = userProgress?.points ?? 0;
  const streak = userProgress?.currentStreak ?? 0;
  const hearts = userProgress?.hearts ?? 5;
  const level = Math.floor(points / 200) + 1;
  const xpInLevel = points % 200;

  const uniqueCourses = (() => {
    const byTitle = new Map<string, (typeof courses)[number]>();
    for (const course of courses) {
      const key = course.title.trim().toLowerCase();
      if (!byTitle.has(key)) {
        byTitle.set(key, course);
        continue;
      }
      if (activeCourseId && course.id === activeCourseId) {
        byTitle.set(key, course);
      }
    }
    return Array.from(byTitle.values());
  })();

  const activeCourse = courses.find((course) => course.id === activeCourseId);
  const initialCode = activeCourse?.title.match(/\d+/)?.[0] ?? "0653";

  return (
    <aside
      className={cn(
        "left-0 top-0 z-40 h-full md:fixed md:w-[280px]",
        className
      )}
    >
      <div className="m-4 flex h-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-[0_18px_48px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-900/25">
            <BookOpenCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">A* Program</p>
            <p className="text-lg font-black text-slate-900">PrepLab</p>
          </div>
        </Link>

        <div className="mx-4 mt-4 rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-600 to-blue-700 p-4 text-white">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-100">Student</p>
              <p className="text-sm font-black">{user?.firstName ?? "Learner"}</p>
            </div>
            <div className="rounded-xl bg-white/20 px-2.5 py-1 text-xs font-black">Level {level}</div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/12 p-2">
              <Flame size={14} className="mx-auto mb-1 text-amber-200" />
              <p className="text-xs font-black">{streak}</p>
              <p className="text-[10px] font-bold text-teal-100">Streak</p>
            </div>
            <div className="rounded-xl bg-white/12 p-2">
              <Zap size={14} className="mx-auto mb-1 fill-yellow-200 text-yellow-200" />
              <p className="text-xs font-black">{points.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-teal-100">XP</p>
            </div>
            <div className="rounded-xl bg-white/12 p-2">
              <Target size={14} className="mx-auto mb-1 text-emerald-200" />
              <p className="text-xs font-black">{hearts}/5</p>
              <p className="text-[10px] font-bold text-teal-100">Hearts</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-yellow-300"
                style={{ width: `${Math.min(100, (xpInLevel / 200) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold text-teal-100">{xpInLevel}/200 XP to level {level + 1}</p>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
          {uniqueCourses.length > 0 && (
            <SidebarClient
              courses={uniqueCourses}
              activeCourseId={activeCourseId}
              initialSubjectCode={initialCode}
            />
          )}
        </div>

        <div className="border-t border-slate-200/70 px-4 py-3">
          <div className="mb-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="truncate text-sm font-black text-slate-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs font-medium text-slate-500">
              {user?.emailAddresses?.[0]?.emailAddress}
            </p>
          </div>

          <SignOutButton redirectUrl="/sign-in">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100">
              <LogOut size={16} />
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
