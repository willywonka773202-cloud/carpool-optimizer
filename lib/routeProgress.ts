import type { SavedRoute, SavedRouteProgress } from "./types";

export const EMPTY_SAVED_ROUTE_PROGRESS: SavedRouteProgress = {
  completedStopKeys: [],
  completedChecklistKeys: [],
};

export function buildStopProgressKey(index: number, stop: string): string {
  return `${index}:${stop}`;
}

export function buildChecklistProgressKey(index: number, item: string): string {
  return `${index}:${item}`;
}

export function normalizeSavedRouteProgress(
  progress: SavedRouteProgress | undefined,
  stops: string[],
  checklist: string[]
): SavedRouteProgress {
  const validStopKeys = new Set(stops.map((stop, index) => buildStopProgressKey(index, stop)));
  const validChecklistKeys = new Set(
    checklist.map((item, index) => buildChecklistProgressKey(index, item))
  );

  return pruneEmptyProgress({
    completedStopKeys: dedupeStrings(progress?.completedStopKeys).filter((key) =>
      validStopKeys.has(key)
    ),
    completedChecklistKeys: dedupeStrings(progress?.completedChecklistKeys).filter((key) =>
      validChecklistKeys.has(key)
    ),
    lastUpdatedAt: progress?.lastUpdatedAt,
  });
}

export function toggleSavedRouteProgressKey(
  progress: SavedRouteProgress,
  kind: "stop" | "checklist",
  key: string
): SavedRouteProgress {
  const field = kind === "stop" ? "completedStopKeys" : "completedChecklistKeys";
  const values = new Set(progress[field]);
  if (values.has(key)) {
    values.delete(key);
  } else {
    values.add(key);
  }

  return pruneEmptyProgress({
    ...progress,
    [field]: [...values],
    lastUpdatedAt: Date.now(),
  });
}

export function resetSavedRouteProgress(): SavedRouteProgress {
  return { ...EMPTY_SAVED_ROUTE_PROGRESS };
}

export function summarizeSavedRouteProgress(route: SavedRoute): {
  status: "staged" | "in-progress" | "complete";
  completedStops: number;
  totalStops: number;
  completedChecklist: number;
  totalChecklist: number;
} {
  const totalStops = route.stops.length;
  const totalChecklist = route.ridePlan?.checklist.length ?? 0;
  const progress = normalizeSavedRouteProgress(route.progress, route.stops, route.ridePlan?.checklist ?? []);
  const completedStops = progress.completedStopKeys.length;
  const completedChecklist = progress.completedChecklistKeys.length;
  const completedAllStops = totalStops > 0 && completedStops >= totalStops;
  const completedAllChecklist =
    totalChecklist === 0 || completedChecklist >= totalChecklist;
  const hasProgress = completedStops > 0 || completedChecklist > 0;

  return {
    status: completedAllStops && completedAllChecklist ? "complete" : hasProgress ? "in-progress" : "staged",
    completedStops,
    totalStops,
    completedChecklist,
    totalChecklist,
  };
}

function dedupeStrings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((value): value is string => typeof value === "string"))];
}

function pruneEmptyProgress(progress: SavedRouteProgress): SavedRouteProgress {
  return {
    completedStopKeys: progress.completedStopKeys,
    completedChecklistKeys: progress.completedChecklistKeys,
    lastUpdatedAt:
      progress.completedStopKeys.length > 0 || progress.completedChecklistKeys.length > 0
        ? progress.lastUpdatedAt
        : undefined,
  };
}
