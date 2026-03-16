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
      <div className="relative mb-8 h-[240px] w-[240px] lg:mb-0 lg:h-[424px] lg:w-[424px] overflow-hidden shrink-0">
        <Image fill src="/hero.svg" alt="O-Level Exam Prep" className="object-contain" />
      </div>

      <div className="flex flex-col items-center gap-y-8">
        <div className="flex max-w-fit items-center justify-center rounded-full border border-blue-200 bg-white/80 shadow-[0_2px_0_0_#bfdbfe] backdrop-blur transition-all hover:border-blue-300 px-5 py-2 mt-2">
          <span className="text-sm font-bold text-blue-700 tracking-wide uppercase">
            Cambridge O-Level Exam Preparation
          </span>
        </div>

        <h1 className="max-w-[600px] text-center text-3xl font-extrabold text-slate-800 lg:text-5xl leading-[1.15]">
          Master O-Level Exams <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">with Smart Practice</span>
        </h1>

        <p className="max-w-[520px] text-center text-slate-500 text-base lg:text-lg leading-relaxed font-medium">
          Practice with verified O-Level past papers and mark schemes, get instant feedback,
          and build chapter-wise accuracy for A* readiness.
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
                <Button size="lg" variant="secondary" className="w-full text-base tracking-widest shadow-[0_5px_0_0_#1e3a8a] hover:-translate-y-0.5 transition-transform">
                  START O-LEVEL PRACTICE
                </Button>
              </SignUpButton>

              <SignInButton
                mode="modal"
                forceRedirectUrl="/dashboard"
                signUpForceRedirectUrl="/dashboard"
              >
                <Button
                  size="lg"
                  variant="secondaryOutline"
                  className="w-full text-base tracking-widest bg-white border-2 border-slate-200 text-slate-600 shadow-[0_4px_0_0_#e2e8f0] hover:bg-slate-50 active:shadow-[0_2px_0_0_#e2e8f0] active:translate-y-[1px] hover:-translate-y-0.5 transition-all"
                >
                  I ALREADY HAVE AN ACCOUNT
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

        <div className="w-full max-w-[640px] mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
            <div className="rounded-2xl border-2 border-slate-100 bg-white p-5 flex flex-col items-center shadow-sm hover:-translate-y-1 transition-transform cursor-default">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <FileCheck2 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-extrabold text-3xl text-slate-800 leading-none">500+</span>
              <span className="mt-2 text-sm font-bold text-slate-500 uppercase tracking-wide">Past Papers</span>
            </div>
            <div className="rounded-2xl border-2 border-slate-100 bg-white p-5 flex flex-col items-center shadow-sm hover:-translate-y-1 transition-transform cursor-default">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="font-extrabold text-3xl text-slate-800 leading-none">MS</span>
              <span className="mt-2 text-sm font-bold text-slate-500 uppercase tracking-wide">Verified Answers</span>
            </div>
            <div className="rounded-2xl border-2 border-slate-100 bg-white p-5 flex flex-col items-center shadow-sm hover:-translate-y-1 transition-transform cursor-default">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <span className="font-extrabold text-3xl text-slate-800 leading-none">A*</span>
              <span className="mt-2 text-sm font-bold text-slate-500 uppercase tracking-wide">Readiness</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 text-center uppercase tracking-wider">
              QP + MS cross-checked
            </div>
            <div className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 text-center uppercase tracking-wider">
              25-27 syllabus aligned
            </div>
            <div className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 text-center uppercase tracking-wider">
              Smart topic dashboard
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
