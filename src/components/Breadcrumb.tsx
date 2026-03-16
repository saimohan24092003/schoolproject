import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export const Breadcrumb = ({ crumbs }: { crumbs: Crumb[] }) => (
  <nav className="flex items-center gap-1 text-xs font-bold text-gray-400 flex-wrap">
    {crumbs.map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      return (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
          {crumb.href && !isLast ? (
            <Link
              href={crumb.href}
              className="hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className={`uppercase tracking-widest ${isLast ? "text-gray-700" : ""}`}>
              {crumb.label}
            </span>
          )}
        </span>
      );
    })}
  </nav>
);
