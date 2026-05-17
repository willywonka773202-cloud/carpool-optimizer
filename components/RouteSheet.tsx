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
      aria-expanded={expanded}
      className={`fixed inset-x-0 bottom-0 z-10 rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl transition-[max-height] duration-200 ease-out ${
        expanded ? "max-h-[80vh]" : "max-h-[36vh]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
        className="mx-auto mt-2 flex h-6 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      <div className="max-h-[calc(80vh-2.5rem)] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </section>
  );
}
