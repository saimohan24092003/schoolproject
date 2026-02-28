import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { FileCheck2, ShieldCheck, TrendingUp } from "lucide-react";

import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="mx-auto flex flex-1 flex-col w-full max-w-screen-lg items-center justify-center gap-2 px-6 py-4 lg:flex-row">
      <div className="relative mb-8 h-[240px] w-[240px] lg:mb-0 lg:h-[424px] lg:w-[424px]">
        <Image fill src="/hero.svg" alt="O-Level Exam Prep" />
      </div>

      <div className="flex flex-col items-center gap-y-8">
        <div className="flex max-w-fit items-center justify-center rounded-full border border-blue-200 bg-blue-50 shadow-md backdrop-blur transition-all hover:border-blue-300 px-5 py-1">
          <span className="text-sm font-semibold text-blue-700">
            Cambridge O-Level Exam Preparation
          </span>
        </div>

        <h1 className="max-w-[480px] text-center text-xl font-bold text-gray-700 lg:text-3xl -mt-4">
          Master O-Level Exams with Smart Practice.
        </h1>

        <p className="max-w-[480px] text-center text-gray-500 text-sm lg:text-base">
          Practice with verified O-Level past papers and mark schemes, get instant feedback,
          and build chapter-wise accuracy for A* readiness with clear progress tracking for students and parents.
        </p>

        <div className="flex flex-col w-full max-w-[330px] items-center gap-y-3">
          <ClerkLoading>
            <SignedOut>
              <div className="flex flex-col gap-y-3">
                <div className="h-[48px] w-[330px] animate-pulse bg-gray-200 ring ring-border rounded-xl" />

                <div className="h-[48px] w-[330px] flex items-center justify-center ring ring-border rounded-xl">
                  <div className=" h-5 w-56 animate-pulse bg-gray-200 rounded-xl" />
                </div>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="h-[48px] w-[330px] animate-pulse bg-gray-200 ring ring-border rounded-xl" />
            </SignedIn>
          </ClerkLoading>

          <ClerkLoaded>
            <SignedOut>
              <SignUpButton
                mode="modal"
                forceRedirectUrl="/dashboard"
                signInForceRedirectUrl="/dashboard"
              >
                <Button size="lg" variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700">
                  Start O-Level Practice
                </Button>
              </SignUpButton>

              <SignInButton
                mode="modal"
                forceRedirectUrl="/dashboard"
                signUpForceRedirectUrl="/dashboard"
              >
                <Button size="lg" variant="primaryOutline" className="w-full">
                  I already have an account
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Button size="lg" variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </SignedIn>
          </ClerkLoaded>
        </div>

        <div className="w-full max-w-[560px] mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-500">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col items-center">
              <FileCheck2 className="w-5 h-5 text-blue-600 mb-2" />
              <span className="font-bold text-2xl text-blue-600 leading-none">500+</span>
              <span className="mt-1 font-semibold text-gray-700">Past Papers</span>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col items-center">
              <ShieldCheck className="w-5 h-5 text-blue-600 mb-2" />
              <span className="font-bold text-2xl text-blue-600 leading-none">MS</span>
              <span className="mt-1 font-semibold text-gray-700">Verified Answers</span>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col items-center">
              <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
              <span className="font-bold text-2xl text-blue-600 leading-none">A*</span>
              <span className="mt-1 font-semibold text-gray-700">Readiness Tracking</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 text-center">
              QP + MS cross-checked
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 text-center">
              2025-2027 syllabus aligned
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 text-center">
              Topic-wise readiness dashboard
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
