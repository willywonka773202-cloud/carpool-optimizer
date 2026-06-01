"use client";

import { Fragment } from "react";
import { Check, Lock, MapPin, Navigation, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { STAGE_ORDER, type Stage } from "@/lib/cockpit";

export type { Stage } from "@/lib/cockpit";

const STEPS: Array<{ key: Stage; label: string; icon: LucideIcon }> = [
  { key: "build", label: "Build", icon: MapPin },
  { key: "tune", label: "Tune", icon: SlidersHorizontal },
  { key: "go", label: "Go", icon: Navigation },
];

/**
 * The directional spine: Build → Tune → Go. Replaces the old peer-tab row so the user
 * always knows where they are and what's next. "Go" stays locked until a route is optimized.
 * Shared by the mobile cockpit and the desktop panel.
 */
export function StageRail({
  stage,
  goUnlocked,
  onJump,
  className = "",
}: {
  stage: Stage;
  goUnlocked: boolean;
  onJump: (stage: Stage) => void;
  className?: string;
}) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  return (
    <nav
      aria-label="Planning stages"
      className={"flex items-center gap-1 " + className}
    >
      {STEPS.map((step, i) => {
        const idx = STAGE_ORDER.indexOf(step.key);
        const isActive = step.key === stage;
        const isComplete = idx < currentIdx;
        const isLocked = step.key === "go" && !goUnlocked;
        const Icon = isLocked ? Lock : isComplete ? Check : step.icon;
        return (
          <Fragment key={step.key}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={
                  "h-px flex-1 rounded-full transition-colors " +
                  (idx <= currentIdx ? "bg-cyan-300/50" : "bg-white/10")
                }
              />
            )}
            <button
              type="button"
              aria-current={isActive ? "step" : undefined}
              disabled={isLocked}
              onClick={() => !isLocked && onJump(step.key)}
              className={
                "group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
                (isActive
                  ? "bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                  : isComplete
                    ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/25 hover:bg-emerald-400/25"
                    : isLocked
                      ? "bg-slate-950/40 text-slate-600 ring-1 ring-white/10 cursor-not-allowed"
                      : "bg-slate-950/40 text-slate-300 ring-1 ring-white/10 hover:bg-slate-800/70 hover:text-slate-100")
              }
            >
              <span
                className={
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] " +
                  (isActive
                    ? "bg-slate-950/20 text-slate-950"
                    : isComplete
                      ? "bg-emerald-300/20 text-emerald-100"
                      : "bg-white/5 text-current")
                }
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
              </span>
              {step.label}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
