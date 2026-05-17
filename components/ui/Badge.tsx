import * as React from "react";

type Tone = "live" | "demo" | "neutral" | "error";

const tones: Record<Tone, string> = {
  live: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  demo: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  neutral: "bg-slate-700/40 text-slate-300 ring-white/10",
  error: "bg-red-500/15 text-red-300 ring-red-500/30",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] " +
        "font-bold uppercase tracking-wide ring-1 " +
        tones[tone] +
        " " +
        className
      }
    >
      {children}
    </span>
  );
}
