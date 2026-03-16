"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Home,
  Trophy,
  Zap,
} from "lucide-react";
import { updateActiveSubject } from "@/server/actions/user-progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Smart Practice", href: "/learn/smart-practice", icon: Zap },
  { label: "Mock Exam", href: "/mock-exam", icon: FlaskConical },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Quests", href: "/quests", icon: Trophy },
];

interface Course {
  id: number;
  title: string;
}

interface Props {
  courses: Course[];
  activeCourseId: number | null;
  initialSubjectCode: string;
}

export const SidebarClient = ({ courses, activeCourseId, initialSubjectCode }: Props) => {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(activeCourseId);
  const [subjectCode, setSubjectCode] = useState(initialSubjectCode);

  useEffect(() => {
    setSelectedCourseId(activeCourseId);
  }, [activeCourseId]);

  const dedupedCourses = useMemo(() => {
    const byTitle = new Map<string, Course>();
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
  }, [courses, activeCourseId]);

  const handleSubjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = Number.parseInt(event.target.value, 10);
    if (!Number.isFinite(courseId) || courseId === selectedCourseId) {
      return;
    }

    const chosen = dedupedCourses.find((course) => course.id === courseId);
    const nextCode = chosen?.title.match(/\d+/)?.[0] ?? subjectCode;

    setSelectedCourseId(courseId);
    setSubjectCode(nextCode);

    startTransition(() => {
      updateActiveSubject(courseId)
        .then(() => {
          router.push(`/learn/smart-practice?subject=${nextCode}`);
          toast.success("Subject updated");
        })
        .catch(() => {
          setSelectedCourseId(activeCourseId);
          setSubjectCode(initialSubjectCode);
          toast.error("Could not switch subject");
        });
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Active subject</p>
        <div className="relative">
          <select
            value={selectedCourseId ?? ""}
            onChange={handleSubjectChange}
            disabled={pending}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-500"
          >
            {dedupedCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      <div className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          let href = item.href;
          if (item.href === "/learn/smart-practice") {
            href = `/learn/smart-practice?subject=${subjectCode}`;
          }
          if (item.href === "/progress") {
            href = `/progress?subject=${subjectCode}`;
          }

          const basePath = href.split("?")[0];
          const active =
            pathname === basePath || (basePath !== "/dashboard" && pathname.startsWith(`${basePath}/`));
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => router.push(href)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                active
                  ? "border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                <Icon size={16} />
              </span>
              <span className="text-sm font-black">{item.label}</span>
              <ChevronRight
                size={14}
                className={cn(
                  "ml-auto transition",
                  active ? "text-teal-600" : "text-slate-300 group-hover:text-slate-500"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
