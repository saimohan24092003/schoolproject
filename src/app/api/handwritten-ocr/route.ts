export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

async function transcribeOne(file: File): Promise<{ text: string; raw: string; finishReason: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[OCR] GEMINI_API_KEY is not set");
    return { text: "", raw: "NO_API_KEY", finishReason: "" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type;
  if (!mimeType || mimeType === "application/octet-stream") {
    const name = file.name.toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (name.endsWith(".png")) mimeType = "image/png";
    else if (name.endsWith(".webp")) mimeType = "image/webp";
    else mimeType = "image/jpeg";
  }

  const prompt = [
    "Transcribe all handwritten text visible in this image.",
    "The paper may be rotated or photographed at an angle — read it regardless of orientation.",
    "Output only the transcribed text, preserving line breaks and numbering.",
    "Do not add any commentary, correction, or explanation.",
    "If no text is visible or legible, output: UNREADABLE",
  ].join(" ");

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: buffer.toString("base64") } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    console.log("[OCR] HTTP status:", res.status);
    console.log("[OCR] Full response:", JSON.stringify(json).slice(0, 500));

    if (!res.ok) {
      const errMsg = json?.error?.message ?? `HTTP ${res.status}`;
      console.error("[OCR] API error:", errMsg);
      // Rate limit check
      const isQuota = errMsg.toLowerCase().includes("quota") || res.status === 429;
      return { text: "", raw: isQuota ? "RATE_LIMIT" : `API_ERROR: ${errMsg}`, finishReason: "ERROR" };
    }

    const candidate = json?.candidates?.[0];
    const finishReason = candidate?.finishReason ?? "UNKNOWN";
    const raw: string = candidate?.content?.parts?.[0]?.text?.trim() ?? "";
    console.log("[OCR] finishReason:", finishReason, "| raw:", JSON.stringify(raw));

    return { text: raw, raw: raw || "GEMINI_EMPTY", finishReason };
  } catch (err: any) {
    console.error("[OCR] Fetch error:", err?.message ?? err);
    return { text: "", raw: `FETCH_ERROR: ${err?.message ?? err}`, finishReason: "ERROR" };
  }
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const out: Record<string, string> = {};
  const debugRaw: Record<string, { raw: string; finishReason: string }> = {};

  const keys = Array.from(formData.keys());
  for (const key of keys) {
    if (!key.startsWith("q_")) continue;
    const files = formData
      .getAll(key)
      .filter((f): f is File => typeof File !== "string" && f instanceof File);

    if (files.length === 0) continue;
    const chunks: string[] = [];
    for (const file of files) {
      const result = await transcribeOne(file);
      debugRaw[key] = { raw: result.raw, finishReason: result.finishReason };
      if (result.text && result.text.toUpperCase() !== "UNREADABLE") {
        chunks.push(result.text);
      }
    }
    out[key] = chunks.join("\n").trim();
  }

  return NextResponse.json({
    extracted: out,
    debug: { hasKey: !!process.env.GEMINI_API_KEY, raw: debugRaw },
  });
}
