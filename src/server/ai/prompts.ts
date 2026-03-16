type EvaluatorPromptInput = {
  subjectName: string;
  question: string;
  markingScheme: string;
  studentAnswer: string;
  maxMarks: number;
  preferredLanguage?: string;
};

export function buildExaminerEvaluationPrompt(input: EvaluatorPromptInput): string {
  const preferredLanguage = input.preferredLanguage || "English";
  return `You are an IGCSE examiner.
Evaluate the student's answer strictly using the official marking scheme.

Subject: ${input.subjectName}
Question: ${input.question}
Marking scheme: ${input.markingScheme || "(not provided)"}
Student answer: ${input.studentAnswer}
Maximum marks: ${input.maxMarks}
Preferred explanation language: ${preferredLanguage}

Rules:
1) Explain for a 15-year-old student.
2) Never say "refer textbook".
3) Be specific about concept errors.
4) Keep explanation practical and exam-oriented.
5) Return valid JSON only.

Return this JSON shape:
{
  "awardedMarks": number,
  "maxMarks": number,
  "isCorrect": boolean,
  "correctAnswer": string,
  "conceptExplanation": string,
  "mistakeExplanation": string,
  "improvementSteps": string[],
  "example": string,
  "examTip": string,
  "translatedExplanation": string
}`;
}

type HintPromptInput = {
  subjectName: string;
  question: string;
  studentAnswer: string;
  weakConcept: string;
  preferredLanguage?: string;
};

export function buildConceptHintPrompt(input: HintPromptInput): string {
  const preferredLanguage = input.preferredLanguage || "English";
  return `You are an IGCSE concept tutor.
Subject: ${input.subjectName}
Question: ${input.question}
Student answer: ${input.studentAnswer}
Weak concept: ${input.weakConcept}
Language: ${preferredLanguage}

Write one concise hint that guides the student without giving the final answer directly.
Return plain text only.`;
}
