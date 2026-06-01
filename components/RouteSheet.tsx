"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export function RouteSheet({
  expanded,
  onToggle,
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        "relative z-[1001] mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border-t border-white/10 " +
        "bg-slate-900/90 shadow-sheet backdrop-blur-xl transition-[height] duration-300 ease-out-quint"
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
        className="group mx-auto mt-2 flex h-8 w-20 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-100"
      >
        <span
          className="block h-1 w-12 rounded-full bg-slate-600/80 transition group-hover:bg-slate-400"
          aria-hidden="true"
        />
      </button>
      <div className="flex items-center justify-center pb-1">
        {expanded ? (
          <ChevronDown
            className="h-3.5 w-3.5 text-slate-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronUp
            className="h-3.5 w-3.5 text-slate-500"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3 pt-1 pb-safe">
        {children}
      </div>
    </section>
  );
}
