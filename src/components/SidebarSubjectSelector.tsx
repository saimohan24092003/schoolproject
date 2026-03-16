"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updateActiveSubject } from "@/server/actions/user-progress";
import { toast } from "sonner";
import { useMemo } from "react";

interface Course {
  id: number;
  title: string;
}

interface Props {
  courses: Course[];
  activeCourseId: number | null;
}

export const SidebarSubjectSelector = ({ courses, activeCourseId }: Props) => {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  // Optimistic local state so the dropdown updates immediately
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(activeCourseId);

  // Keep in sync if server sends updated activeCourseId after refresh
  useEffect(() => {
    setSelectedCourseId(activeCourseId);
  }, [activeCourseId]);

  const dedupedCourses = useMemo(() => {
    const byTitle = new Map<string, Course>();
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
  }, [courses, activeCourseId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = parseInt(e.target.value);
    if (courseId === selectedCourseId) return;

    const chosen = dedupedCourses.find((c) => c.id === courseId);
    const subjectCode = chosen?.title.match(/\d+/)?.[0];

    // Update dropdown immediately (optimistic)
    setSelectedCourseId(courseId);

    startTransition(() => {
      updateActiveSubject(courseId)
        .then(() => {
          const target = subjectCode
            ? `${pathname}?subject=${subjectCode}`
            : pathname;
          // push updates the page content via searchParams
          // refresh forces the layout (Sidebar) to re-fetch from DB so nav links update
          router.push(target);
          router.refresh();
          toast.success("Subject switched");
        })
        .catch(() => {
          setSelectedCourseId(activeCourseId); // revert on failure
          toast.error("Something went wrong");
        });
    });
  };

  return (
    <div className="px-2 pb-3">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
        Subject
      </p>
      <div className="relative">
        <select
          value={selectedCourseId ?? ""}
          onChange={handleChange}
          disabled={pending}
          className="w-full appearance-none text-xs font-bold text-gray-800 bg-blue-50 border-2 border-blue-100 rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-blue-400 cursor-pointer disabled:opacity-50 transition-colors hover:border-blue-300"
        >
          {dedupedCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
      </div>
    </div>
  );
};
