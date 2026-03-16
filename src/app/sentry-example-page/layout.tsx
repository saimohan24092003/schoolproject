import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "sentry-example-page",
  description: "Test Sentry for your Next.js app!",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
