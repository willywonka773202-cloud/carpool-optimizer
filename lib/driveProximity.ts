import type { Coord } from "./orsTypes";

export type DriveStatus = "enroute" | "approaching" | "arrived";

// ponytail: straight-line distance buckets; swap haversine for a road-ETA call if exact
// minutes ever matter. For a pickup heads-up text, "close enough" is the whole job.
const ARRIVE_M = 150; // ~1 block → "we're outside, come out"
const APPROACH_M = 800; // ~½ mi → "almost there, get ready"

export function driveStatus(distanceMeters: number): DriveStatus {
  if (distanceMeters <= ARRIVE_M) return "arrived";
  if (distanceMeters <= APPROACH_M) return "approaching";
  return "enroute";
}

export function proximityMessage(status: DriveStatus, riderName: string | null): string {
  const who = riderName?.trim() ? `${riderName.trim()}, ` : "";
  if (status === "arrived") return `${who}we're outside — come on out! 🚗`;
  if (status === "approaching") return `${who}we're about 5 minutes out — get ready! 🚗`;
  return `${who}on our way! 🚗`;
}

/** Native SMS composer deep link, prefilled. `?&body=` is the form that works on both iOS and Android. */
export function smsLink(message: string, phone?: string | null): string {
  const num = phone?.trim() ?? "";
  return `sms:${num}?&body=${encodeURIComponent(message)}`;
}

export type DriveStop = { rider: string | null; address: string; coord: Coord | null };
