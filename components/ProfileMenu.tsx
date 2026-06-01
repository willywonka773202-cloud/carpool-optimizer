"use client";

import { CarFront, Check, Home, Pencil, RefreshCw, Route, Trash2, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  clearTripDefaults,
  deleteRiderGroup,
  getProfile,
  renameRiderGroup,
  saveRiderGroup,
  saveTripDefaults,
  setHomeAddress,
  updateRiderGroup,
  type CarpoolProfile,
  type SavedRiderGroup,
} from "@/lib/profileStorage";
import type { RidePlan, RoutePreferences } from "@/lib/types";

export function ProfileMenu({
  start,
  stops,
  riderNames,
  ridePlan,
  routePreferences,
  onUseHome,
  onLoadGroup,
  onApplyTripDefaults,
}: {
  start: string;
  stops: string[];
  riderNames: (string | null)[];
  ridePlan: RidePlan;
  routePreferences: RoutePreferences;
  onUseHome: (address: string) => void;
  onLoadGroup: (group: SavedRiderGroup) => void;
  onApplyTripDefaults: (source: CarpoolProfile["tripDefaults"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<CarpoolProfile>({ groups: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  function refresh() {
    setProfile(getProfile());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function saveHome() {
    setProfile(setHomeAddress(start));
  }

  function saveGroup() {
    const cleanStops = stops.map((stop) => stop.trim()).filter(Boolean);
    if (cleanStops.length === 0) return;
    const group = saveRiderGroup({
      label: cleanStops.length === 1 ? cleanStops[0] : `${cleanStops.length} riders`,
      stops: cleanStops,
      riderNames,
    });
    setProfile((cur) => ({ ...cur, groups: [group, ...cur.groups] }));
  }

  function syncGroup(group: SavedRiderGroup) {
    const cleanStops = stops.map((stop) => stop.trim()).filter(Boolean);
    if (cleanStops.length === 0) return;
    setProfile(
      updateRiderGroup(group.id, {
        stops: cleanStops,
        riderNames,
      })
    );
  }

  function handleSaveTripDefaults() {
    setProfile(
      saveTripDefaults({
        driverName: ridePlan.driverName,
        seatsAvailable: ridePlan.seatsAvailable,
        reminderMinutes: ridePlan.reminderMinutes,
        repeat: ridePlan.repeat,
        checklist: ridePlan.checklist,
        routePreferences,
      })
    );
  }

  function startRename(group: SavedRiderGroup) {
    setEditingId(group.id);
    setEditValue(group.label);
  }

  function commitRename() {
    if (!editingId) return;
    setProfile(renameRiderGroup(editingId, editValue));
    setEditingId(null);
    setEditValue("");
  }

  const hasStops = stops.some((stop) => stop.trim());

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Driver profile"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-cyan-100 ring-1 ring-cyan-300/25 transition hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl animate-rise">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                Driver profile
              </p>
              <p className="text-xs text-slate-500">Home + regular riders</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close profile"
              className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
            <div className="flex items-start gap-2">
              <Home className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-50">Home</p>
                <p className="mt-0.5 truncate text-[11px] text-emerald-100/80">
                  {profile.homeAddress ?? "No home saved yet"}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!start.trim()}
                onClick={saveHome}
                className="rounded-lg bg-emerald-500/20 px-2 py-1.5 text-xs font-semibold text-emerald-50 ring-1 ring-emerald-300/25 transition hover:bg-emerald-500/30 disabled:opacity-40"
              >
                Save current
              </button>
              <button
                type="button"
                disabled={!profile.homeAddress}
                onClick={() => {
                  if (profile.homeAddress) onUseHome(profile.homeAddress);
                  setOpen(false);
                }}
                className="rounded-lg bg-slate-950/35 px-2 py-1.5 text-xs font-semibold text-emerald-50 ring-1 ring-emerald-300/20 transition hover:bg-slate-950/50 disabled:opacity-40"
              >
                Use home
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
            <div className="flex items-start gap-2">
              <CarFront className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-cyan-50">Trip defaults</p>
                {profile.tripDefaults ? (
                  <div className="mt-1 space-y-1 text-[11px] text-cyan-100/80">
                    <p className="truncate">
                      {profile.tripDefaults.driverName.trim() || "Unnamed driver"} ·{" "}
                      {profile.tripDefaults.seatsAvailable} seats
                    </p>
                    <p className="truncate">
                      {profile.tripDefaults.reminderMinutes > 0
                        ? `${profile.tripDefaults.reminderMinutes} min reminder`
                        : "No reminder"}{" "}
                      · {profile.tripDefaults.repeat}
                    </p>
                    <p className="truncate">
                      {profile.tripDefaults.checklist.length} prep step
                      {profile.tripDefaults.checklist.length === 1 ? "" : "s"} ·{" "}
                      {profile.tripDefaults.routePreferences.intent} route
                    </p>
                  </div>
                ) : (
                  <p className="mt-0.5 text-[11px] text-cyan-100/80">
                    Save your driver setup and route style for new carpools.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveTripDefaults}
                className="rounded-lg bg-cyan-500/20 px-2 py-1.5 text-xs font-semibold text-cyan-50 ring-1 ring-cyan-300/25 transition hover:bg-cyan-500/30"
              >
                Save current
              </button>
              <button
                type="button"
                disabled={!profile.tripDefaults}
                onClick={() => {
                  onApplyTripDefaults(profile.tripDefaults);
                  setOpen(false);
                }}
                className="rounded-lg bg-slate-950/35 px-2 py-1.5 text-xs font-semibold text-cyan-50 ring-1 ring-cyan-300/20 transition hover:bg-slate-950/50 disabled:opacity-40"
              >
                Use defaults
              </button>
            </div>
            {profile.tripDefaults && (
              <button
                type="button"
                onClick={() => setProfile(clearTripDefaults())}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-red-300"
              >
                <Route className="h-3 w-3" aria-hidden="true" />
                Clear saved defaults
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Rider groups
            </p>
            <button
              type="button"
              disabled={!hasStops}
              onClick={saveGroup}
              className="rounded-lg bg-cyan-400/15 px-2 py-1 text-[11px] font-bold text-cyan-100 ring-1 ring-cyan-300/25 transition hover:bg-cyan-400/25 disabled:opacity-40"
            >
              Save current
            </button>
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/35">
            {profile.groups.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-slate-500">
                Save a carpool group to reuse the same people.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {profile.groups.map((group) => (
                  <li key={group.id} className="p-2">
                    {editingId === group.id ? (
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950/80 px-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                        />
                        <button
                          type="button"
                          aria-label="Save group name"
                          onClick={commitRename}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-300 hover:bg-emerald-500/15"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadGroup(group);
                            setOpen(false);
                          }}
                          className="block min-w-0 w-full rounded-lg px-2 py-1 text-left transition hover:bg-white/5"
                        >
                          <span className="block truncate text-sm font-bold text-slate-100">
                            {group.label}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {group.stops.length} stop{group.stops.length === 1 ? "" : "s"}
                            {group.riderNames?.some((name) => name?.trim())
                              ? ` · ${group.riderNames.filter((name) => name?.trim()).length} named`
                              : ""}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 px-2">
                          <button
                            type="button"
                            disabled={!hasStops}
                            aria-label={`Update ${group.label} from current route`}
                            onClick={() => syncGroup(group)}
                            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-cyan-100 ring-1 ring-cyan-300/20 transition hover:bg-cyan-400/10 disabled:opacity-40"
                          >
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            Sync current
                          </button>
                          <button
                            type="button"
                            aria-label={`Rename ${group.label}`}
                            onClick={() => startRename(group)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${group.label}`}
                            onClick={() => setProfile(deleteRiderGroup(group.id))}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
