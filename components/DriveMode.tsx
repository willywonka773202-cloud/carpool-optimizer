"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, MessageCircle, Navigation, X } from "lucide-react";
import { haversineMeters } from "@/lib/distance";
import { formatDistance } from "@/lib/format";
import {
  driveStatus,
  proximityMessage,
  smsLink,
  type DriveStatus,
  type DriveStop,
} from "@/lib/driveProximity";
import type { Coord } from "@/lib/orsTypes";
import { Button } from "@/components/ui/Button";

/**
 * Pickup-run companion. Tracks live GPS (foreground) and, as the driver nears each house,
 * auto-surfaces a prefilled "come outside / ~5 min away" text — one tap to send. Works while
 * this screen is open; the fully-hands-off background version needs a native app + SMS backend.
 */
export function DriveMode({
  stops,
  end,
  onClose,
}: {
  stops: DriveStop[];
  end: string;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Coord | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Location isn't available on this device.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrent({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      (err) =>
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Allow location access to track pickups."
            : "Couldn't read your location — keep this screen open."
        ),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const allDone = doneCount >= stops.length;
  const next = allDone ? null : stops[doneCount];
  const distance = current && next?.coord ? haversineMeters(current, next.coord) : null;
  const status: DriveStatus = distance != null ? driveStatus(distance) : "enroute";
  const message = next ? proximityMessage(status, next.rider) : "";

  const cardTone =
    status === "arrived"
      ? "border-emerald-400/40 bg-emerald-500/15"
      : status === "approaching"
        ? "border-amber-400/40 bg-amber-500/15"
        : "border-white/10 bg-slate-950/50";
  const closeEnough = status !== "enroute";

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-slate-950 pb-safe">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-100">
          <Navigation className="h-4 w-4 text-cyan-300" aria-hidden="true" /> Drive mode
          <span className="text-xs font-medium text-slate-500">
            · {doneCount}/{stops.length} done
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit drive mode"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {geoError && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {geoError}
          </div>
        )}

        {allDone || !next ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
              <Check className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">Everyone&apos;s picked up 🎉</p>
              <p className="mt-1 text-sm text-slate-400">Head to {end}.</p>
            </div>
            <Button variant="success" size="lg" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className={"rounded-2xl border p-4 " + cardTone}>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
                {status === "arrived"
                  ? "You're here"
                  : status === "approaching"
                    ? "Almost there"
                    : `Next pickup · ${doneCount + 1} of ${stops.length}`}
              </p>
              <p className="mt-1 truncate text-2xl font-black text-slate-50">
                {next.rider?.trim() || `Stop ${doneCount + 1}`}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-300">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{next.address}</span>
              </p>
              <p className="mt-3 text-4xl font-black tabular-nums text-slate-50">
                {distance != null ? formatDistance(distance) : "—"}
                <span className="ml-1 text-sm font-semibold text-slate-400">away</span>
              </p>
            </div>

            {/* The text — auto-surfaced, and it pulses once you're close. */}
            <a
              href={smsLink(message)}
              className={
                "flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-4 text-center text-base font-bold text-white shadow-lg shadow-blue-950/40 " +
                (closeEnough ? "animate-pulse ring-2 ring-cyan-300/50" : "")
              }
            >
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              Text {next.rider?.trim() || "rider"}: {status === "arrived" ? "come outside" : "~5 min away"}
            </a>
            <p className="-mt-2 text-center text-[11px] text-slate-500">
              Opens your texting app with the message ready — one tap to send.
            </p>

            <div className="mt-auto grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.address)}&travelmode=driving`}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/5"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
              </a>
              <Button variant="success" size="md" onClick={() => setDoneCount((c) => c + 1)}>
                <Check className="h-4 w-4" aria-hidden="true" /> Picked up
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setDoneCount((c) => c + 1)}
              className="text-center text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              Skip this stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
