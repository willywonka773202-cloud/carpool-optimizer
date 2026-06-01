"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListOrdered,
  Plus,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { LocationInput } from "@/components/LocationInput";
import { WaypointList } from "@/components/WaypointList";
import type { Coord } from "@/lib/orsTypes";
import type { Suggestion } from "@/lib/orsAutocomplete";

const UNDO_WINDOW_MS = 5000;

type SharedProps = {
  waypoints: string[];
  riderNames: (string | null)[];
  showRiderNames: boolean;
  onToggleRiderNames: (checked: boolean) => void;
  disabled?: boolean;
  apiKey: string | null;
  onChangeStop: (index: number, value: string) => void;
  onPickStop: (index: number, coord: Coord | null) => void;
  onChangeRider: (index: number, value: string | null) => void;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onRestoreStop: (index: number, address: string, riderName?: string | null) => void;
};

type StepperProps = SharedProps & {
  density: "compact";
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

type ListProps = SharedProps & {
  density?: "default";
  onPickSuggestion: (index: number, suggestion: Suggestion) => void;
};

/**
 * Stops editor shared by desktop (full WaypointList) and the mobile BUILD stage
 * (single-stop stepper that pairs with the map's active-stop highlight). The compact
 * stepper exposes the same stop-management affordances as the desktop list — reorder,
 * duplicate, and undo-after-remove — so nothing regresses on mobile.
 */
export function StopsEditor(props: StepperProps | ListProps) {
  const filledCount = props.waypoints.filter((s) => s.trim()).length;

  // Undo-after-remove for the compact stepper (the desktop WaypointList has its own banner).
  const [removed, setRemoved] = useState<{
    index: number;
    address: string;
    riderName: string | null;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    []
  );
  function clearUndo() {
    setRemoved(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  const RiderToggle = (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-300">
      <input
        type="checkbox"
        checked={props.showRiderNames}
        onChange={(e) => props.onToggleRiderNames(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900/60 text-blue-500 focus:ring-blue-500/40"
      />
      <Users className="h-3.5 w-3.5" aria-hidden="true" /> Names
    </label>
  );

  if (props.density === "compact") {
    const { waypoints, activeIndex, onActiveIndexChange } = props;
    const index = Math.min(Math.max(activeIndex, 0), Math.max(waypoints.length - 1, 0));

    function removeActive() {
      const snapshot = {
        index,
        address: waypoints[index] ?? "",
        riderName: props.riderNames[index] ?? null,
      };
      props.onRemoveStop(index);
      setRemoved(snapshot);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(clearUndo, UNDO_WINDOW_MS);
    }
    function undoRemove() {
      if (!removed) return;
      props.onRestoreStop(removed.index, removed.address, removed.riderName);
      onActiveIndexChange(removed.index);
      clearUndo();
    }

    return (
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-2">
        <div className="flex h-8 items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 truncate text-xs font-bold text-slate-100">
            <ListOrdered className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            Stop {index + 1} of {waypoints.length}
            <span className="font-medium text-slate-500">· {filledCount} set</span>
          </p>
          {RiderToggle}
        </div>
        <LocationInput
          label={`Stop ${index + 1}`}
          value={waypoints[index] ?? ""}
          apiKey={props.apiKey}
          density="compact"
          onChange={(value) => props.onChangeStop(index, value)}
          onPreview={(coord) => props.onPickStop(index, coord)}
          onPick={(suggestion) => props.onPickStop(index, suggestion.coord)}
          disabled={props.disabled}
        />
        <div className="flex min-h-0 flex-col gap-2">
          {props.showRiderNames && (
            <input
              type="text"
              value={props.riderNames[index] ?? ""}
              disabled={props.disabled}
              placeholder="Rider name"
              aria-label={`Rider name for stop ${index + 1}`}
              onChange={(e) => props.onChangeRider(index, e.target.value || null)}
              className="h-9 min-w-0 rounded-lg border border-white/10 bg-slate-950/40 px-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          )}
          <div className="grid grid-cols-3 gap-2">
            <StepBtn
              label="Move stop up"
              disabled={props.disabled || index === 0}
              onClick={() => props.onMoveUp(index)}
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> Up
            </StepBtn>
            <StepBtn
              label="Move stop down"
              disabled={props.disabled || index >= waypoints.length - 1}
              onClick={() => props.onMoveDown(index)}
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> Down
            </StepBtn>
            <StepBtn
              label="Duplicate stop"
              disabled={props.disabled}
              onClick={() => props.onDuplicate(index)}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
            </StepBtn>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StepBtn
              label="Previous stop"
              disabled={index === 0}
              onClick={() => onActiveIndexChange(Math.max(index - 1, 0))}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Prev
            </StepBtn>
            <StepBtn
              label="Next stop"
              disabled={index >= waypoints.length - 1}
              onClick={() => onActiveIndexChange(Math.min(index + 1, waypoints.length - 1))}
            >
              Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </StepBtn>
            <StepBtn label="Add stop" tone="cyan" disabled={props.disabled} onClick={props.onAddStop}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add stop
            </StepBtn>
            <StepBtn
              label="Remove stop"
              tone="red"
              disabled={props.disabled || waypoints.length <= 1}
              onClick={removeActive}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </StepBtn>
          </div>
          {removed && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 animate-rise"
            >
              <span className="min-w-0 truncate">
                Removed {removed.address ? `"${removed.address}"` : "empty stop"}.
              </span>
              <button
                type="button"
                onClick={undoRemove}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <Undo2 className="h-3 w-3" aria-hidden="true" /> Undo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop / default: full waypoint list with reorder, duplicate, undo.
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">{RiderToggle}</div>
      <WaypointList
        apiKey={props.apiKey}
        waypoints={props.waypoints}
        riderNames={props.riderNames}
        disabled={props.disabled}
        showRiderNames={props.showRiderNames}
        onAdd={props.onAddStop}
        onRemove={props.onRemoveStop}
        onRestore={props.onRestoreStop}
        onChange={props.onChangeStop}
        onPreviewSuggestion={props.onPickStop}
        onPickSuggestion={props.onPickSuggestion}
        onChangeRider={props.onChangeRider}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
        onDuplicate={props.onDuplicate}
      />
    </div>
  );
}

function StepBtn({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "cyan" | "red";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "cyan"
      ? "text-cyan-100 ring-cyan-300/25 hover:bg-cyan-400/10"
      : tone === "red"
        ? "text-red-200 ring-red-300/20 hover:bg-red-500/10"
        : "text-slate-200 ring-white/10 hover:bg-white/5";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={
        "flex h-9 items-center justify-center gap-1 rounded-lg text-xs font-semibold ring-1 transition disabled:opacity-35 " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 " +
        toneClass
      }
    >
      {children}
    </button>
  );
}
