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
        "fixed inset-x-0 bottom-0 z-[1001] mx-auto max-w-3xl rounded-t-3xl border-t border-white/10 " +
        "bg-slate-900/85 shadow-sheet backdrop-blur-xl " +
        "transition-[max-height] duration-300 ease-out-quint " +
        (expanded ? "max-h-[82vh]" : "max-h-[34vh]")
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
      <div className="max-h-[calc(82vh-3.5rem)] overflow-y-auto px-4 pt-1 pb-safe">
        {children}
      </div>
    </section>
  );
}
