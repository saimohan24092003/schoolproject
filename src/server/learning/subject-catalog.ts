import type { PaperType, SubjectCode } from "./types";

export const SUPPORTED_SUBJECTS: Record<
  SubjectCode,
  { code: SubjectCode; name: string }
> = {
  "0653": { code: "0653", name: "Combined Science" },
  "0680": { code: "0680", name: "Environmental Management" },
  "0500": { code: "0500", name: "English" },
  "0580": { code: "0580", name: "Mathematics" },
  "3195": { code: "3195", name: "Hindi (O Level)" },
  "0549": { code: "0549", name: "Hindi (IGCSE)" },
};

export const SUPPORTED_PAPERS: PaperType[] = ["P1", "P2", "P4"];

export function isSupportedSubjectCode(value: string): value is SubjectCode {
  return value in SUPPORTED_SUBJECTS;
}

export function isSupportedPaperType(value: string): value is PaperType {
  return value === "P1" || value === "P2" || value === "P4";
}

export function getSubjectName(subjectCode: SubjectCode): string {
  return SUPPORTED_SUBJECTS[subjectCode].name;
}
