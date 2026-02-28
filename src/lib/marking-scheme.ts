export type TheoryMarkingInput = {
  answer: string;
  markingScheme: string;
  maxMarks: number;
};

export type TheoryMarkingResult = {
  awardedMarks: number;
  maxMarks: number;
  matchedPoints: number;
  totalPoints: number;
  feedback: string;
  hint: string;
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "their", "then",
  "than", "have", "has", "had", "are", "was", "were", "will", "would", "should", "can",
  "could", "because", "about", "under", "over", "each", "more", "less", "very", "only",
  "they", "them", "there", "where", "when", "which", "what", "why", "how", "you", "our",
  "its", "it's", "his", "her", "she", "him", "not", "all", "any", "one", "two", "three",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function extractMarkPoints(markingScheme: string): string[] {
  const normalized = markingScheme.replace(/\r/g, "\n");
  const split = normalized
    .split(/\n|;|\u2022|•|,/)
    .map((p) => p.trim())
    .filter(Boolean);
  return split.length > 0 ? split : [markingScheme.trim()];
}

function gradeBoundary(percentage: number): string {
  if (percentage >= 90) return "A*";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "U";
}

export function getGradeFromPercentage(percentage: number): string {
  return gradeBoundary(percentage);
}

export function evaluateTheoryByMarkScheme(input: TheoryMarkingInput): TheoryMarkingResult {
  const maxMarks = Math.max(1, Number(input.maxMarks || 1));
  const answer = input.answer || "";
  const markingScheme = input.markingScheme || "";

  if (!answer.trim()) {
    return {
      awardedMarks: 0,
      maxMarks,
      matchedPoints: 0,
      totalPoints: 1,
      feedback: "No answer detected. Include key points from the marking scheme.",
      hint: "Start with one clear point from the marking scheme, then add supporting detail.",
    };
  }

  if (!markingScheme.trim()) {
    return {
      awardedMarks: Math.max(1, Math.round(maxMarks * 0.4)),
      maxMarks,
      matchedPoints: 0,
      totalPoints: 0,
      feedback: "No structured marking scheme was available for this question.",
      hint: "Write concise, evidence-based points and include subject terms.",
    };
  }

  const points = extractMarkPoints(markingScheme);
  const answerTokens = new Set(tokenize(answer));
  let matched = 0;
  const unmatchedKeywords: string[] = [];

  points.forEach((point) => {
    const pointTokens = tokenize(point);
    if (pointTokens.length === 0) return;
    const hitCount = pointTokens.filter((t) => answerTokens.has(t)).length;
    const ratio = hitCount / pointTokens.length;
    if (ratio >= 0.55 || hitCount >= 3) {
      matched += 1;
    } else {
      unmatchedKeywords.push(...pointTokens.slice(0, 2));
    }
  });

  const totalPoints = Math.max(1, points.length);
  const raw = (matched / totalPoints) * maxMarks;
  const awardedMarks = Math.max(0, Math.min(maxMarks, Math.round(raw)));

  const missingKeyTerms = Array.from(new Set(unmatchedKeywords)).slice(0, 4);
  const feedback =
    awardedMarks === maxMarks
      ? "Strong response. You covered the required marking points."
      : `You covered ${matched}/${totalPoints} marking points. Add more specific mark-scheme terms.`;

  return {
    awardedMarks,
    maxMarks,
    matchedPoints: matched,
    totalPoints,
    feedback,
    hint:
      missingKeyTerms.length > 0
        ? `Focus on these terms: ${missingKeyTerms.join(", ")}.`
        : "Use short, direct points that align with the marking scheme.",
  };
}
