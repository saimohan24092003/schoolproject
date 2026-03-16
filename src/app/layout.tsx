import "./globals.css";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/Sonner";

import { ExitModal, HeartsModal, PracticeModal } from "@/components/modals";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "ExamPrep - O-Level Practice",
  description: "Master O-Level exams with verified past papers and mark schemes.",
  icons: {
    icon: "/linga-logo.svg",
    shortcut: "/linga-logo.svg",
    apple: "/linga-logo.svg",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased hydrated">
      <body
        className={cn(
          "scrollbar-thumb-gray scrollbar-thumb-rounded scrollbar-track-gray-lighter scrollbar-w-4 scrolling-touch",
          bodyFont.variable,
          headingFont.variable,
          "font-body"
        )}
      >
        <ClerkProvider>
          {children}
          <Toaster />
          <ExitModal />
          <HeartsModal />
          <PracticeModal />
        </ClerkProvider>
      </body>
    </html>
  );
}
