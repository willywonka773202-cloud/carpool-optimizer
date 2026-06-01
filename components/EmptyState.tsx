"use client";

import type { ReactNode } from "react";

/**
 * Small, centered blank-state card. Looks intentional, not broken.
 * Used for "Go reached with no route", future empty surfaces, etc.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-6 text-center " +
        className
      }
    >
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-100">{title}</p>
        {body && <p className="text-xs leading-5 text-slate-400">{body}</p>}
      </div>
      {action}
    </div>
  );
}
