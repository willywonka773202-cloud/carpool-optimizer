"use client";

import { ArrowDown, ArrowUp, Copy as CopyIcon, Minus, Plus, Undo2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type RemovedSnapshot = {
  index: number;
  address: string;
  riderName?: string | null;
  shownAt: number;
};

const UNDO_WINDOW_MS = 5000;

export function WaypointList({
  waypoints,
  riderNames,
  disabled,
  onAdd,
  onRemove,
  onChange,
  onRestore,
  onChangeRider,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  showRiderNames = false,
}: {
  waypoints: string[];
  riderNames?: (string | null)[];
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  onRestore?: (index: number, address: string, riderName?: string | null) => void;
  onChangeRider?: (index: number, value: string | null) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDuplicate?: (index: number) => void;
  showRiderNames?: boolean;
}) {
  const [removed, setRemoved] = useState<RemovedSnapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearUndoBanner() {
    setRemoved(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleRemove(index: number) {
    const snapshot: RemovedSnapshot = {
      index,
      address: waypoints[index] ?? "",
      riderName: riderNames?.[index] ?? null,
      shownAt: Date.now(),
    };
    onRemove(index);
    if (onRestore) {
      setRemoved(snapshot);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(clearUndoBanner, UNDO_WINDOW_MS);
    }
  }

  function handleUndo() {
    if (!removed || !onRestore) return;
    onRestore(removed.index, removed.address, removed.riderName ?? null);
    clearUndoBanner();
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Drop-off stops
          </p>
          <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
            {waypoints.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-800/80 px-3 text-xs font-semibold text-slate-100 ring-1 ring-white/10 transition hover:bg-slate-700/80 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add stop
        </button>
      </div>

      <div className="space-y-2">
        {waypoints.map((wp, i) => {
          const last = i === waypoints.length - 1;
          const first = i === 0;
          const rider = riderNames?.[i] ?? "";
          return (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-slate-900/40 p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-sm font-bold text-blue-200 ring-1 ring-blue-400/20"
                >
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={wp}
                  disabled={disabled}
                  placeholder={`Stop ${i + 1} address`}
                  aria-label={`Stop ${i + 1} address`}
                  onChange={(e) => onChange(i, e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  aria-label={`Remove stop ${i + 1}`}
                  onClick={() => handleRemove(i)}
                  disabled={disabled}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 ring-1 ring-white/10 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {showRiderNames && onChangeRider && (
                <div className="mt-2 flex items-center gap-2 pl-11">
                  <User className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={rider ?? ""}
                    disabled={disabled}
                    placeholder="Rider name (optional)"
                    aria-label={`Rider name for stop ${i + 1}`}
                    onChange={(e) => onChangeRider(i, e.target.value || null)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50"
                  />
                </div>
              )}

              {(onMoveUp || onMoveDown || onDuplicate) && (
                <div className="mt-2 flex items-center gap-1.5 pl-11">
                  {onMoveUp && (
                    <button
                      type="button"
                      aria-label={`Move stop ${i + 1} up`}
                      disabled={disabled || first}
                      onClick={() => onMoveUp(i)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" aria-hidden="true" /> Up
                    </button>
                  )}
                  {onMoveDown && (
                    <button
                      type="button"
                      aria-label={`Move stop ${i + 1} down`}
                      disabled={disabled || last}
                      onClick={() => onMoveDown(i)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" aria-hidden="true" /> Down
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      type="button"
                      aria-label={`Duplicate stop ${i + 1}`}
                      disabled={disabled}
                      onClick={() => onDuplicate(i)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-30"
                    >
                      <CopyIcon className="h-3 w-3" aria-hidden="true" /> Duplicate
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {removed && onRestore && (
        <div
          role="status"
          className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 animate-rise"
        >
          <span className="truncate">
            Removed {removed.address ? `"${removed.address}"` : "empty stop"}.
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-300 hover:bg-white/5"
          >
            <Undo2 className="h-3 w-3" aria-hidden="true" /> Undo
          </button>
        </div>
      )}
    </div>
  );
}
