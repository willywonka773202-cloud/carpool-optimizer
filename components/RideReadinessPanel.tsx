"use client";

import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, ClipboardCheck, Users } from "lucide-react";
import { getRideReadiness } from "@/lib/rideReadiness";
import type { RidePlan } from "@/lib/types";

export function RideReadinessPanel({
  start,
  end,
  stops,
  riderNames,
  ridePlan,
}: {
  start: string;
  end: string;
  stops: string[];
  riderNames: (string | null)[];
  ridePlan: RidePlan;
}) {
  const readiness = getRideReadiness({ start, end, stops, riderNames, ridePlan });
  const notes =
    readiness.status === "draft" ? readiness.missingCoreInputs : readiness.attentionItems;

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78)_55%,rgba(8,47,73,0.64))] p-3 shadow-[0_20px_55px_rgba(2,6,23,0.32)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Ride readiness
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Check seats, timing, and driver prep before routing.</p>
        </div>
        <span
          className={
            "rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ring-1 " +
            (readiness.status === "ready"
              ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20"
              : readiness.status === "attention"
              ? "bg-amber-400/15 text-amber-100 ring-amber-300/20"
              : "bg-slate-200/10 text-slate-200 ring-white/10")
          }
        >
          {readiness.status === "ready"
            ? "Ready"
            : readiness.status === "attention"
            ? "Needs attention"
            : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ReadinessStat
          icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Seats"
          value={`${Math.min(readiness.totalStops, ridePlan.seatsAvailable)}/${ridePlan.seatsAvailable}`}
          detail={
            readiness.isOverCapacity
              ? `${readiness.totalStops - ridePlan.seatsAvailable} over capacity`
              : readiness.spareSeats > 0
              ? `${readiness.spareSeats} open`
              : "Full route"
          }
          tone={readiness.isOverCapacity ? "warn" : "default"}
        />
        <ReadinessStat
          icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Arrival"
          value={readiness.arrivalLabel}
          detail={readiness.repeatLabel}
        />
        <ReadinessStat
          icon={<BellRing className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Reminder"
          value={readiness.reminderLabel}
          detail={readiness.hasSchedule ? "Based on ride plan" : "Set date + time first"}
        />
        <ReadinessStat
          icon={<ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Checklist"
          value={`${readiness.filledChecklistItems} ready`}
          detail={
            readiness.blankChecklistItems > 0
              ? `${readiness.blankChecklistItems} unfinished`
              : "Prep list filled"
          }
          tone={readiness.blankChecklistItems > 0 ? "warn" : "default"}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Pill label={`${readiness.totalStops} stop${readiness.totalStops === 1 ? "" : "s"}`} />
        <Pill label={`${readiness.namedRiders} named rider${readiness.namedRiders === 1 ? "" : "s"}`} />
        {readiness.unnamedStops > 0 && <Pill label={`${readiness.unnamedStops} unnamed`} tone="warn" />}
      </div>

      {notes.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-slate-950/35 p-3">
          {notes.map((item) => (
            <div key={item} className="flex items-start gap-2 text-xs text-slate-300">
              {readiness.status === "ready" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
              )}
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-50">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          Driver plan, seats, reminder, and checklist are ready for optimization.
        </div>
      )}
    </section>
  );
}

function ReadinessStat({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={
        "rounded-xl border p-3 " +
        (tone === "warn"
          ? "border-amber-300/15 bg-amber-400/10"
          : "border-white/10 bg-slate-950/35")
      }
    >
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-100">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

function Pill({ label, tone = "default" }: { label: string; tone?: "default" | "warn" }) {
  return (
    <span
      className={
        "rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ring-1 " +
        (tone === "warn"
          ? "bg-amber-400/10 text-amber-100 ring-amber-300/20"
          : "bg-white/5 text-slate-300 ring-white/10")
      }
    >
      {label}
    </span>
  );
}
