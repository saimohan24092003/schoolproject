"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, FlaskConical, Home, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Practice", href: "/learn/smart-practice", icon: Zap },
  { label: "Mock", href: "/mock-exam", icon: FlaskConical },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Quests", href: "/quests", icon: Trophy },
];

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subjectCode = searchParams.get("subject");

  const withSubject = (href: string) => {
    if (!subjectCode) return href;
    if (href !== "/learn/smart-practice" && href !== "/progress") return href;
    return `${href}?subject=${subjectCode}`;
  };

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const href = withSubject(item.href);
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black transition",
                active
                  ? "bg-gradient-to-b from-teal-600 to-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <Icon size={17} className={cn(active && item.label === "Practice" && "fill-white")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
