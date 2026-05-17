"use client";

import { LocateFixed, Loader2 } from "lucide-react";
import { useState } from "react";
import { getCurrentCoord, GeolocationFailure } from "@/lib/geolocation";
import type { Coord } from "@/lib/orsTypes";

type Props = {
  /** Called with a real Coord when permission grants. */
  onLocate: (coord: Coord) => void;
  /** Called when permission denies / fails so the page can render an error alert. */
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function UseLocationButton({ onLocate, onError, disabled }: Props) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const coord = await getCurrentCoord();
      onLocate(coord);
    } catch (err) {
      const msg =
        err instanceof GeolocationFailure
          ? err.message
          : "Couldn't read your location. Try again or type your start address.";
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy || disabled}
      className={
        "inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 text-xs font-semibold text-slate-100 " +
        "ring-1 ring-white/10 transition hover:bg-slate-700/80 " +
        "disabled:opacity-50 disabled:cursor-not-allowed " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      }
      aria-label="Use my current location for the starting point"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {busy ? "Locating…" : "Use my location"}
    </button>
  );
}
