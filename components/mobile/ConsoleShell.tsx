"use client";

import type { ReactNode } from "react";

/**
 * The fixed mobile cockpit frame. Pure layout — it pins the map, status strip, stage rail
 * and command bar, and gives the stage body the single flexible region. Nothing here ever
 * causes page scroll: the only flexible region is `body`, and stages that overflow scroll
 * inside their own bounded card.
 *
 * Region order (top → bottom):
 *   1. MAP                         — pinned, height derived from stage
 *   2. STATUS STRIP                — pinned, glanceable
 *   3. STAGE BODY                  — flex-1, the only flexible region (optional sub-nav on top)
 *   4. STAGE RAIL + COMMAND BAR    — pinned at the bottom (thumb reach)
 *
 * `topOverlay` (the floating saved-routes / profile controls) is layered at the ROOT level,
 * above every region, so its dropdowns can extend past the short map region without being
 * clipped by the map's overflow-hidden.
 */
export function ConsoleShell({
  mapDvh,
  map,
  topOverlay,
  status,
  subNav,
  body,
  rail,
  commandBar,
}: {
  mapDvh: number;
  map: ReactNode;
  topOverlay?: ReactNode;
  status: ReactNode;
  subNav?: ReactNode;
  body: ReactNode;
  rail: ReactNode;
  commandBar: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Region 1 — map (isolated stacking context; clips its own tiles during height changes) */}
      <div
        className="relative isolate shrink-0 overflow-hidden transition-[height] duration-300 ease-out-quint"
        style={{ height: `${mapDvh}dvh` }}
      >
        {map}
        <div className="map-vignette pointer-events-none absolute inset-0 z-[5]" />
      </div>

      {/* Region 2 — status strip */}
      <div className="shrink-0 px-2.5 pt-2">{status}</div>

      {/* Region 3 — stage body (only flexible region). overflow-y-auto so an open
          address-autocomplete dropdown stays reachable via a bounded scroll instead of
          being hard-clipped; static content fits and does not scroll. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-2.5 pt-2">
        {subNav && <div className="shrink-0">{subNav}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{body}</div>
      </div>

      {/* Region 4 — stage rail + command bar, a pinned glass dock */}
      <div className="shrink-0 px-2.5 pb-safe pt-2">
        <div className="glass space-y-2 rounded-2xl p-2">
          {rail}
          {commandBar}
        </div>
      </div>

      {/* Floating controls layered above all regions so dropdowns aren't clipped by the map. */}
      {topOverlay && (
        <div className="pointer-events-none absolute inset-0 z-[1002]">{topOverlay}</div>
      )}
    </div>
  );
}
