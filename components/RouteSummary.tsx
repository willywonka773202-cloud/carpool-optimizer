"use client";

import {
  Car,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Pencil,
  Route,
  Save,
  Share2,
  Shuffle,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  OptimizedRoute,
  RidePlan,
  RouteLeg,
  RouteOption,
  RoutePreferences,
} from "@/lib/types";
import { NAV_APPS, navAppLabel, type NavApp } from "@/lib/navLinks";
import { formatDistance, formatEta } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function RouteSummary({
  start,
  end,
  optimized,
  riderNames,
  ridePlan,
  routePreferences,
  navApp,
  onNavAppChange,
  onOpenNav,
  onCopyLink,
  onEdit,
  onSave,
  saveLabel = "Save",
  onSelectRoute,
  onStartDrive,
  chromeless = false,
}: {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  riderNames?: (string | null)[];
  ridePlan: RidePlan;
  routePreferences: RoutePreferences;
  navApp: NavApp;
  onNavAppChange: (app: NavApp) => void;
  onOpenNav: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onSave: () => void;
  saveLabel?: string;
  onSelectRoute: (index: number) => void;
  /** Opens the in-app pickup companion (live proximity → come-outside texts). */
  onStartDrive: () => void;
  /** Mobile cockpit sets this to suppress the sticky CTA (the shell CommandBar owns it). */
  chromeless?: boolean;
}) {
  const legs: RouteLeg[] | undefined = optimized.legs;
  const totalStops = optimized.orderedStops.length;
  const hasMetrics = optimized.distanceMeters > 0 || optimized.etaSeconds > 0;
  const selectedRouteIndex = optimized.selectedRouteIndex ?? 0;
  const routeOptions = optimized.routeOptions ?? [];
  const filledSeats = Math.min(totalStops, ridePlan.seatsAvailable);
  const remainingSeats = Math.max(ridePlan.seatsAvailable - totalStops, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pb-3">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-violet-600/15 p-4 animate-rise">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
              <Car className="h-5 w-5 text-blue-300" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold tracking-tight text-slate-100">
                {hasMetrics ? formatEta(optimized.etaSeconds) : "Route ready"}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                {hasMetrics && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Route className="h-3 w-3" aria-hidden="true" />
                      {formatDistance(optimized.distanceMeters)}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {totalStops} drop-off{totalStops !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
        </div>

        {/* Drive mode — the pickup companion that texts riders as you arrive */}
        <button
          type="button"
          onClick={onStartDrive}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-blue-500 animate-rise"
          style={{ animationDelay: "30ms" }}
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Start drive mode — text riders as you arrive
        </button>

        {/* Compact plan stats */}
        <section className="grid grid-cols-2 gap-2 animate-rise" style={{ animationDelay: "40ms" }}>
          <PlanStat
            icon={<Car className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Driver"
            value={ridePlan.driverName.trim() || "Me"}
            detail={formatRideWhen(ridePlan)}
          />
          <PlanStat
            icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Seats"
            value={`${filledSeats}/${ridePlan.seatsAvailable}`}
            detail={remainingSeats > 0 ? `${remainingSeats} open` : "Full"}
          />
        </section>

        {/* Navigation app picker */}
        <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 animate-rise" style={{ animationDelay: "55ms" }}>
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            Navigate with
          </p>
          <div className="grid grid-cols-3 gap-2">
            {NAV_APPS.map((app) => {
              const active = navApp === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onNavAppChange(app.id)}
                  className={
                    "rounded-xl border px-2 py-2 text-left transition " +
                    (active
                      ? "border-cyan-300/50 bg-cyan-400/15"
                      : "border-white/10 bg-slate-900/40 hover:border-cyan-300/25")
                  }
                >
                  <span className="block truncate text-xs font-bold text-slate-100">{app.label}</span>
                  <span className="block truncate text-[10px] text-slate-500">{app.note}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Route options (free OSRM alternates) */}
        {routeOptions.length > 0 && (
          <section className="space-y-2 animate-rise" style={{ animationDelay: "70ms" }}>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                Route options
              </p>
              <span className="text-[10px] text-slate-500">tap to preview</span>
            </div>
            <div className="grid gap-2">
              {routeOptions.map((option, index) => {
                const selected = index === selectedRouteIndex;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectRoute(index)}
                    className={
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition " +
                      (selected
                        ? "border-cyan-300/50 bg-cyan-400/15"
                        : "border-white/10 bg-slate-800/40 hover:border-cyan-300/30")
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black " +
                          (selected ? "bg-cyan-400 text-slate-950" : "bg-slate-700 text-slate-200")
                        }
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-100">
                          {option.label}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {formatEta(option.etaSeconds)} · {formatDistance(option.distanceMeters)}
                        </span>
                      </span>
                    </span>
                    <span
                      className={
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                        (selected ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-slate-400")
                      }
                    >
                      {selected ? "shown" : "preview"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Ordered drop-off list */}
        <ol className="space-y-0 animate-rise" style={{ animationDelay: "85ms" }}>
          <TimelineStop tone="start" index="S" label="Start" address={start} isLast={false} />
          {optimized.orderedStops.map((stop, i) => (
            <TimelineStop
              key={`${stop}-${i}`}
              tone="stop"
              index={String(i + 1)}
              label={riderNames?.[i] ?? `Stop ${i + 1}`}
              address={stop}
              leg={legs?.[i]}
              isLast={false}
            />
          ))}
          <TimelineStop
            tone="end"
            index="E"
            label="End"
            address={end}
            leg={legs?.[legs.length - 1]}
            isLast
          />
        </ol>
      </div>

      {/* Sticky CTA — desktop only; mobile cockpit (chromeless) uses the pinned CommandBar */}
      {!chromeless && (
        <div className="sticky bottom-0 -mx-1 mt-3 border-t border-white/10 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/70 px-1 pt-3 pb-1 backdrop-blur">
          <Button variant="success" size="lg" fullWidth onClick={onOpenNav}>
            <Navigation className="h-5 w-5" aria-hidden="true" />
            Open in {navAppLabel(navApp)}
          </Button>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" fullWidth onClick={onCopyLink}>
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Copy link
            </Button>
            <Button variant="secondary" size="sm" fullWidth onClick={onSave}>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saveLabel}
            </Button>
            <Button variant="ghost" size="sm" fullWidth onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/35 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-100">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

function formatRideWhen(plan: RidePlan): string {
  const date = plan.rideDate ? formatDate(plan.rideDate) : null;
  const time = plan.arrivalTime ? `by ${formatTime(plan.arrivalTime)}` : null;
  if (date && time) return `${date}, ${time}`;
  if (date) return date;
  if (time) return time;
  return "Anytime";
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(value: string): string {
  const [hourRaw, minute = "00"] = value.split(":");
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:${minute} ${suffix}`;
}

function TimelineStop({
  tone,
  index,
  label,
  address,
  leg,
  isLast,
}: {
  tone: "start" | "stop" | "end";
  index: string;
  label: string;
  address: string;
  leg?: RouteLeg;
  isLast: boolean;
}) {
  const hasRiderName = tone === "stop" && label !== `Stop ${index}`;
  const circleClass =
    tone === "start"
      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.45)]"
      : tone === "end"
        ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]"
        : "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.35)]";
  const cardClass =
    tone === "start"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "end"
        ? "border-red-500/20 bg-red-500/5"
        : "border-white/[0.07] bg-slate-800/30";

  return (
    <li className="relative flex gap-3 pb-2.5">
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-slate-500/50 to-slate-700/10" />
      )}
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${circleClass}`}
      >
        {index}
      </div>
      <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2 ${cardClass}`}>
        <div className="flex items-center gap-1.5">
          {hasRiderName && <User className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />}
          <span className="truncate text-xs font-semibold text-slate-200">{label}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] leading-4 text-slate-400">{address}</p>
        {leg && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-white/[0.06]">
              <Clock className="h-2.5 w-2.5 text-blue-400" aria-hidden="true" />
              {formatEta(leg.etaSeconds)} leg
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-white/[0.06]">
              <ChevronRight className="h-2.5 w-2.5 text-slate-400" aria-hidden="true" />
              {formatDistance(leg.distanceMeters)}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
