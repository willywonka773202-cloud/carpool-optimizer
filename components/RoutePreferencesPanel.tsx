"use client";

import { Gauge, Map, Route, ShieldAlert, Waves, Zap } from "lucide-react";
import type { RouteIntent, RoutePreferences } from "@/lib/types";

const intentOptions: Array<{
  value: RouteIntent;
  label: string;
  detail: string;
  icon: typeof Zap;
}> = [
  { value: "fastest", label: "Fastest", detail: "shortest ETA", icon: Zap },
  { value: "balanced", label: "Balanced", detail: "smooth pickup", icon: Gauge },
  { value: "alternate", label: "Alternate", detail: "preview detour", icon: Route },
];

const avoidOptions: Array<{
  key: keyof Omit<RoutePreferences, "intent">;
  label: string;
  icon: typeof Map;
}> = [
  { key: "avoidTolls", label: "Tolls", icon: Map },
  { key: "avoidHighways", label: "Highways", icon: Route },
  { key: "avoidFerries", label: "Ferries", icon: Waves },
  { key: "avoidReportedHazards", label: "Hazards", icon: ShieldAlert },
];

export function RoutePreferencesPanel({
  value,
  onChange,
  disabled,
}: {
  value: RoutePreferences;
  onChange: (next: RoutePreferences) => void;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(15,23,42,0.72)_48%,rgba(49,46,129,0.38))] p-3 shadow-[0_18px_55px_rgba(2,6,23,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Route intelligence
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Pick the route personality before planning.</p>
        </div>
        <span className="rounded-full bg-cyan-300/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-100 ring-1 ring-cyan-200/20">
          beta
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {intentOptions.map((option) => {
          const Icon = option.icon;
          const selected = value.intent === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, intent: option.value })}
              className={
                "group min-h-20 rounded-xl border p-2 text-left transition duration-200 " +
                (selected
                  ? "border-cyan-200/55 bg-cyan-300/18 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
                  : "border-white/10 bg-slate-950/35 hover:border-cyan-200/30 hover:bg-slate-900/60")
              }
            >
              <span
                className={
                  "mb-2 flex h-7 w-7 items-center justify-center rounded-lg transition " +
                  (selected ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-slate-400 group-hover:text-cyan-100")
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="block text-xs font-black text-slate-100">{option.label}</span>
              <span className="mt-0.5 block text-[10px] leading-3 text-slate-500">{option.detail}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {avoidOptions.map((option) => {
          const Icon = option.icon;
          const selected = Boolean(value[option.key]);
          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, [option.key]: !selected })}
              className={
                "flex h-10 items-center justify-between rounded-xl border px-3 text-xs font-bold transition " +
                (selected
                  ? "border-emerald-300/35 bg-emerald-400/14 text-emerald-100"
                  : "border-white/10 bg-slate-950/30 text-slate-400 hover:border-white/20 hover:text-slate-100")
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Avoid {option.label}</span>
              </span>
              <span
                className={
                  "h-2.5 w-2.5 rounded-full " +
                  (selected ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.85)]" : "bg-slate-700")
                }
              />
            </button>
          );
        })}
      </div>
      <p className="text-[10px] leading-4 text-slate-500">
        Live ORS planning can avoid tolls, highways, and ferries. Hazard mode is saved as a
        driver reminder for now.
      </p>
    </section>
  );
}
