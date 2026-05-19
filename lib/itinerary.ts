import type { OptimizedRoute, RouteLeg } from "./types";
import { formatDistance, formatEta } from "./format";

export type RouteItineraryInput = {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  riderNames?: (string | null)[];
  mapsUrl?: string;
};

function formatLeg(leg: RouteLeg | undefined): string {
  if (!leg) return "";
  return ` (+${formatEta(leg.etaSeconds)}, ${formatDistance(leg.distanceMeters)} leg)`;
}

function stopLabel(index: number, riderNames: (string | null)[] | undefined): string {
  const rider = riderNames?.[index]?.trim();
  return rider ? rider : `Stop ${index + 1}`;
}

export function buildRouteItineraryText({
  start,
  end,
  optimized,
  riderNames,
  mapsUrl,
}: RouteItineraryInput): string {
  const dropoffCount = optimized.orderedStops.length;
  const lines = [
    `Carpool route: ${start} → ${end}`,
    `Total: ${formatEta(optimized.etaSeconds)} • ${formatDistance(optimized.distanceMeters)} • ${dropoffCount} drop-off${dropoffCount === 1 ? "" : "s"}`,
    "",
    `S. Start: ${start}`,
    ...optimized.orderedStops.map(
      (stop, index) =>
        `${index + 1}. ${stopLabel(index, riderNames)} — ${stop}${formatLeg(optimized.legs?.[index])}`
    ),
    `E. End: ${end}${formatLeg(optimized.legs?.[optimized.orderedStops.length])}`,
  ];

  if (mapsUrl) {
    lines.push("", `Open in Google Maps: ${mapsUrl}`);
  }

  return lines.join("\n");
}
