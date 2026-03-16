import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

const PRIMARY_MODEL = "gemini-2.0-flash";
const OCR_MODEL = "gemini-1.5-flash";

export async function invokeGeminiJson(prompt: string): Promise<string> {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function extractTextWithGeminiOcr(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; confidence: number }> {
  if (!geminiApiKey) {
    return { text: "", confidence: 0 };
  }
  const model = genAI.getGenerativeModel({ model: OCR_MODEL });
  const prompt =
    "OCR task: extract all readable student answer text in plain text. " +
    "Preserve equations and numbering. Return only extracted text.";

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType, data: fileBuffer.toString("base64") } },
  ]);
  const text = result.response.text().trim();
  const confidence = text.length > 0 ? 0.9 : 0.1;
  return { text, confidence };
}
