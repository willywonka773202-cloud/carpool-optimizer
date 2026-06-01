"use client";

import {
  BellRing,
  CalendarClock,
  CalendarPlus2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Menu as MenuIcon,
  Pencil,
  Pin,
  Route,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { buildSavedRouteCalendarEvent } from "@/lib/calendar";
import { formatDistance, formatEta } from "@/lib/format";
import { summarizeSavedRouteProgress } from "@/lib/routeProgress";
import { buildSavedRouteBrief } from "@/lib/rideBrief";
import { filterSavedRoutes, type SavedRouteFilter } from "@/lib/savedRouteFilters";
import {
  formatScheduleDateTime,
  formatScheduleTime,
  getNextSavedRoute,
  listUpcomingSavedRoutes,
} from "@/lib/schedule";
import {
  deleteRoute,
  listSavedRoutes,
  recordRouteDrive,
  renameRoute,
  toggleRoutePin,
} from "@/lib/storage";
import type { SavedRoute } from "@/lib/types";

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString();
}

function formatPlanSummary(route: SavedRoute): string[] {
  const details: string[] = [];
  if (route.ridePlan?.driverName.trim()) details.push(route.ridePlan.driverName.trim());
  if (route.ridePlan?.rideDate) details.push(route.ridePlan.rideDate);
  if (route.ridePlan?.arrivalTime) details.push(`arrive ${route.ridePlan.arrivalTime}`);
  return details;
}

function getDriverNote(route: SavedRoute): string | null {
  const note = route.ridePlan?.driverNote?.trim();
  return note ? note : null;
}

function formatDriveHistory(route: SavedRoute): string | null {
  if (!route.driveCount || route.driveCount < 1) return null;

  const count = `${route.driveCount} drive${route.driveCount === 1 ? "" : "s"}`;
  return route.lastDrivenAt ? `${count} · last ${formatRelative(route.lastDrivenAt)}` : count;
}

function downloadCalendarEvent(route: SavedRoute): boolean {
  const ics = buildSavedRouteCalendarEvent(route);
  if (!ics) return false;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${route.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "carpool-plan"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
  return true;
}

async function copyRideBrief(route: SavedRoute): Promise<boolean> {
  const brief = buildSavedRouteBrief(route);

  try {
    if (!navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(brief);
    return true;
  } catch {
    window.prompt("Copy ride brief", brief);
    return false;
  }
}

function countChecklistItems(route: SavedRoute): number {
  return route.ridePlan?.checklist.filter((item) => item.trim()).length ?? 0;
}

function formatTimeUntil(date: Date): string {
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMinutes <= 1) return "now";
  if (diffMinutes < 60) return `in ${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes === 0 ? `in ${hours} h` : `in ${hours} h ${minutes} min`;
}

export function SavedRoutesMenu({ onLoad }: { onLoad: (r: SavedRoute) => void }) {
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [filter, setFilter] = useState<SavedRouteFilter>("all");
  const [query, setQuery] = useState("");

  function refresh() {
    setRoutes(listSavedRoutes());
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  function startRename(r: SavedRoute) {
    setEditingId(r.id);
    setEditValue(r.label);
  }

  function commitRename() {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed.length > 0) {
      renameRoute(editingId, trimmed);
      refresh();
    }
    setEditingId(null);
    setEditValue("");
  }

  function cancelRename() {
    setEditingId(null);
    setEditValue("");
  }

  const upcomingRoutes = listUpcomingSavedRoutes(routes);
  const nextUpcoming = upcomingRoutes[0];
  const nextUpcomingSchedule = nextUpcoming?.schedule ?? null;
  const nextReminder = upcomingRoutes
    .filter((entry) => entry.schedule.reminderAt)
    .sort(
      (a, b) =>
        (a.schedule.reminderAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.schedule.reminderAt?.getTime() ?? Number.POSITIVE_INFINITY)
    )[0];
  const nextDeparture = upcomingRoutes
    .filter((entry) => entry.schedule.departAt)
    .sort(
      (a, b) =>
        (a.schedule.departAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.schedule.departAt?.getTime() ?? Number.POSITIVE_INFINITY)
    )[0];
  const filteredRoutes = filterSavedRoutes(routes, filter, query);

  return (
    <div className="absolute left-3 top-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open saved routes"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 text-slate-100 shadow-lg ring-1 ring-white/10 backdrop-blur transition hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl animate-rise"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Saved routes
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close saved routes"
              className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {routes.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-slate-300">No saved routes yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Optimize a route and tap Save to reuse it later.
              </p>
            </div>
          ) : (
            <>
              {nextUpcoming && nextUpcomingSchedule && (
                <div className="mb-2 space-y-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                      Schedule queue
                    </p>
                    <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100">
                      {upcomingRoutes.length} upcoming
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ScheduleCard
                      icon={<BellRing className="h-3.5 w-3.5" aria-hidden="true" />}
                      label="Reminder"
                      title={
                        nextReminder?.schedule.reminderAt
                          ? formatScheduleTime(nextReminder.schedule.reminderAt)
                          : "Not set"
                      }
                      detail={
                        nextReminder?.schedule.reminderAt
                          ? `${nextReminder.route.label} ${formatTimeUntil(nextReminder.schedule.reminderAt)}`
                          : "No reminders"
                      }
                    />
                    <ScheduleCard
                      icon={<Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
                      label="Leave"
                      title={
                        nextDeparture?.schedule.departAt
                          ? formatScheduleTime(nextDeparture.schedule.departAt)
                          : "When ready"
                      }
                      detail={
                        nextDeparture?.schedule.departAt
                          ? nextDeparture.route.label
                          : "Missing ETA"
                      }
                    />
                    <ScheduleCard
                      icon={<Route className="h-3.5 w-3.5" aria-hidden="true" />}
                      label="Arrive"
                      title={formatScheduleTime(nextUpcomingSchedule.arrivalAt)}
                      detail={nextUpcoming.route.label}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onLoad(nextUpcoming.route);
                      setOpen(false);
                    }}
                    className="block w-full rounded-xl border border-cyan-200/15 bg-slate-950/35 px-3 py-2 text-left transition hover:bg-slate-900/70"
                  >
                    <div className="truncate text-sm font-semibold text-slate-100">
                      {nextUpcoming.route.label}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-cyan-100/85">
                      Arrive {formatScheduleDateTime(nextUpcomingSchedule.arrivalAt)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {nextUpcomingSchedule.reminderAt && (
                        <span className="rounded-full bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100">
                          remind {formatScheduleTime(nextUpcomingSchedule.reminderAt)}
                        </span>
                      )}
                      {nextUpcomingSchedule.departAt && (
                        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-100">
                          leave {formatScheduleTime(nextUpcomingSchedule.departAt)}
                        </span>
                      )}
                      {countChecklistItems(nextUpcoming.route) > 0 && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-100">
                          {countChecklistItems(nextUpcoming.route)} prep step
                          {countChecklistItems(nextUpcoming.route) === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              )}

              <div className="mb-2 flex flex-wrap gap-1 px-1">
                <FilterChip
                  label={`All ${routes.length}`}
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />
                <FilterChip
                  label={`Pinned ${routes.filter((route) => route.isPinned).length}`}
                  active={filter === "pinned"}
                  onClick={() => setFilter("pinned")}
                />
                <FilterChip
                  label={`Upcoming ${upcomingRoutes.length}`}
                  active={filter === "upcoming"}
                  onClick={() => setFilter("upcoming")}
                />
                <FilterChip
                  label={`Drafts ${
                    routes.filter(
                      (route) =>
                        typeof route.etaSeconds !== "number" &&
                        typeof route.distanceMeters !== "number"
                    ).length
                  }`}
                  active={filter === "drafts"}
                  onClick={() => setFilter("drafts")}
                />
                <FilterChip
                  label={`Driven ${
                    routes.filter((route) => route.driveCount && route.driveCount > 0).length
                  }`}
                  active={filter === "driven"}
                  onClick={() => setFilter("driven")}
                />
              </div>

              <div className="mb-2 px-1">
                <label className="block">
                  <span className="sr-only">Search saved routes</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search routes, riders, driver, notes, or repeat"
                    className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/45 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </label>
                <p className="mt-1 px-1 text-[10px] text-slate-500">
                  {filteredRoutes.length} result{filteredRoutes.length === 1 ? "" : "s"}
                </p>
              </div>

              <ul className="divide-y divide-white/5">
              {filteredRoutes.length === 0 ? (
                <li className="px-3 py-5 text-center text-xs text-slate-500">
                  {query.trim()
                    ? "No saved routes match this search yet."
                    : filter === "pinned"
                    ? "Pin a route to keep recurring drives at the top."
                    : filter === "upcoming"
                    ? "No saved routes have an upcoming schedule yet."
                    : filter === "driven"
                    ? "Record a completed drive to build route history."
                    : "No saved drafts yet."}
                </li>
              ) : filteredRoutes.map((r) => {
                const editing = editingId === r.id;
                const ts = r.updatedAt ?? r.createdAt;
                const schedule = getNextSavedRoute(r);
                const progress = summarizeSavedRouteProgress(r);
                const driverNote = getDriverNote(r);
                const driveHistory = formatDriveHistory(r);
                return (
                  <li key={r.id} className="flex items-start gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            aria-label="Route name"
                            className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                          />
                          <button
                            type="button"
                            onClick={commitRename}
                            aria-label="Save name"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-300 hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            aria-label="Cancel rename"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onLoad(r);
                            setOpen(false);
                          }}
                          className="block w-full rounded-md px-2 py-1 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <div className="flex items-center gap-2">
                            {r.isPinned && (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
                                <Pin className="h-3 w-3 fill-current" aria-hidden="true" />
                              </span>
                            )}
                            <span className="truncate text-sm font-semibold text-slate-100">
                              {r.label}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              {r.stops.length} stop{r.stops.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-400">
                            {r.start} → {r.end}
                          </div>
                          {(r.etaSeconds ||
                            r.distanceMeters ||
                            r.routePreferences ||
                            progress.status !== "staged" ||
                            driveHistory) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {typeof r.etaSeconds !== "number" && typeof r.distanceMeters !== "number" && (
                                <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100">
                                  draft
                                </span>
                              )}
                              {typeof r.etaSeconds === "number" && (
                                <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100">
                                  {formatEta(r.etaSeconds)}
                                </span>
                              )}
                              {typeof r.distanceMeters === "number" && (
                                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
                                  {formatDistance(r.distanceMeters)}
                                </span>
                              )}
                              {r.routePreferences && (
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
                                  {r.routePreferences.intent}
                                </span>
                              )}
                              <span
                                className={
                                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide " +
                                  (progress.status === "complete"
                                    ? "bg-emerald-500/10 text-emerald-100"
                                    : progress.status === "in-progress"
                                      ? "bg-amber-400/10 text-amber-100"
                                      : "bg-white/5 text-slate-300")
                                }
                              >
                                {progress.status === "complete"
                                  ? "complete"
                                  : progress.status === "in-progress"
                                    ? "in progress"
                                    : "staged"}
                              </span>
                              {driveHistory && (
                                <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-100">
                                  {driveHistory}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            {r.ridePlan?.repeat && r.ridePlan.repeat !== "none" ? (
                              <span className="mr-2 inline-flex items-center gap-1 text-cyan-300">
                                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                                {r.ridePlan.repeat}
                              </span>
                            ) : null}
                            {formatRelative(ts)}
                          </div>
                          {schedule?.isUpcoming && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {schedule.reminderAt && (
                                <span className="rounded-full bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100">
                                  remind {formatScheduleTime(schedule.reminderAt)}
                                </span>
                              )}
                              <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100">
                                arrive {formatScheduleDateTime(schedule.arrivalAt)}
                              </span>
                              {schedule.departAt && (
                                <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-100">
                                  leave {formatScheduleTime(schedule.departAt)}
                                </span>
                              )}
                            </div>
                          )}
                          {formatPlanSummary(r).length > 0 && (
                            <div className="mt-1 truncate text-[10px] text-slate-500">
                              {formatPlanSummary(r).join(" · ")}
                            </div>
                          )}
                          {driverNote && (
                            <div className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-cyan-100/80">
                              <StickyNote
                                className="mt-0.5 h-3 w-3 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 truncate">{driverNote}</span>
                            </div>
                          )}
                          {(countChecklistItems(r) > 0 || progress.totalStops > 0) && (
                            <div className="mt-1 text-[10px] text-slate-500">
                              {progress.completedChecklist}/{progress.totalChecklist} prep done ·{" "}
                              {progress.completedStops}/{progress.totalStops} drop-offs done
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                    {!editing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            toggleRoutePin(r.id);
                            refresh();
                          }}
                          aria-label={r.isPinned ? `Unpin ${r.label}` : `Pin ${r.label}`}
                          className={
                            "flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
                            (r.isPinned
                              ? "text-amber-200 hover:bg-amber-500/15"
                              : "text-slate-400 hover:bg-white/5 hover:text-amber-200")
                          }
                        >
                          <Pin className={"h-3.5 w-3.5" + (r.isPinned ? " fill-current" : "")} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordRouteDrive(r.id);
                            refresh();
                          }}
                          aria-label={`Record completed drive for ${r.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void copyRideBrief(r);
                          }}
                          aria-label={`Copy ${r.label} driver brief`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadCalendarEvent(r)}
                          aria-label={`Export ${r.label} calendar event`}
                          disabled={!r.ridePlan}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-30"
                        >
                          <CalendarPlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(r)}
                          aria-label={`Rename ${r.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteRoute(r.id);
                            refresh();
                          }}
                          aria-label={`Delete ${r.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition " +
        (active
          ? "bg-cyan-300 text-slate-950"
          : "bg-slate-950/50 text-slate-400 ring-1 ring-white/10 hover:text-slate-100")
      }
    >
      {label}
    </button>
  );
}

function ScheduleCard({
  icon,
  label,
  title,
  detail,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/35 p-2">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100/80">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-bold text-slate-100">{title}</div>
      <div className="mt-0.5 text-[10px] leading-4 text-slate-400">{detail}</div>
    </div>
  );
}
