export const COMBINED_SCIENCE_SUBJECT_CODE = "0653";
export const COMBINED_SCIENCE_SUBJECT_TITLE = "Combined Science (0653)";

const DYNAMIC_PAPERS_BASE_URL =
  "https://dynamicpapers.com/wp-content/uploads/2015/09";

export type CombinedScienceSessionCode = "m" | "s" | "w";

export type CombinedSciencePaper2Requirement = {
  year: number;
  sessionCode: CombinedScienceSessionCode;
  sessionLabel: string;
  seasonDbValue: "march" | "june" | "november";
  paperNumber: 2;
  variantNumber: 1 | 2 | 3;
  paperCode: string;
  questionPaperUrl: string;
  markSchemeUrl: string;
  practiceHref: string;
};

const SESSION_META: Record<
  CombinedScienceSessionCode,
  { label: string; seasonDbValue: "march" | "june" | "november"; variants: Array<1 | 2 | 3> }
> = {
  m: { label: "Feb/March", seasonDbValue: "march", variants: [2] },
  s: { label: "May/June", seasonDbValue: "june", variants: [1, 2, 3] },
  w: { label: "October/November", seasonDbValue: "november", variants: [1, 2, 3] },
};

const toYY = (year: number) => String(year).slice(-2);

const buildPaper2Url = (
  year: number,
  sessionCode: CombinedScienceSessionCode,
  documentType: "qp" | "ms",
  variantNumber: 1 | 2 | 3
) => {
  const paperCode = `2${variantNumber}`;
  return `${DYNAMIC_PAPERS_BASE_URL}/${COMBINED_SCIENCE_SUBJECT_CODE}_${sessionCode}${toYY(
    year
  )}_${documentType}_${paperCode}.pdf`;
};

export const getCombinedSciencePaper2Requirements = (
  startYear = 2017,
  endYear = 2025
): CombinedSciencePaper2Requirement[] => {
  const rows: CombinedSciencePaper2Requirement[] = [];
  const sessions: CombinedScienceSessionCode[] = ["m", "s", "w"];

  for (let year = endYear; year >= startYear; year -= 1) {
    for (const sessionCode of sessions) {
      const session = SESSION_META[sessionCode];
      for (const variantNumber of session.variants) {
        const paperCode = `2${variantNumber}`;
        rows.push({
          year,
          sessionCode,
          sessionLabel: session.label,
          seasonDbValue: session.seasonDbValue,
          paperNumber: 2,
          variantNumber,
          paperCode,
          questionPaperUrl: buildPaper2Url(year, sessionCode, "qp", variantNumber),
          markSchemeUrl: buildPaper2Url(year, sessionCode, "ms", variantNumber),
          practiceHref: `/mock-exam?subject=${COMBINED_SCIENCE_SUBJECT_CODE}&year=${year}&session=${sessionCode}&variant=${variantNumber}`,
        });
      }
    }
  }

  return rows;
};

export const COMBINED_SCIENCE_ALL_TYPE_PRACTICE_LINKS = {
  mcq: `/mock-exam?subject=${COMBINED_SCIENCE_SUBJECT_CODE}`,
  theory: `/learn/smart-practice?subject=${COMBINED_SCIENCE_SUBJECT_CODE}&paperType=P4&level=31`,
  mixed: `/learn/smart-practice?subject=${COMBINED_SCIENCE_SUBJECT_CODE}&level=1`,
} as const;
