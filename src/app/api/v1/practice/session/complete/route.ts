export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { completeSession } from "@/server/learning/progress-tracker";

type CompletePayload = {
  sessionId: number;
};

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CompletePayload;
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const result = await completeSession({
    userId,
    sessionId: body.sessionId,
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
