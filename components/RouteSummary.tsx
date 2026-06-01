"use client";

import {
  Bell,
  CalendarClock,
  CalendarPlus2,
  Car,
  ChevronRight,
  CheckCircle2,
  Clock,
  Copy,
  ClipboardCheck,
  Leaf,
  MapPin,
  Navigation,
  Pencil,
  Route,
  RotateCcw,
  Save,
  ShieldAlert,
  Shuffle,
  StickyNote,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type {
  OptimizedRoute,
  RidePlan,
  RideRepeat,
  RouteLeg,
  RouteOption,
  RoutePreferences,
  SavedRouteProgress,
} from "@/lib/types";
import { buildOptimizedHandoffUrl } from "@/lib/handoffUrl";
import { buildCarpoolCalendarEvent } from "@/lib/calendar";
import { formatDistance, formatEta } from "@/lib/format";
import {
  buildChecklistProgressKey,
  buildStopProgressKey,
  resetSavedRouteProgress,
  summarizeSavedRouteProgress,
  toggleSavedRouteProgressKey,
} from "@/lib/routeProgress";
import { buildRideBrief } from "@/lib/rideBrief";
import {
  formatScheduleDateTime,
  formatScheduleTime,
  getRideScheduleSnapshot,
  getRideScheduleStatus,
} from "@/lib/schedule";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function RouteSummary({
  start,
  end,
  optimized,
  riderNames,
  ridePlan,
  routePreferences,
  onEdit,
  onSave,
  saveLabel = "Save",
  onSelectRoute,
  progress,
  onProgressChange,
  onResetProgress,
  chromeless = false,
}: {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  riderNames?: (string | null)[];
  ridePlan: RidePlan;
  routePreferences: RoutePreferences;
  onEdit: () => void;
  onSave: () => void;
  saveLabel?: string;
  onSelectRoute: (index: number) => void;
  progress: SavedRouteProgress;
  onProgressChange: (progress: SavedRouteProgress) => void;
  onResetProgress?: () => void;
  /**
   * When true, the internal sticky CTA footer is suppressed. The mobile cockpit
   * sets this so its pinned CommandBar owns the primary actions (avoids a double
   * action bar). Desktop omits it → renders its own sticky footer exactly as before.
   */
  chromeless?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);
  const [copyFallbackVisible, setCopyFallbackVisible] = useState(false);
  const url = buildOptimizedHandoffUrl(start, end, optimized);
  const legs: RouteLeg[] | undefined = optimized.legs;
  const totalStops = optimized.orderedStops.length;
  const isDemo = optimized.source === "mock";
  const selectedRouteIndex = optimized.selectedRouteIndex ?? 0;
  const routeOptions = optimized.routeOptions ?? [];
  const filledSeats = Math.min(totalStops, ridePlan.seatsAvailable);
  const remainingSeats = Math.max(ridePlan.seatsAvailable - totalStops, 0);
  const miles = optimized.distanceMeters > 0 ? optimized.distanceMeters / 1609.344 : 0;
  const potentialSoloMilesAvoided = miles > 0 ? miles * Math.max(totalStops - 1, 0) : 0;
  const schedule = getRideScheduleSnapshot(ridePlan, optimized.etaSeconds);
  const scheduleStatus = schedule ? getRideScheduleStatus(schedule) : null;
  const driverNote = ridePlan.driverNote?.trim();
  const progressSummary = summarizeSavedRouteProgress({
    id: "active",
    label: "Active route",
    start,
    end,
    stops: optimized.orderedStops,
    createdAt: 0,
    ridePlan,
    progress,
  });
  const rideBrief = buildRideBrief({
    start,
    end,
    optimized,
    riderNames,
    ridePlan,
    routePreferences,
  });

  // Running sum of leg times — index i = cumulative seconds to arrive at stop i
  const cumulativeSecs: number[] = [];
  if (legs) {
    let sum = 0;
    for (const leg of legs) {
      sum += leg.etaSeconds;
      cumulativeSecs.push(sum);
    }
  }

  async function copy() {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFallbackVisible(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyFallbackVisible(true);
    }
  }

  function openInMaps() {
    window.location.assign(url);
  }

  async function copyRideBrief() {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(rideBrief);
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 1500);
    } catch {
      setBriefCopied(false);
      window.prompt("Copy ride brief", rideBrief);
    }
  }

  function addToCalendar() {
    const ics = buildCarpoolCalendarEvent({ start, end, optimized, ridePlan });
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "carpool-plan.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  }

  function toggleConfirmed(index: number, stop: string) {
    onProgressChange(
      toggleSavedRouteProgressKey(progress, "stop", buildStopProgressKey(index, stop))
    );
  }

  function togglePrep(index: number, item: string) {
    onProgressChange(
      toggleSavedRouteProgressKey(progress, "checklist", buildChecklistProgressKey(index, item))
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pb-3">

        {/* Header */}
        <div className="flex items-center justify-between animate-rise">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              {isDemo ? "Google Maps handoff" : "Route optimized"}
            </p>
            <h2 className="text-lg font-bold text-slate-100">
              {isDemo ? "Ready for Maps" : "Ready to drive"}
            </h2>
          </div>
          <Badge tone={optimized.source === "ors" ? "live" : "demo"}>
            {optimized.source === "ors" ? "Live" : "Demo"}
          </Badge>
        </div>

        {/* Hero time card */}
        <div
          className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-violet-600/15 p-4 animate-rise"
          style={{ animationDelay: "50ms" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
              <Car className="h-5 w-5 text-blue-300" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              {isDemo ? (
                <>
                  {routeOptions.length > 0 ? (
                    <>
                      <div className="text-2xl font-bold tracking-tight text-slate-100">
                        {formatEta(optimized.etaSeconds)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Route className="h-3 w-3" aria-hidden="true" />
                          {formatDistance(optimized.distanceMeters)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{routeOptions[selectedRouteIndex]?.label ?? "Selected route"}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold tracking-tight text-slate-100">
                        Open in Google Maps
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {totalStops} drop-off{totalStops !== 1 ? "s" : ""}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>ETA and miles appear in Maps</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-slate-100">
                    {formatEta(optimized.etaSeconds)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Route className="h-3 w-3" aria-hidden="true" />
                      {formatDistance(optimized.distanceMeters)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {totalStops} drop-off{totalStops !== 1 ? "s" : ""}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
        </div>

        <section className="grid grid-cols-2 gap-2 animate-rise" style={{ animationDelay: "70ms" }}>
          <PlanStat
            icon={<Car className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Driver"
            value={ridePlan.driverName.trim() || "Me"}
            detail={formatRideSchedule(ridePlan)}
          />
          <PlanStat
            icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Seats"
            value={`${filledSeats}/${ridePlan.seatsAvailable} filled`}
            detail={remainingSeats > 0 ? `${remainingSeats} open` : "Full route"}
          />
          <PlanStat
            icon={<Bell className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Reminder"
            value={
              ridePlan.reminderMinutes > 0
                ? `${ridePlan.reminderMinutes} min before`
                : "No reminder"
            }
            detail={formatRepeat(ridePlan.repeat)}
          />
          <PlanStat
            icon={<Leaf className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Impact"
            value={
              potentialSoloMilesAvoided > 0
                ? `${potentialSoloMilesAvoided.toFixed(1)} solo mi`
                : `${totalStops} riders`
            }
            detail="potentially avoided"
          />
        </section>

        {driverNote && (
          <section
            className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3 animate-rise"
            style={{ animationDelay: "70ms" }}
          >
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
              <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
              Driver note
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-100">
              {driverNote}
            </p>
          </section>
        )}

        <section
          className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 animate-rise"
          style={{ animationDelay: "71ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Trip execution
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {progressSummary.status === "complete"
                  ? "Route fully checked off"
                  : progressSummary.status === "in-progress"
                    ? "Route is in progress"
                    : "Route is staged"}
              </p>
            </div>
            <span className="rounded-full bg-emerald-300/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100">
              {progressSummary.completedChecklist + progressSummary.completedStops}/
              {progressSummary.totalChecklist + progressSummary.totalStops} complete
            </span>
          </div>
          {(progressSummary.completedChecklist > 0 || progressSummary.completedStops > 0) && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onResetProgress ?? (() => onProgressChange(resetSavedRouteProgress()))}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200/15 bg-slate-950/30 px-3 text-[11px] font-bold text-emerald-50 transition hover:bg-slate-900/60"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset progress
              </button>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TimingPill
              label="Prep"
              value={`${progressSummary.completedChecklist}/${progressSummary.totalChecklist} done`}
            />
            <TimingPill
              label="Drop-offs"
              value={`${progressSummary.completedStops}/${progressSummary.totalStops} done`}
            />
          </div>
        </section>

        {schedule && (
          <section
            className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 animate-rise"
            style={{ animationDelay: "72ms" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-200">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  Timing plan
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Arrive {formatScheduleDateTime(schedule.arrivalAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={addToCalendar}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200/20 bg-slate-950/35 px-3 text-xs font-bold text-violet-50 transition hover:bg-slate-900/60"
              >
                <CalendarPlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                Calendar
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <TimingPill
                label="Leave by"
                value={schedule.departAt ? formatScheduleTime(schedule.departAt) : "When ready"}
              />
              <TimingPill
                label="Reminder"
                value={schedule.reminderAt ? formatScheduleTime(schedule.reminderAt) : "Off"}
              />
              <TimingPill label="Repeat" value={formatRepeat(ridePlan.repeat)} />
            </div>
            {scheduleStatus && (
              <div
                className={
                  "mt-3 rounded-xl border px-3 py-2 text-xs " +
                  (scheduleStatus.tone === "late"
                    ? "border-rose-300/20 bg-rose-400/10 text-rose-50"
                    : scheduleStatus.tone === "depart"
                      ? "border-amber-300/20 bg-amber-400/10 text-amber-50"
                      : scheduleStatus.tone === "reminder"
                        ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-50"
                        : "border-white/10 bg-slate-950/25 text-slate-200")
                }
              >
                <div className="font-bold uppercase tracking-wide">{scheduleStatus.headline}</div>
                <div className="mt-0.5 text-[11px] opacity-80">{scheduleStatus.detail}</div>
              </div>
            )}
          </section>
        )}

        <section
          className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3 animate-rise"
          style={{ animationDelay: "74ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Driver brief
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Share the route, timing, riders, and prep list in one message.
              </p>
            </div>
            <button
              type="button"
              onClick={copyRideBrief}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/20 bg-slate-950/35 px-3 text-xs font-bold text-cyan-50 transition hover:bg-slate-900/60"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {briefCopied ? "Copied" : "Copy brief"}
            </button>
          </div>
          <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/40 p-3 text-[11px] leading-5 text-slate-200">
            {rideBrief}
          </pre>
        </section>

        {ridePlan.checklist.length > 0 && (
          <section className="space-y-2 animate-rise" style={{ animationDelay: "75ms" }}>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Pre-drive checklist
              </p>
              <span className="text-[10px] text-slate-500">tap as prep is complete</span>
            </div>
            <div className="grid gap-1.5">
              {ridePlan.checklist.map((item, index) => {
                const key = `${index}:${item}`;
                const confirmed = progress.completedChecklistKeys.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePrep(index, item)}
                    className={
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition " +
                      (confirmed
                        ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-50"
                        : "border-white/10 bg-slate-800/35 text-slate-200 hover:border-cyan-300/25 hover:bg-slate-800/65")
                    }
                  >
                    <span
                      className={
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black " +
                        (confirmed ? "bg-cyan-300 text-slate-950" : "bg-slate-700 text-slate-200")
                      }
                    >
                      {confirmed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{item}</span>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide">
                      {confirmed ? "done" : "prep"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {totalStops > 0 && (
          <section className="space-y-2 animate-rise" style={{ animationDelay: "80ms" }}>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Drop-off checklist
              </p>
              <span className="text-[10px] text-slate-500">tap as each rider is done</span>
            </div>
            <div className="grid gap-1.5">
              {optimized.orderedStops.map((stop, index) => {
                const key = `${index}:${stop}`;
                const confirmed = progress.completedStopKeys.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleConfirmed(index, stop)}
                    className={
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition " +
                      (confirmed
                        ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-50"
                        : "border-white/10 bg-slate-800/35 text-slate-200 hover:border-emerald-300/25 hover:bg-slate-800/65")
                    }
                  >
                    <span
                      className={
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black " +
                        (confirmed ? "bg-emerald-300 text-slate-950" : "bg-slate-700 text-slate-200")
                      }
                    >
                      {confirmed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {riderNames?.[index] || `Stop ${index + 1}`}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">{stop}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide">
                      {confirmed ? "done" : "drop off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {routeOptions.length > 0 && (
          <div className="space-y-2 animate-rise" style={{ animationDelay: "85ms" }}>
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
                const routeTag = getRouteTag(index, option, routeOptions, routePreferences);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectRoute(index)}
                    className={
                      "group flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition " +
                      (selected
                        ? "border-cyan-300/50 bg-cyan-400/15 shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                        : "border-white/10 bg-slate-800/40 hover:border-cyan-300/30 hover:bg-slate-800/70")
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black " +
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
                        <span className="mt-1 flex flex-wrap gap-1">
                          {routeTag.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      </span>
                    </span>
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                        (selected
                          ? "bg-cyan-300 text-slate-950"
                          : "bg-white/5 text-slate-400 group-hover:text-cyan-200")
                      }
                    >
                      {selected ? "shown" : "preview"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <section className="rounded-xl border border-white/10 bg-slate-800/30 p-3 animate-rise">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Route preferences
          </p>
          <div className="flex flex-wrap gap-1.5">
            <PreferencePill active label={routePreferences.intent} />
            <PreferencePill active={routePreferences.avoidTolls} label="avoid tolls" />
            <PreferencePill active={routePreferences.avoidHighways} label="avoid highways" />
            <PreferencePill active={routePreferences.avoidFerries} label="avoid ferries" />
            <PreferencePill
              active={routePreferences.avoidReportedHazards}
              label="driver caution"
            />
          </div>
        </section>

        {/* Timeline */}
        <ol className="space-y-0">
          <TimelineStop
            tone="start"
            index="S"
            label="Start"
            address={start}
            isLast={false}
            animDelay={100}
          />
          {optimized.orderedStops.map((stop, i) => (
            <TimelineStop
              key={`${stop}-${i}`}
              tone="stop"
              index={String(i + 1)}
              label={riderNames?.[i] ?? `Stop ${i + 1}`}
              address={stop}
              leg={legs?.[i]}
              cumulativeSecs={cumulativeSecs[i]}
              isLast={false}
              animDelay={100 + (i + 1) * 55}
            />
          ))}
          <TimelineStop
            tone="end"
            index="E"
            label="End"
            address={end}
            leg={legs?.[legs.length - 1]}
            cumulativeSecs={cumulativeSecs[cumulativeSecs.length - 1]}
            isLast
            animDelay={100 + (totalStops + 1) * 55}
          />
        </ol>

        {copyFallbackVisible && (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Copy blocked — select manually
            </p>
            <textarea
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-950/60 p-2 text-xs text-slate-200 outline-none focus:border-blue-400"
            />
          </div>
        )}

        {optimized.source === "mock" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
            Demo mode — Google Maps will calculate the driving route. Add an OpenRouteService API key for in-app optimized order, ETA, mileage, and route line.
          </div>
        )}
      </div>

      {/* Sticky CTA — suppressed in chromeless (mobile cockpit) mode; the pinned CommandBar owns these actions */}
      {!chromeless && (
      <div className="sticky bottom-0 -mx-1 mt-3 border-t border-white/10 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/70 px-1 pt-3 pb-1 backdrop-blur">
        <Button
          variant="success"
          size="lg"
          fullWidth
          aria-label="Open optimized route in Google Maps"
          onClick={openInMaps}
        >
          <Navigation className="h-5 w-5" aria-hidden="true" />
          Open in Google Maps
        </Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={copy}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? "Copied!" : "Copy link"}
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

function PreferencePill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={
        "rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ring-1 " +
        (active
          ? "bg-cyan-300/15 text-cyan-100 ring-cyan-200/20"
          : "bg-slate-950/30 text-slate-600 ring-white/5")
      }
    >
      {label}
    </span>
  );
}

function TimingPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function getRouteTag(
  index: number,
  option: RouteOption,
  options: RouteOption[],
  preferences: RoutePreferences
): string[] {
  const tags: string[] = [];
  const bestEta = Math.min(...options.map((entry) => entry.etaSeconds));
  const shortest = Math.min(...options.map((entry) => entry.distanceMeters));

  if (option.etaSeconds === bestEta) tags.push("best eta");
  if (option.distanceMeters === shortest) tags.push("shortest");
  if (tags.length === 0) {
    tags.push(index === 0 ? "primary" : "alternate");
  }
  if (preferences.intent === "balanced" && index > 0) tags.push("compare option");
  if (preferences.intent === "alternate" && index > 0) tags.push("preference match");
  if (preferences.avoidReportedHazards) tags.push("driver caution saved");
  return tags;
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

function formatRideSchedule(plan: RidePlan): string {
  const date = plan.rideDate ? formatDate(plan.rideDate) : "Date not set";
  const time = plan.arrivalTime ? `by ${formatTime(plan.arrivalTime)}` : "time not set";
  return `${date}, ${time}`;
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

function formatRepeat(value: RideRepeat): string {
  switch (value) {
    case "daily":
      return "Repeats daily";
    case "weekdays":
      return "Repeats weekdays";
    case "weekly":
      return "Repeats weekly";
    case "none":
      return "One-time ride";
  }
}

function TimelineStop({
  tone,
  index,
  label,
  address,
  leg,
  cumulativeSecs,
  isLast,
  animDelay,
}: {
  tone: "start" | "stop" | "end";
  index: string;
  label: string;
  address: string;
  leg?: RouteLeg;
  cumulativeSecs?: number;
  isLast: boolean;
  animDelay: number;
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

  const arrivalLabel =
    tone !== "start" && cumulativeSecs != null ? formatEta(cumulativeSecs) : null;

  return (
    <li
      className="relative flex gap-3 pb-3 animate-rise"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Vertical connector drawn from bottom of circle to bottom of li */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-slate-500/50 to-slate-700/10" />
      )}

      {/* Circle marker */}
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${circleClass}`}
      >
        {index}
      </div>

      {/* Content card */}
      <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 ${cardClass}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {hasRiderName && (
                <User className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span className="truncate text-xs font-semibold text-slate-200">{label}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] leading-4 text-slate-400">{address}</p>
          </div>
          {arrivalLabel && (
            <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300 ring-1 ring-violet-500/25">
              +{arrivalLabel}
            </span>
          )}
        </div>

        {leg && (
          <div className="mt-2 flex flex-wrap gap-1.5">
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
