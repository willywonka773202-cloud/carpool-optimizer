"use client";

import { Bell, CalendarClock, CarFront, Route, Users } from "lucide-react";
import type { RidePlan, RoutePreferences } from "@/lib/types";

type Props = {
  routePreferences: RoutePreferences;
  onRoutePreferencesChange: (next: RoutePreferences) => void;
  ridePlan: RidePlan;
  onRidePlanChange: (next: RidePlan) => void;
  disabled?: boolean;
  compact?: boolean;
};

/**
 * Lean TUNE controls: driver, seats, date, arrival, and route style. Stops are always
 * auto-ordered to the shortest drop-off route; the route-style picker just chooses among
 * the alternate route lines. No checklists, reminders, or avoidances — kept intentionally
 * minimal so the stage fits with no scroll.
 */
export function TuneControls({
  routePreferences,
  onRoutePreferencesChange,
  ridePlan,
  onRidePlanChange,
  disabled,
  compact = false,
}: Props) {
  const field =
    "w-full rounded-lg border border-white/10 bg-slate-950/45 px-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50 " +
    (compact ? "h-9 text-xs" : "h-10");
  const labelText = "flex items-center gap-1.5 text-[11px] font-semibold text-slate-400";

  return (
    <div className={compact ? "grid h-full min-h-0 content-start gap-2" : "space-y-3"}>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className={labelText}>
            <CarFront className="h-3 w-3" aria-hidden="true" /> Driver
          </span>
          <input
            type="text"
            value={ridePlan.driverName}
            disabled={disabled}
            placeholder="Me"
            onChange={(e) => onRidePlanChange({ ...ridePlan, driverName: e.target.value })}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelText}>
            <Users className="h-3 w-3" aria-hidden="true" /> Seats
          </span>
          <input
            type="number"
            min={1}
            max={8}
            value={ridePlan.seatsAvailable}
            disabled={disabled}
            onChange={(e) =>
              onRidePlanChange({
                ...ridePlan,
                seatsAvailable: Math.min(8, Math.max(1, Number(e.target.value) || 1)),
              })
            }
            className={field}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className={labelText}>
            <CalendarClock className="h-3 w-3" aria-hidden="true" /> Date
          </span>
          <input
            type="date"
            value={ridePlan.rideDate}
            disabled={disabled}
            onChange={(e) => onRidePlanChange({ ...ridePlan, rideDate: e.target.value })}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelText}>
            <Bell className="h-3 w-3" aria-hidden="true" /> Arrive by
          </span>
          <input
            type="time"
            value={ridePlan.arrivalTime}
            disabled={disabled}
            onChange={(e) => onRidePlanChange({ ...ridePlan, arrivalTime: e.target.value })}
            className={field}
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className={labelText}>
          <Route className="h-3 w-3" aria-hidden="true" /> Route style
        </span>
        <select
          value={routePreferences.intent}
          disabled={disabled}
          onChange={(e) =>
            onRoutePreferencesChange({
              ...routePreferences,
              intent: e.target.value as RoutePreferences["intent"],
            })
          }
          className={field}
        >
          <option value="fastest">Fastest</option>
          <option value="balanced">Balanced</option>
          <option value="alternate">Alternate</option>
        </select>
      </label>

      <p className="text-[11px] leading-4 text-slate-500">
        Stops are auto-ordered to the shortest drop-off route. Route style picks among the
        alternate route lines.
      </p>
    </div>
  );
}
