"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateActiveSubject } from "@/server/actions/user-progress";
import { toast } from "sonner";

interface Subject {
  code: string;
  name: string;
  label: string;
}

interface Props {
  subjects: Subject[];
  selectedSubjectCode: string;
  courseMapping: Record<string, number>;
}

export const SubjectCards = ({ 
  subjects, 
  selectedSubjectCode, 
  courseMapping 
}: Props) => {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = (code: string) => {
    // Only 0653 and 9609 are currently supported in the course mapping
    const courseId = courseMapping[code];
    
    if (!courseId) {
      toast.info(`${code} is coming soon!`);
      return;
    }

    startTransition(() => {
      updateActiveSubject(courseId)
        .then(() => {
          router.push(`/dashboard?subject=${code}`);
          toast.success(`Subject switched to ${code}`);
        })
        .catch(() => toast.error("Something went wrong"));
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {subjects.map((subject) => {
        const isSelected = selectedSubjectCode === subject.code;
        const isAvailable = !!courseMapping[subject.code];

        return (
          <button 
            onClick={() => onClick(subject.code)}
            key={subject.code}
            disabled={pending || (!isAvailable && !isSelected)}
            className={`relative p-5 rounded-3xl border-2 transition-all text-start group flex flex-col gap-2
              ${isSelected ? "border-blue-600 bg-blue-50 shadow-sm" : "border-gray-100 bg-white hover:border-blue-200"}
              ${!isAvailable && !isSelected && "opacity-60 grayscale-[0.5]"}
              ${pending && "opacity-50"}
            `}
          >
            <div className="flex justify-between items-start w-full">
                {isSelected ? (
                    <div className="bg-blue-600 text-white p-1 rounded-full shadow-sm">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-5 h-5" /> 
                )}
                {!isAvailable && (
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded-full">
                        Soon
                    </span>
                )}
            </div>
            <div>
                <p className={`font-black text-sm transition-colors ${isSelected ? "text-gray-900" : "text-gray-700 group-hover:text-gray-900"}`}>{subject.name}</p>
                <p className={`text-[10px] font-bold tracking-wider ${isSelected ? "text-blue-600" : "text-gray-400"}`}>{subject.code}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
