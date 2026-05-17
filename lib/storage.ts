import type { SavedRoute } from "./types";

export const STORAGE_KEY = "carpool.savedRoutes";

const FORBIDDEN_FIELDS = ["apiKey", "directionsResult"];

export type SaveInput = {
  label: string;
  start: string;
  end: string;
  stops: string[];
  riderNames?: (string | null)[];
  etaSeconds?: number;
  distanceMeters?: number;
  source?: "ors" | "mock";
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
    return parsed.filter(
      (x): x is SavedRoute =>
        typeof x === "object" &&
        x !== null &&
        typeof x.id === "string" &&
        typeof x.label === "string" &&
        typeof x.start === "string" &&
        typeof x.end === "string" &&
        Array.isArray(x.stops) &&
        x.stops.every((s: unknown) => typeof s === "string") &&
        typeof x.createdAt === "number"
    );
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

export function listSavedRoutes(): SavedRoute[] {
  return [...readAll()].sort((a, b) => {
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
    riderNames: input.riderNames,
    etaSeconds: input.etaSeconds,
    distanceMeters: input.distanceMeters,
    source: input.source,
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
    id: all[idx].id,
    createdAt: all[idx].createdAt,
    updatedAt: Date.now(),
  });

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

export function deleteRoute(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
