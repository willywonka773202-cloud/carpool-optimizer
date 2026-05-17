import * as React from "react";

type Padding = "none" | "sm" | "md" | "lg";

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5 sm:p-6",
};

export function Card({
  padding = "md",
  className = "",
  children,
}: {
  padding?: Padding;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "rounded-2xl bg-slate-900/60 border border-white/10 shadow-card " +
        paddings[padding] +
        " " +
        className
      }
    >
      {children}
    </div>
  );
}
