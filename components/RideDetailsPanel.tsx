"use client";

import {
  Bell,
  CalendarClock,
  CarFront,
  Plus,
  Repeat,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import type { RidePlan, RideRepeat } from "@/lib/types";

const repeatOptions: Array<{ value: RideRepeat; label: string }> = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
];

const reminderOptions = [
  { value: 0, label: "No reminder" },
  { value: 10, label: "10 min before" },
  { value: 20, label: "20 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
];

export function RideDetailsPanel({
  value,
  onChange,
  disabled,
}: {
  value: RidePlan;
  onChange: (next: RidePlan) => void;
  disabled?: boolean;
}) {
  function update<K extends keyof RidePlan>(key: K, nextValue: RidePlan[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  function updateChecklistItem(index: number, nextValue: string) {
    update(
      "checklist",
      value.checklist.map((item, itemIndex) => (itemIndex === index ? nextValue : item))
    );
  }

  function addChecklistItem() {
    update("checklist", [...value.checklist, ""]);
  }

  function removeChecklistItem(index: number) {
    const nextChecklist = value.checklist.filter((_, itemIndex) => itemIndex !== index);
    update("checklist", nextChecklist.length > 0 ? nextChecklist : [""]);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Ride details
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Schedule, driver, seats, reminders</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/20">
          reusable
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <CarFront className="h-3 w-3" aria-hidden="true" />
            Driver
          </span>
          <input
            type="text"
            value={value.driverName}
            onChange={(e) => update("driverName", e.target.value)}
            disabled={disabled}
            placeholder="Me"
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          />
        </label>

        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Users className="h-3 w-3" aria-hidden="true" />
            Seats
          </span>
          <input
            type="number"
            min={1}
            max={8}
            value={value.seatsAvailable}
            onChange={(e) =>
              update("seatsAvailable", Math.min(8, Math.max(1, Number(e.target.value) || 1)))
            }
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Date</span>
          <input
            type="date"
            value={value.rideDate}
            onChange={(e) => update("rideDate", e.target.value)}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Arrive by</span>
          <input
            type="time"
            value={value.arrivalTime}
            onChange={(e) => update("arrivalTime", e.target.value)}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          />
        </label>

        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Repeat className="h-3 w-3" aria-hidden="true" />
            Repeat
          </span>
          <select
            value={value.repeat}
            onChange={(e) => update("repeat", e.target.value as RideRepeat)}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          >
            {repeatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Bell className="h-3 w-3" aria-hidden="true" />
            Reminder
          </span>
          <select
            value={value.reminderMinutes}
            onChange={(e) => update("reminderMinutes", Number(e.target.value))}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          >
            {reminderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block space-y-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <StickyNote className="h-3 w-3" aria-hidden="true" />
          Driver note
        </span>
        <textarea
          value={value.driverNote ?? ""}
          onChange={(e) => update("driverNote", e.target.value)}
          disabled={disabled}
          maxLength={280}
          rows={3}
          placeholder="Gate code, pickup lane, or handoff detail"
          className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
        />
      </label>

      <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Pre-drive checklist
            </p>
            <p className="text-xs text-slate-500">Keep the driver workflow reusable and visible.</p>
          </div>
          <button
            type="button"
            onClick={addChecklistItem}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/15 px-2 py-1 text-[11px] font-bold text-cyan-100 ring-1 ring-cyan-300/25 transition hover:bg-cyan-400/25 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add item
          </button>
        </div>
        <div className="space-y-2">
          {value.checklist.map((item, index) => (
            <div key={`${index}-${item}`} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-300">
                {index + 1}
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => updateChecklistItem(index, e.target.value)}
                disabled={disabled}
                placeholder="Add a prep step"
                className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => removeChecklistItem(index)}
                disabled={disabled}
                aria-label={`Remove checklist item ${index + 1}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
