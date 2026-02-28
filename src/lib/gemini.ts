import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_MODEL = "gemini-2.0-flash";

const normalizeOptionText = (option?: string) => {
  if (!option) return "";
  return option.replace(/^[A-D]\s*[:\-\)]\s*/i, "").trim();
};

const normalizeAnswerKey = (answer?: string) => {
  if (!answer) return "";
  return answer.split(":")[0].trim().toUpperCase();
};

const deterministicFallback = (
  question: string,
  options: string[],
  correctAnswer: string,
  userAnswer: string,
  topic: string
) => {
  const cleanedCorrect = normalizeOptionText(
    options[correctAnswer.charCodeAt(0) - 65] || options[0] || ""
  );
  const cleanedUser = userAnswer ? normalizeOptionText(userAnswer) : "";
  const connector = topic ? `${topic}` : "the topic";
  const reasonCorrect = cleanedCorrect
    ? `Correct answer: ${cleanedCorrect}.`
    : `Correct answer: ${correctAnswer}.`;
  const reasonWrong = cleanedUser
    ? `Your choice: ${cleanedUser} is incorrect because it does not follow the question's requirement.`
    : "Your choice is incorrect because it misses what the question is asking for.";
  const masteryTip = topic
    ? `Mastery tip: keep reinforcing ${connector} keywords and their exam-level applications.`
    : "Mastery tip: focus on the keywords in the question next time.";
  return `${reasonCorrect} ${reasonWrong} ${masteryTip}`;
};

/**
 * Generate an explanation for a science question
 */
export async function getQuestionExplanation(
  question: string,
  options: string[],
  correctAnswer: string,
  userAnswer: string,
  topic: string
) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `
    You are an expert Cambridge O-Level Combined Science tutor.
    A student is practicing for their exams and got this question wrong.

    Topic: ${topic}
    Question: ${question}
    Options: ${options.join(", ")}
    Correct Answer: ${correctAnswer}
    Student's Wrong Answer: ${userAnswer}

    Task:
    1. Briefly explain why the correct answer is ${correctAnswer}.
    2. Explain why the student's answer (${userAnswer}) is incorrect.
    3. Give a short "Mastery Tip" for the A* grade related to this topic (${topic}).

    Keep the tone encouraging and the explanation concise (max 150 words).
    Use simple English suitable for an O-Level student.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Explanation Error:", error);
    return deterministicFallback(question, options, correctAnswer, userAnswer, topic);
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
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `
    You are an expert tutor. A student just finished a smart practice session on "${topic}" for the subject "${subject}".
    Their score was ${score}%.

    Task:
    Provide a short (2-3 sentence) motivational feedback message.
    If they scored below 70%, suggest they focus on the basics.
    If they scored 70-89%, suggest they practice more variant papers.
    If they scored 90% or above, congratulate them on being on track for an A*!
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    return "Great effort! Keep practicing to achieve that A*.";
  }
}
