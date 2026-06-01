import { normalizeRidePlan } from "./ridePlan";
import { normalizeSavedRouteProgress } from "./routeProgress";
import type { SavedRoute } from "./types";

export const STORAGE_KEY = "carpool.savedRoutes";

const FORBIDDEN_FIELDS = ["apiKey", "directionsResult"];

export type SaveInput = {
  label: string;
  start: string;
  end: string;
  stops: string[];
  isPinned?: boolean;
  riderNames?: (string | null)[];
  ridePlan?: SavedRoute["ridePlan"];
  routePreferences?: SavedRoute["routePreferences"];
  etaSeconds?: number;
  distanceMeters?: number;
  source?: "ors" | "mock";
  progress?: SavedRoute["progress"];
  driveCount?: number;
  lastDrivenAt?: number;
};

export type UpdateInput = Partial<SaveInput>;

function rejectForbidden(input: object): void {
  for (const f of FORBIDDEN_FIELDS) {
    if (f in (input as Record<string, unknown>)) {
      throw new Error(`storage: forbidden field "${f}" rejected`);
    }
  }
}

function assertRiderNamesAlignment(stops: string[], riderNames?: (string | null)[]): void {
  if (riderNames === undefined) return;
  if (!Array.isArray(riderNames)) {
    throw new Error("storage: riderNames must be an array if present");
  }
  if (riderNames.length !== stops.length) {
    throw new Error(
      `storage: riderNames length (${riderNames.length}) must match stops length (${stops.length})`
    );
  }
}

function readAll(): SavedRoute[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((x): SavedRoute[] => {
      if (
        typeof x !== "object" ||
        x === null ||
        typeof x.id !== "string" ||
        typeof x.label !== "string" ||
        typeof x.start !== "string" ||
        typeof x.end !== "string" ||
        !Array.isArray(x.stops) ||
        !x.stops.every((s: unknown) => typeof s === "string") ||
        typeof x.createdAt !== "number"
      ) {
        return [];
      }

      return [
        pruneUndefined({
          ...x,
          ridePlan:
            typeof x.ridePlan === "object" && x.ridePlan !== null
              ? normalizeRidePlan(x.ridePlan)
              : undefined,
          routePreferences:
            typeof x.routePreferences === "object" && x.routePreferences !== null
              ? x.routePreferences
              : undefined,
          progress:
            typeof x.progress === "object" && x.progress !== null
              ? normalizeSavedRouteProgress(
                  x.progress,
                  x.stops,
                  normalizeRidePlan(x.ridePlan).checklist
                )
              : undefined,
          driveCount: undefined,
          lastDrivenAt: undefined,
          ...normalizeDriveHistory(x),
          isPinned: Boolean(x.isPinned),
        }),
      ];
    });
  } catch {
    return [];
  }
}

function writeAll(routes: SavedRoute[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

function pruneUndefined<T extends object>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out) as (keyof T)[]) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

function normalizeDriveHistory(input: {
  driveCount?: unknown;
  lastDrivenAt?: unknown;
}): Pick<SavedRoute, "driveCount" | "lastDrivenAt"> {
  const lastDrivenAt =
    typeof input.lastDrivenAt === "number" &&
    Number.isFinite(input.lastDrivenAt) &&
    input.lastDrivenAt > 0
      ? Math.floor(input.lastDrivenAt)
      : undefined;
  const explicitCount =
    typeof input.driveCount === "number" && Number.isFinite(input.driveCount)
      ? Math.max(0, Math.floor(input.driveCount))
      : undefined;
  const driveCount =
    lastDrivenAt === undefined ? explicitCount : Math.max(explicitCount ?? 0, 1);

  return pruneUndefined({
    driveCount: driveCount && driveCount > 0 ? driveCount : undefined,
    lastDrivenAt,
  });
}

export function listSavedRoutes(): SavedRoute[] {
  return [...readAll()].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
      return a.isPinned ? -1 : 1;
    }
    const aTs = a.updatedAt ?? a.createdAt;
    const bTs = b.updatedAt ?? b.createdAt;
    return bTs - aTs;
  });
}

export function saveRoute(input: SaveInput): SavedRoute {
  rejectForbidden(input);
  assertRiderNamesAlignment(input.stops, input.riderNames);

  const saved: SavedRoute = pruneUndefined({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    label: input.label,
    start: input.start,
    end: input.end,
    stops: input.stops,
    isPinned: input.isPinned,
    riderNames: input.riderNames,
    ridePlan: input.ridePlan ? normalizeRidePlan(input.ridePlan) : undefined,
    routePreferences: input.routePreferences,
    etaSeconds: input.etaSeconds,
    distanceMeters: input.distanceMeters,
    source: input.source,
    progress: input.progress
      ? normalizeSavedRouteProgress(
          input.progress,
          input.stops,
          normalizeRidePlan(input.ridePlan).checklist
        )
      : undefined,
    ...normalizeDriveHistory(input),
  });

  // Defensive: in the astronomically unlikely event of a UUID collision, regenerate.
  const existing = readAll();
  if (existing.some((r) => r.id === saved.id)) {
    saved.id = crypto.randomUUID();
  }
  writeAll([saved, ...existing]);
  return saved;
}

export function updateRoute(id: string, partial: UpdateInput): SavedRoute {
  rejectForbidden(partial);

  const all = readAll();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Error(`storage: route "${id}" not found`);
  }

  const merged: SavedRoute = pruneUndefined({
    ...all[idx],
    ...partial,
    ridePlan:
      partial.ridePlan === undefined
        ? all[idx].ridePlan
        : partial.ridePlan
          ? normalizeRidePlan(partial.ridePlan)
          : undefined,
    id: all[idx].id,
    createdAt: all[idx].createdAt,
    updatedAt: Date.now(),
  });

  merged.progress =
    partial.progress === undefined && merged.progress === undefined
      ? undefined
      : normalizeSavedRouteProgress(
          partial.progress ?? merged.progress,
          merged.stops,
          normalizeRidePlan(merged.ridePlan).checklist
        );

  const history = normalizeDriveHistory(merged);
  delete merged.driveCount;
  delete merged.lastDrivenAt;
  Object.assign(merged, history);

  // If stops or riderNames were updated, re-validate alignment with the final shape.
  assertRiderNamesAlignment(merged.stops, merged.riderNames);

  const next = [...all];
  next[idx] = merged;
  writeAll(next);
  return merged;
}

export function renameRoute(id: string, label: string): SavedRoute {
  return updateRoute(id, { label });
}

export function toggleRoutePin(id: string): SavedRoute {
  const route = readAll().find((entry) => entry.id === id);
  if (!route) {
    throw new Error(`storage: route "${id}" not found`);
  }
  return updateRoute(id, { isPinned: !route.isPinned });
}

export function recordRouteDrive(id: string, timestamp = Date.now()): SavedRoute {
  const route = readAll().find((entry) => entry.id === id);
  if (!route) {
    throw new Error(`storage: route "${id}" not found`);
  }

  return updateRoute(id, {
    driveCount: (route.driveCount ?? 0) + 1,
    lastDrivenAt: timestamp,
  });
}

export function deleteRoute(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
