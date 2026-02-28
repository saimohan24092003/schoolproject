import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as fs from "fs/promises";
import * as path from "path";

export const runtime = "nodejs";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((f): f is File => typeof File !== "undefined" && f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ uploaded: [] });
    }

    const targetDir = path.join(process.cwd(), "public", "uploads", "mock-handwritten", userId);
    await fs.mkdir(targetDir, { recursive: true });

    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safe = sanitizeFilename(file.name || `file-${i}`);
      const finalName = `${Date.now()}-${i}-${safe}`;
      const absPath = path.join(targetDir, finalName);
      const data = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(absPath, data);
      uploaded.push(`/uploads/mock-handwritten/${userId}/${finalName}`);
    }

    return NextResponse.json({ uploaded });
  } catch (e) {
    console.error("Mock handwritten upload failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
