import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  // Legacy language learning routes
  "/learn",
  "/courses",
  "/shop",
  "/quests",
  "/lesson(.*)",
  "/leaderboard",
  // New exam platform routes
  "/dashboard",
  "/exams",
  "/exams(.*)",
  "/progress",
  "/admin(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // if (isProtectedRoute(req)) auth().protect();
  // Disabled protection for Demo Mode
});

export const config = {
  matcher: ["/((?!.+.[w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
