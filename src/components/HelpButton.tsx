"use client";

import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LayoutDashboard,
  Upload,
  X,
} from "lucide-react";

const GUIDE_SECTIONS = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    tone: "bg-sky-50 border-sky-200",
    steps: [
      "Select your subject from the sidebar dropdown.",
      "Review your roadmap progress and daily target.",
      "Use quick actions to open practice, mock exam, and progress pages.",
    ],
  },
  {
    title: "Smart Practice",
    icon: BrainCircuit,
    tone: "bg-teal-50 border-teal-200",
    steps: [
      "Pick a topic and start from the suggested next level.",
      "Answer each question using typed response or OCR upload.",
      "Use hints for guidance, then write your own final answer.",
    ],
  },
  {
    title: "Handwritten OCR",
    icon: Upload,
    tone: "bg-amber-50 border-amber-200",
    steps: [
      "Upload a clear image with strong lighting.",
      "Wait for extracted text and edit if needed.",
      "Submit and review examiner style feedback.",
    ],
  },
] as const;

const FAQ = [
  {
    q: "How are answers marked?",
    a: "The app evaluates against the stored mark scheme and returns score, explanation, mistakes, and exam tips.",
  },
  {
    q: "How should I choose topics?",
    a: "Start with high-priority topics first, then complete in-progress topics, then move to unstarted topics.",
  },
  {
    q: "Can I repeat the same topic?",
    a: "Yes. Each session pulls a new random set so repetition builds exam speed and retention.",
  },
  {
    q: "How can I improve OCR accuracy?",
    a: "Use dark pen, keep the page flat, avoid shadows, and capture the entire answer area.",
  },
] as const;

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"guide" | "faq" | "video">("guide");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full border border-teal-300 bg-teal-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-teal-900/30 transition hover:bg-teal-500 md:bottom-6 md:right-6"
      >
        <HelpCircle size={16} />
        Help
      </button>

      {open && <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {open && (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-600 to-blue-700 px-6 py-4 text-white">
            <div>
              <p className="text-lg font-black">Platform Guide</p>
              <p className="text-xs font-semibold text-teal-100">How students should use this app effectively</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 p-1">
            {(["guide", "faq", "video"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                  activeTab === tab
                    ? "bg-white text-teal-700 shadow"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {activeTab === "guide" && (
              <div className="space-y-3">
                {GUIDE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.title} className={`rounded-2xl border p-4 ${section.tone}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Icon size={18} className="text-slate-700" />
                        <p className="text-sm font-black text-slate-900">{section.title}</p>
                      </div>
                      <ul className="space-y-2">
                        {section.steps.map((step) => (
                          <li key={step} className="flex gap-2 text-sm font-medium text-slate-700">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-teal-600" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "faq" && (
              <div className="space-y-2">
                {FAQ.map((item, index) => (
                  <div key={item.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-bold text-slate-900">{item.q}</span>
                      {expandedFaq === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {expandedFaq === index && (
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "video" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-600">Quick walkthrough</p>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                  <video
                    src="/Screen%20Recording%202026-03-03%20151715.mp4"
                    controls
                    className="aspect-video w-full object-contain"
                    preload="metadata"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                  Use this sequence: choose subject, open Smart Practice, finish one full session, then review mistakes in Progress.
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
