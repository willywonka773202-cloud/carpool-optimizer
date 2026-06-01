import { getNextSavedRoute } from "./schedule";
import type { SavedRoute } from "./types";

export type SavedRouteFilter = "all" | "pinned" | "upcoming" | "drafts" | "driven";

function hasDriveHistory(route: SavedRoute): boolean {
  return Boolean(route.driveCount && route.driveCount > 0);
}

function buildRouteSearchHaystack(route: SavedRoute): string {
  const parts = [
    route.label,
    route.start,
    route.end,
    ...route.stops,
    ...(route.riderNames ?? []),
    route.ridePlan?.driverName ?? "",
    route.ridePlan?.driverNote ?? "",
    route.ridePlan?.repeat ?? "",
    route.routePreferences?.intent ?? "",
    hasDriveHistory(route) ? "driven completed history" : "",
    route.driveCount ? `${route.driveCount} drives` : "",
  ];

  return parts
    .map((part) => (typeof part === "string" ? part.trim().toLowerCase() : ""))
    .filter(Boolean)
    .join("\n");
}

export function matchesSavedRouteQuery(route: SavedRoute, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return normalized
    .split(/\s+/)
    .every((term) => buildRouteSearchHaystack(route).includes(term));
}

export function filterSavedRoutes(
  routes: SavedRoute[],
  filter: SavedRouteFilter,
  query: string,
  now = new Date()
): SavedRoute[] {
  return routes.filter((route) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "pinned"
          ? Boolean(route.isPinned)
          : filter === "upcoming"
            ? Boolean(getNextSavedRoute(route, now)?.isUpcoming)
            : filter === "drafts"
              ? typeof route.etaSeconds !== "number" && typeof route.distanceMeters !== "number"
              : hasDriveHistory(route);

    return matchesFilter && matchesSavedRouteQuery(route, query);
  });
}
