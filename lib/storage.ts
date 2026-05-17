import type { SavedRoute } from "./types";

export const STORAGE_KEY = "carpool.savedRoutes";

const FORBIDDEN_FIELDS = ["apiKey", "directionsResult"];

export type SaveInput = {
  label: string;
  start: string;
  end: string;
  stops: string[];
};

function readAll(): SavedRoute[] {
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
        typeof x.createdAt === "number"
    );
  } catch {
    return [];
  }
}

function writeAll(routes: SavedRoute[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function listSavedRoutes(): SavedRoute[] {
  return [...readAll()].sort((a, b) => b.createdAt - a.createdAt);
}

export function saveRoute(input: SaveInput): SavedRoute {
  for (const f of FORBIDDEN_FIELDS) {
    if (f in (input as Record<string, unknown>)) {
      throw new Error(`storage: forbidden field "${f}" rejected`);
    }
  }
  const clean: SaveInput = {
    label: input.label,
    start: input.start,
    end: input.end,
    stops: input.stops,
  };
  const saved: SavedRoute = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...clean,
  };
  writeAll([saved, ...readAll()]);
  return saved;
}

export function deleteRoute(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
}
