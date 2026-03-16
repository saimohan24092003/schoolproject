import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_FALLBACK_MODEL = "gemini-1.5-flash"; // different quota bucket

/** Retry a Gemini call once on 429, switching to the fallback model */
async function generateWithRetry(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    if (err?.status === 429 || String(err).includes("429")) {
      // Try fallback model after short wait
      await new Promise(r => setTimeout(r, 1500));
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_FALLBACK_MODEL });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch {
        throw err; // both models failed
      }
    }
    throw err;
  }
}

/**
 * Generate a concept explanation for a wrong answer.
 * Acts as a Cambridge tutor — teaches the concept so the student never
 * makes the same mistake again.
 */
export async function getQuestionExplanation(
  question: string,
  options: string[],
  correctAnswer: string,
  userAnswer: string,
  topic: string,
  markingSchemeAnswer?: string
) {
  const markSchemeSection = markingSchemeAnswer
    ? `\nCambridge Mark Scheme: ${markingSchemeAnswer}`
    : "";

  const optionsSection = options.length > 0
    ? `\nOptions given: ${options.join(" | ")}`
    : "";

  const prompt = `You are a Cambridge O-Level tutor. A student just got this question WRONG and needs to understand the concept deeply so they never make this mistake again.

Topic: ${topic}
Question: ${question}${optionsSection}
Correct Answer: ${correctAnswer}${markSchemeSection}
Student's Wrong Answer: ${userAnswer}

Write a response with EXACTLY these 3 sections (use these headings):

📚 **The Concept**
Explain the underlying concept/principle in 2-3 clear sentences. Teach it from scratch — assume the student forgot or misunderstood it. Use simple language.

❌ **Why Your Answer Was Wrong**
In 1-2 sentences, explain specifically why "${userAnswer}" is incorrect for this question.

💡 **Remember It**
Give ONE short memorable trick, rule, or keyword the student can use to get this type of question right next time.

Keep total response under 150 words. Be encouraging and clear.`;

  try {
    return await generateWithRetry(prompt);
  } catch (error: any) {
    console.error("Gemini Explanation Error:", error);
    return conceptFallback(question, correctAnswer, userAnswer, topic, markingSchemeAnswer);
  }
}

/**
 * Fallback when Gemini is unavailable — still teaches the concept
 * using the Cambridge mark scheme answer.
 */
function conceptFallback(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  topic: string,
  markingSchemeAnswer?: string
): string {
  const lines: string[] = [];

  lines.push(`📚 **The Concept**`);
  if (markingSchemeAnswer) {
    lines.push(markingSchemeAnswer);
  } else {
    lines.push(`This question tests your knowledge of **${topic}**. The correct answer is: ${correctAnswer}.`);
  }

  lines.push(``);
  lines.push(`❌ **Why Your Answer Was Wrong**`);
  lines.push(`You answered "${userAnswer}", but this does not satisfy what the question is asking. Read the question carefully and focus on the key term.`);

  lines.push(``);
  lines.push(`💡 **Remember It**`);
  lines.push(`For **${topic}** questions: re-read your class notes and look for this concept in the Cambridge syllabus. Past paper practice on this topic will help it stick.`);

  return lines.join("\n");
}

/**
 * Generate hints during practice (progressive difficulty)
 */
export async function generateMCQHint(
  question: string,
  options: string[],
  correctAnswer: string,
  topic: string,
  hintNumber: number,
  markingSchemeAnswer?: string
): Promise<string> {
  const hintStyles = [
    "Give a very subtle clue about the topic area only — don't reveal the answer.",
    "Point out the key scientific principle or definition involved.",
    "Narrow down by explaining which options can be eliminated and why.",
    "Strongly guide toward the answer using the mark scheme logic.",
  ];
  const style = hintStyles[Math.min(hintNumber - 1, 3)];
  const msSection = markingSchemeAnswer ? `\nMark scheme: ${markingSchemeAnswer}` : "";

  const prompt = `You are a Cambridge O-Level tutor giving hint ${hintNumber} of 4 for a practice question.

Topic: ${topic}
Question: ${question}
Options: ${options.join(" | ")}
Correct Answer: ${correctAnswer}${msSection}

Hint instruction: ${style}

Write ONLY the hint text. Max 30 words. Do not say "Hint:" or number it.`;

  try {
    return await generateWithRetry(prompt);
  } catch (error: any) {
    console.error("[generateMCQHint] Gemini error:", error);
    const fallbackHints = [
      `Think carefully about what "${topic}" involves at the molecular/particle level.`,
      `Focus on the scientific definition — which option matches the correct term?`,
      `Eliminate options that describe a different process or substance entirely.`,
      `The correct answer directly relates to: ${correctAnswer.slice(0, 40)}...`,
    ];
    return fallbackHints[Math.min(hintNumber - 1, 3)];
  }
}

/**
 * Get overall feedback for a practice session
 */
export async function getSessionFeedback(
  subject: string,
  topic: string,
  score: number,
  topicAnalysis: any
) {
  const prompt = `Cambridge O-Level tutor. Student finished "${topic}" (${subject}), scored ${score}%.

Write 2 sentences: one sentence on what they should be proud of, one sentence on what to focus on next. Be specific to the score. Max 40 words.`;

  try {
    return await generateWithRetry(prompt);
  } catch {
    if (score >= 80) return "Excellent work — you're on track for A*! Keep practising timed papers to build exam speed.";
    if (score >= 60) return "Good effort! Focus on the concepts you missed today and try the next level when ready.";
    return "Don't give up — every attempt builds understanding. Review today's concepts and retry this topic.";
  }
}
