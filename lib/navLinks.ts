import { buildGoogleMapsUrl } from "./routeUrl";

/** Which navigation app to hand off to. */
export type NavApp = "google" | "waze" | "apple";

export const NAV_APPS: Array<{ id: NavApp; label: string; note: string }> = [
  { id: "google", label: "Google Maps", note: "Full multi-stop route" },
  { id: "apple", label: "Apple Maps", note: "Multi-stop (iOS)" },
  { id: "waze", label: "Waze", note: "Next stop only" },
];

export type NavLinkInput = {
  start: string;
  end: string;
  orderedStops: string[];
};

function cleanStops(orderedStops: string[]): string[] {
  return orderedStops.map((s) => s.trim()).filter(Boolean);
}

/**
 * Apple Maps universal link. Apple's URL scheme chains destinations with `+to:`
 * (honored on modern iOS); spaces are encoded per-address. Multi-stop support is
 * weaker than Google's, so this is best-effort: start → stop1 → … → end.
 */
export function buildAppleMapsUrl({ start, end, orderedStops }: NavLinkInput): string {
  const saddr = encodeURIComponent(start.trim());
  const dests = [...cleanStops(orderedStops), end.trim()].filter(Boolean);
  const daddr = dests.map((d) => encodeURIComponent(d)).join("+to:");
  const base = "https://maps.apple.com/?dirflg=d";
  if (!daddr) return `${base}&saddr=${saddr}`;
  return `${base}&saddr=${saddr}&daddr=${daddr}`;
}

/**
 * Waze deep link. Waze navigates to a SINGLE destination via URL, so this targets
 * the first optimized drop-off (the immediate next stop); the driver re-opens Waze
 * for each subsequent stop. Falls back to the end if there are no stops.
 */
export function buildWazeUrl({ end, orderedStops }: NavLinkInput): string {
  const stops = cleanStops(orderedStops);
  const dest = stops[0] ?? end.trim();
  return `https://waze.com/ul?q=${encodeURIComponent(dest)}&navigate=yes`;
}

/** Build the navigation URL for the chosen app from an already-optimized stop order. */
export function buildNavUrl(app: NavApp, input: NavLinkInput): string {
  switch (app) {
    case "waze":
      return buildWazeUrl(input);
    case "apple":
      return buildAppleMapsUrl(input);
    case "google":
    default:
      return buildGoogleMapsUrl(input);
  }
}

export function navAppLabel(app: NavApp): string {
  return NAV_APPS.find((a) => a.id === app)?.label ?? "Google Maps";
}
