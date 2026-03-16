export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import db from "@/server/db/drizzle";
import { igcseGamificationState } from "@/server/db/schema";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.igcseGamificationState.findMany();
  const leaderboard = rows
    .sort((a, b) => b.leaderboardPoints - a.leaderboardPoints)
    .slice(0, 50)
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      leaderboardPoints: row.leaderboardPoints,
      totalXp: row.totalXp,
      currentStreak: row.currentStreak,
      badges: JSON.parse(row.badgesJson || "[]"),
    }));

  const myEntry = leaderboard.find((row) => row.userId === userId) || null;

  return NextResponse.json({
    leaderboard,
    myEntry,
  });
}
