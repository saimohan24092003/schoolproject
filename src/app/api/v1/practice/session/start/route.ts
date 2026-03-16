export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { buildAndStartSession } from "@/server/learning/session-builder";
import { isSupportedPaperType, isSupportedSubjectCode } from "@/server/learning/subject-catalog";

type StartSessionPayload = {
  subjectCode: string;
  paperType: string;
  levelNo: number;
  limit?: number;
};

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as StartSessionPayload;
  if (!isSupportedSubjectCode(body.subjectCode)) {
    return NextResponse.json({ error: "Unsupported subjectCode" }, { status: 400 });
  }
  if (!isSupportedPaperType(body.paperType)) {
    return NextResponse.json({ error: "Unsupported paperType" }, { status: 400 });
  }

  const session = await buildAndStartSession({
    userId,
    subjectCode: body.subjectCode,
    paperType: body.paperType,
    levelNo: body.levelNo,
    limit: body.limit,
  });

  return NextResponse.json(session);
}
