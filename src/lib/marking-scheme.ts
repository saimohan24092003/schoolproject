/**
 * Strip examiner-only shorthand from a mark scheme before showing to students.
 * Removes lines like "Accept", "Allow", "Do not accept", "[1]", "OWTTE" etc.
 */
export function cleanMarkSchemeForDisplay(raw: string): string {
  if (!raw) return "";
  const EXAMINER_PATTERNS = [
    /^\s*accept\b/i,
    /^\s*allow\b/i,
    /^\s*do not accept\b/i,
    /^\s*do not allow\b/i,
    /^\s*ignore\b/i,
    /^\s*not\b.*\baccept/i,
    /^\s*award\b/i,
    /^\s*max\s+\d/i,
    /^\s*any\s+(one|two|three|four|five|six)\s+from/i,
    /^\s*owtte\b/i,
    /^\s*or\s+words\s+to\s+that\s+effect/i,
    /^\s*e\.?g\.?\b/i,
    /^\s*\(\s*a\s*\)/i,
    /^\s*\d+\s*(mark|marks)/i,
  ];
  const INLINE_BRACKETS = /\[\s*\d+\s*\]/g;

  return raw
    .split(/\n/)
    .map(line => line.replace(INLINE_BRACKETS, "").trim())
    .filter(line => {
      if (!line) return false;
      return !EXAMINER_PATTERNS.some(p => p.test(line));
    })
    .join("\n")
    .trim();
}

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
  "see", "mark", "marks", "scheme", "answer", "focus", "term", "terms", "point", "points",
  "attempt", "hint", "hints", "review",
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

export function isLikelyHintCopyAnswer(answer: string, latestHint?: string): boolean {
  const normalizedAnswer = normalizeText(answer || "");
  const normalizedHint = normalizeText(latestHint || "");

  if (!normalizedAnswer || !normalizedHint) return false;
  if (normalizedAnswer === normalizedHint) return true;

  if (
    /^focus on these terms\b/i.test(answer) ||
    /attempt\s+\d+\s+of\s+\d+\s+free\s+hints?/i.test(answer) ||
    /^review the marking scheme\b/i.test(answer) ||
    /^start with one clear point\b/i.test(answer) ||
    /^see\b.*\bmark\b/i.test(answer) ||
    /^refer\b.*\bmark\b/i.test(answer)
  ) {
    return true;
  }

  if (normalizedAnswer.length <= 18 && normalizedHint.includes(normalizedAnswer)) {
    return true;
  }

  const answerTokens = new Set(tokenize(normalizedAnswer));
  const hintTokens = new Set(tokenize(normalizedHint));
  if (answerTokens.size === 0 || hintTokens.size === 0) return false;
  if (answerTokens.size < 3) return false;

  const overlap = Array.from(answerTokens).filter((token) => hintTokens.has(token)).length;
  const overlapRatio = overlap / answerTokens.size;

  return overlapRatio >= 0.8;
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
      awardedMarks: 0,
      maxMarks,
      matchedPoints: 0,
      totalPoints: 0,
      feedback: "Mark scheme unavailable for this question, so auto-scoring cannot award marks safely.",
      hint: "Ask for another question or retry with a question that has a full mark scheme.",
    };
  }

  const points = extractMarkPoints(markingScheme);
  const answerTokens = new Set(tokenize(answer));
  let matched = 0;
  const unmatchedKeywords: string[] = [];

  // Detect "any N from" style marking schemes (e.g. "any two from:")
  const anyFromMatch = markingScheme.match(/any\s+(\w+)\s+from/i);
  const anyFromWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  };
  const requiredPoints = anyFromMatch
    ? (anyFromWords[anyFromMatch[1].toLowerCase()] ?? maxMarks)
    : maxMarks;

  points.forEach((point) => {
    const pointTokens = tokenize(point);
    if (pointTokens.length === 0) return;
    const hitCount = pointTokens.filter((t) => answerTokens.has(t)).length;
    const requiredHits =
      pointTokens.length <= 2
        ? pointTokens.length
        : Math.max(2, Math.ceil(pointTokens.length * 0.6));
    if (hitCount >= requiredHits) {
      matched += 1;
    } else {
      unmatchedKeywords.push(...pointTokens.slice(0, 2));
    }
  });

  const totalPoints = Math.max(1, points.length);
  // For "any N from" questions: each matched point = 1 mark, capped at maxMarks
  // For standard questions: proportional scoring
  const awardedMarks = anyFromMatch
    ? Math.max(0, Math.min(maxMarks, matched))
    : Math.max(0, Math.min(maxMarks, Math.round((matched / totalPoints) * maxMarks)));

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
