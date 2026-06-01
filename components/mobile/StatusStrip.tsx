"use client";

import { buildRouteMonitor } from "@/lib/routeMonitor";
import type { RidePlan } from "@/lib/types";

/**
 * Region 2 of the mobile cockpit: a pinned, glanceable one-line status strip driven by
 * lib/routeMonitor (previously unused). Editing → readiness headline; optimized →
 * leave-by / arrival headline. Always one line, ~40px tall.
 */
export function StatusStrip({
  start,
  end,
  stops,
  riderNames,
  ridePlan,
  etaSeconds,
  distanceMeters,
  routeLabel,
  routeOptionCount,
}: {
  start: string;
  end: string;
  stops: string[];
  riderNames: (string | null)[];
  ridePlan: RidePlan;
  etaSeconds?: number;
  distanceMeters?: number;
  routeLabel?: string;
  routeOptionCount?: number;
}) {
  const monitor = buildRouteMonitor({
    start,
    end,
    stops,
    riderNames,
    ridePlan,
    etaSeconds,
    distanceMeters,
    routeLabel,
    routeOptionCount,
  });

  const dotClass =
    monitor.status === "ready"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      : monitor.status === "attention"
        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
        : "bg-slate-500";

  return (
    <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/45 px-3">
      <span className={"h-2 w-2 shrink-0 rounded-full " + dotClass} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold leading-4 text-slate-100">{monitor.headline}</p>
        <p className="truncate text-[10px] leading-3 text-slate-400">{monitor.subheadline}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
        {monitor.routeLine}
      </span>
    </div>
  );
}
