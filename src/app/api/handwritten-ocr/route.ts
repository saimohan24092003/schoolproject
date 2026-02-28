import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function transcribeOne(file: File): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "";
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const buffer = Buffer.from(await file.arrayBuffer());
  const prompt = [
    "You are doing OCR only.",
    "Transcribe the handwritten answer exactly as text.",
    "Do not solve, do not explain, do not add content.",
    "If unreadable, return exactly: UNREADABLE",
  ].join(" ");

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: file.type || "application/octet-stream",
          data: buffer.toString("base64"),
        },
      },
    ]);
    const text = result.response.text().trim();
    if (!text || text.toUpperCase().includes("UNREADABLE")) return "";
    return text;
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const out: Record<string, string> = {};

  // Keys are expected like q_0, q_1 ... each can have 1..n files.
  const keys = Array.from(formData.keys());
  for (const key of keys) {
    if (!key.startsWith("q_")) continue;
    const files = formData
      .getAll(key)
      .filter((f): f is File => typeof File !== "string" && f instanceof File);

    if (files.length === 0) continue;
    const chunks: string[] = [];
    for (const file of files) {
      const text = await transcribeOne(file);
      if (text) chunks.push(text);
    }
    out[key] = chunks.join("\n").trim();
  }

  return NextResponse.json({ extracted: out });
}
