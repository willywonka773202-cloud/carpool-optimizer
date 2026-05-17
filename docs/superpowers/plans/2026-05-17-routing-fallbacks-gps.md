# Routing Fallbacks + GPS Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three pure utility libs (haversine distance, nearest-neighbor TSP, geolocation Promise-wrapper), extend `OptimizedRoute` with `stopCoords`, and upgrade `composeOptimization` / `optimizeRoute` so ORS failures gracefully fall back rather than dead-ending.

**Architecture:** All new libs are framework-free modules in `lib/`. The `composeOptimization` orchestrator gains an optional `startCoord` bypass (for GPS use) and always returns `stopCoords` for numbered map markers. The live `optimizeRoute` wraps ORS calls in try/catch and substitutes local fallbacks on failure — nearest-neighbor for optimization failures, straight-line haversine for directions failures.

**Tech Stack:** TypeScript, Vitest (existing), Next.js (build check only)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/distance.ts` | Create | Haversine great-circle distance, no deps |
| `lib/nearestNeighbor.ts` | Create | Greedy nearest-neighbor TSP using haversineMeters |
| `lib/geolocation.ts` | Create | Promise wrapper around navigator.geolocation |
| `lib/types.ts` | Modify | Add `stopCoords?: Coord[]` to `OptimizedRoute` |
| `lib/optimizeRoute.ts` | Replace | Add `ComposeOptions`, `startCoord` bypass, `stopCoords` return, ORS fallbacks |
| `__tests__/distance.test.ts` | Create | 3 unit tests |
| `__tests__/nearestNeighbor.test.ts` | Create | 5 unit tests |
| `__tests__/geolocation.test.ts` | Create | 5 unit tests |
| `__tests__/boundaries.test.ts` | Modify | Add 3 purity boundary tests |
| `__tests__/optimizeRoute.test.ts` | Modify | Add 2 new tests |

---

### Task 1: Create `lib/distance.ts` and its tests

**Files:**
- Create: `lib/distance.ts`
- Create: `__tests__/distance.test.ts`

- [ ] **Step 1: Create `lib/distance.ts`**

```ts
import type { Coord } from "./orsTypes";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine great-circle distance between two WGS84 points, in meters.
 */
export function haversineMeters(a: Coord, b: Coord): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_METERS * c;
}
```

- [ ] **Step 2: Create `__tests__/distance.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { haversineMeters } from "../lib/distance";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters({ lat: 42, lng: -87 }, { lat: 42, lng: -87 })).toBe(0);
  });

  it("computes a known distance within tolerance", () => {
    // Chicago (41.8781, -87.6298) to New York (40.7128, -74.0060)
    // Real great-circle distance ~1,144 km.
    const d = haversineMeters(
      { lat: 41.8781, lng: -87.6298 },
      { lat: 40.7128, lng: -74.006 }
    );
    expect(d).toBeGreaterThan(1_100_000);
    expect(d).toBeLessThan(1_200_000);
  });

  it("is symmetric", () => {
    const a = { lat: 1, lng: 2 };
    const b = { lat: 10, lng: -3 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});
```

- [ ] **Step 3: Run new distance tests**

Run: `npm test -- __tests__/distance.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/distance.ts __tests__/distance.test.ts
git commit -m "feat(lib): add haversineMeters pure distance utility"
```

---

### Task 2: Create `lib/nearestNeighbor.ts` and its tests

**Files:**
- Create: `lib/nearestNeighbor.ts`
- Create: `__tests__/nearestNeighbor.test.ts`

- [ ] **Step 1: Create `lib/nearestNeighbor.ts`**

```ts
import type { Coord } from "./orsTypes";
import { haversineMeters } from "./distance";

/**
 * Greedy nearest-neighbor TSP: starting at `start`, repeatedly visit the closest
 * unvisited stop, ending at `end`. Returns the visit order as 0-based indices
 * into the original `stops` array.
 *
 * Deterministic for any input, tie-breaks by lowest original index.
 */
export function nearestNeighborOrder(
  start: Coord,
  stops: Coord[],
  _end: Coord
): number[] {
  void _end; // end coord is informational; not used by pure nearest-neighbor
  if (stops.length === 0) return [];
  if (stops.length === 1) return [0];

  const remaining = stops.map((_, i) => i);
  const order: number[] = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIdx = remaining[0];
    let bestDist = haversineMeters(current, stops[bestIdx]);
    for (let i = 1; i < remaining.length; i++) {
      const idx = remaining[i];
      const d = haversineMeters(current, stops[idx]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }
    order.push(bestIdx);
    remaining.splice(remaining.indexOf(bestIdx), 1);
    current = stops[bestIdx];
  }

  return order;
}
```

- [ ] **Step 2: Create `__tests__/nearestNeighbor.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { nearestNeighborOrder } from "../lib/nearestNeighbor";
import type { Coord } from "../lib/orsTypes";

const c = (lat: number, lng: number): Coord => ({ lat, lng });

describe("nearestNeighborOrder", () => {
  it("returns [] for zero stops", () => {
    expect(nearestNeighborOrder(c(0, 0), [], c(1, 1))).toEqual([]);
  });

  it("returns [0] for one stop", () => {
    expect(nearestNeighborOrder(c(0, 0), [c(5, 5)], c(1, 1))).toEqual([0]);
  });

  it("orders stops greedily by distance from start, then chain", () => {
    // Start at origin. Stops:
    //   0: (10, 0)  — far east
    //   1: (1, 0)   — close
    //   2: (3, 0)   — medium
    // From origin, closest is 1. Then from (1,0) closest is 2. Then 0.
    const order = nearestNeighborOrder(
      c(0, 0),
      [c(10, 0), c(1, 0), c(3, 0)],
      c(0, 0)
    );
    expect(order).toEqual([1, 2, 0]);
  });

  it("preserves all stops exactly once", () => {
    const stops = [c(2, 2), c(5, 5), c(1, 1), c(9, 9), c(7, 7)];
    const order = nearestNeighborOrder(c(0, 0), stops, c(10, 10));
    expect(order).toHaveLength(stops.length);
    expect(new Set(order)).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("is deterministic for the same input", () => {
    const stops = [c(2, 2), c(5, 5), c(1, 1), c(9, 9), c(7, 7)];
    const a = nearestNeighborOrder(c(0, 0), stops, c(10, 10));
    const b = nearestNeighborOrder(c(0, 0), stops, c(10, 10));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 3: Run new nearestNeighbor tests**

Run: `npm test -- __tests__/nearestNeighbor.test.ts`
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/nearestNeighbor.ts __tests__/nearestNeighbor.test.ts
git commit -m "feat(lib): add nearestNeighborOrder greedy TSP fallback"
```

---

### Task 3: Create `lib/geolocation.ts` and its tests

**Files:**
- Create: `lib/geolocation.ts`
- Create: `__tests__/geolocation.test.ts`

- [ ] **Step 1: Create `lib/geolocation.ts`**

```ts
import type { Coord } from "./orsTypes";

export type GeolocationErrorKind = "denied" | "unsupported" | "timeout" | "unknown";

export class GeolocationFailure extends Error {
  readonly kind: GeolocationErrorKind;
  constructor(kind: GeolocationErrorKind, message: string) {
    super(message);
    this.name = "GeolocationFailure";
    this.kind = kind;
  }
}

export type Geolocator = Pick<Geolocation, "getCurrentPosition">;

/**
 * Promise wrapper around navigator.geolocation.getCurrentPosition with error
 * normalization. The optional `geolocator` argument is for testing — tests can
 * pass a fake with the same shape.
 */
export function getCurrentCoord(
  geolocator?: Geolocator,
  options: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
): Promise<Coord> {
  const source =
    geolocator ??
    (typeof navigator !== "undefined" ? navigator.geolocation : undefined);

  if (!source) {
    return Promise.reject(
      new GeolocationFailure("unsupported", "This browser does not support location access.")
    );
  }

  return new Promise<Coord>((resolve, reject) => {
    source.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            reject(
              new GeolocationFailure(
                "denied",
                "Location permission was denied. You can still type your start address."
              )
            );
            break;
          case 3: // TIMEOUT
            reject(
              new GeolocationFailure(
                "timeout",
                "Could not get your location. Try again or type your start address."
              )
            );
            break;
          default:
            reject(
              new GeolocationFailure(
                "unknown",
                "Couldn't read your location. Try again or type your start address."
              )
            );
        }
      },
      options
    );
  });
}
```

- [ ] **Step 2: Create `__tests__/geolocation.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { GeolocationFailure, getCurrentCoord } from "../lib/geolocation";

function fakeGeolocator(behavior: "ok" | "denied" | "timeout" | "unknown" | "missing") {
  if (behavior === "missing") return undefined;
  return {
    getCurrentPosition(
      success: (pos: GeolocationPosition) => void,
      error?: (err: GeolocationPositionError) => void
    ) {
      if (behavior === "ok") {
        success({
          coords: {
            latitude: 42.1,
            longitude: -87.8,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
        return;
      }
      const codeMap: Record<string, number> = { denied: 1, timeout: 3, unknown: 99 };
      error?.({
        code: codeMap[behavior],
        message: behavior,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    },
  };
}

describe("getCurrentCoord", () => {
  it("resolves to {lat, lng} on success", async () => {
    const coord = await getCurrentCoord(fakeGeolocator("ok"));
    expect(coord).toEqual({ lat: 42.1, lng: -87.8 });
  });

  it("rejects with kind 'denied' when permission is denied", async () => {
    await expect(getCurrentCoord(fakeGeolocator("denied"))).rejects.toMatchObject({
      name: "GeolocationFailure",
      kind: "denied",
    });
  });

  it("rejects with kind 'timeout' on timeout", async () => {
    await expect(getCurrentCoord(fakeGeolocator("timeout"))).rejects.toMatchObject({
      kind: "timeout",
    });
  });

  it("rejects with kind 'unsupported' when geolocation is missing", async () => {
    // Explicitly pass undefined to opt out of the navigator fallback.
    await expect(
      // @ts-expect-error intentionally passing undefined for this branch
      getCurrentCoord(fakeGeolocator("missing"))
    ).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("rejects with kind 'unknown' on other failures", async () => {
    await expect(getCurrentCoord(fakeGeolocator("unknown"))).rejects.toMatchObject({
      kind: "unknown",
    });
    // sanity: GeolocationFailure class is exported
    expect(GeolocationFailure).toBeDefined();
  });
});
```

- [ ] **Step 3: Run new geolocation tests**

Run: `npm test -- __tests__/geolocation.test.ts`
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/geolocation.ts __tests__/geolocation.test.ts
git commit -m "feat(lib): add getCurrentCoord geolocation Promise wrapper"
```

---

### Task 4: Extend `OptimizedRoute` type with `stopCoords`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `Coord` import and `stopCoords` field to `lib/types.ts`**

Add `import type { Coord } from "./orsTypes";` near the top of the file (after any existing imports), then append `stopCoords?: Coord[];` to the `OptimizedRoute` type.

The `OptimizedRoute` type becomes:

```ts
import type { Coord } from "./orsTypes";

export type RouteInputs = {
  start: string;
  end: string;
  stops: string[];
};

/**
 * [lat, lng] pairs in render-ready order, suitable for Leaflet's <Polyline positions={...} />.
 */
export type RoutePolyline = [number, number][];

export type OptimizedRoute = {
  orderedStops: string[];
  etaSeconds: number;
  distanceMeters: number;
  source: "ors" | "mock";
  /** Only the live ORS path populates this. Mock omits it. */
  polyline?: RoutePolyline;
  /** Optional: geocoded coords for each stop in the same order as orderedStops. Live mode populates this. */
  stopCoords?: Coord[];
};
```

(Leave `SavedRoute` and `OptimizationMode` unchanged.)

- [ ] **Step 2: Run typecheck to confirm no regressions**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add stopCoords to OptimizedRoute for numbered map markers"
```

---

### Task 5: Replace `lib/optimizeRoute.ts` with fallback-aware version

**Files:**
- Replace: `lib/optimizeRoute.ts`

- [ ] **Step 1: Write the new `lib/optimizeRoute.ts`**

```ts
import type { OptimizedRoute, RouteInputs } from "./types";
import { geocodeAddress } from "./orsGeocode";
import { solveStopOrder } from "./orsOptimize";
import { fetchDirections } from "./orsDirections";
import { nearestNeighborOrder } from "./nearestNeighbor";
import { haversineMeters } from "./distance";
import type { Coord } from "./orsTypes";

export type OrsDeps = {
  geocode: (address: string) => Promise<Coord>;
  optimize: (start: Coord, end: Coord, stops: Coord[]) => Promise<number[]>;
  directions: (coordsInOrder: Coord[]) => Promise<{
    polyline: [number, number][];
    etaSeconds: number;
    distanceMeters: number;
  }>;
};

export type ComposeOptions = {
  /** If provided, skip geocoding the start address and use this coord directly. */
  startCoord?: Coord;
};

/**
 * Average driving speed used only when ORS directions is unreachable and we
 * have to fall back to a haversine straight-line estimate. ~50 km/h.
 */
const FALLBACK_AVG_SPEED_MPS = 14;

/**
 * Build a synthetic straight-line polyline + summary from raw coords. Used as
 * a graceful fallback when ORS directions is unavailable but we still want to
 * show *something* on the map.
 */
function buildStraightLineRoute(
  start: Coord,
  ordered: Coord[],
  end: Coord
): { polyline: [number, number][]; etaSeconds: number; distanceMeters: number } {
  const coords = [start, ...ordered, end];
  let distanceMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    distanceMeters += haversineMeters(coords[i], coords[i + 1]);
  }
  return {
    polyline: coords.map((c) => [c.lat, c.lng] as [number, number]),
    etaSeconds: Math.round(distanceMeters / FALLBACK_AVG_SPEED_MPS),
    distanceMeters,
  };
}

/**
 * Pure orchestrator — easy to test with stub deps.
 */
export async function composeOptimization(
  inputs: RouteInputs,
  deps: OrsDeps,
  options: ComposeOptions = {}
): Promise<OptimizedRoute> {
  const startPromise: Promise<Coord> = options.startCoord
    ? Promise.resolve(options.startCoord)
    : deps.geocode(inputs.start);

  const [startCoord, endCoord, ...stopCoords] = await Promise.all([
    startPromise,
    deps.geocode(inputs.end),
    ...inputs.stops.map((s) => deps.geocode(s)),
  ]);

  const optimizedIndexes =
    stopCoords.length <= 1
      ? stopCoords.map((_, i) => i)
      : await deps.optimize(startCoord, endCoord, stopCoords);

  const orderedStops = optimizedIndexes.map((i) => inputs.stops[i]);
  const orderedCoords = optimizedIndexes.map((i) => stopCoords[i]);

  const { polyline, etaSeconds, distanceMeters } = await deps.directions([
    startCoord,
    ...orderedCoords,
    endCoord,
  ]);

  return {
    orderedStops,
    etaSeconds,
    distanceMeters,
    source: "ors",
    polyline,
    stopCoords: orderedCoords,
  };
}

/**
 * Live entry point — wires composeOptimization to real ORS endpoints. Adds
 * two graceful fallbacks:
 *   1. If ORS optimization fails, use local nearest-neighbor on the geocoded
 *      coords (still real coords, just a greedy solver).
 *   2. If ORS directions fails, synthesize a straight-line polyline from the
 *      ordered coords. The route is still valid; just less precise.
 */
export async function optimizeRoute(
  inputs: RouteInputs,
  apiKey: string,
  options: ComposeOptions = {}
): Promise<OptimizedRoute> {
  if (!apiKey) {
    throw new Error("No OpenRouteService API key available.");
  }

  const deps: OrsDeps = {
    geocode: (addr) => geocodeAddress(addr, apiKey),
    optimize: async (s, e, st) => {
      try {
        return await solveStopOrder(s, e, st, apiKey);
      } catch {
        // Fallback to local greedy solver — still uses real coords.
        return nearestNeighborOrder(s, st, e);
      }
    },
    directions: async (coords) => {
      try {
        return await fetchDirections(coords, apiKey);
      } catch {
        // Fallback to straight-line polyline + haversine estimate.
        return buildStraightLineRoute(coords[0], coords.slice(1, -1), coords[coords.length - 1]);
      }
    },
  };

  return composeOptimization(inputs, deps, options);
}
```

- [ ] **Step 2: Run existing optimizeRoute tests to confirm no regressions**

Run: `npm test -- __tests__/optimizeRoute.test.ts`
Expected: 4 tests pass (same as before).

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/optimizeRoute.ts
git commit -m "feat(optimizeRoute): add ComposeOptions, startCoord bypass, stopCoords, ORS fallbacks"
```

---

### Task 6: Add boundary tests for new pure libs + two new optimizeRoute tests

**Files:**
- Modify: `__tests__/boundaries.test.ts`
- Modify: `__tests__/optimizeRoute.test.ts`

- [ ] **Step 1: Add 3 boundary tests to `__tests__/boundaries.test.ts`**

Inside the existing `describe("module boundaries", () => { ... })` block, append before the closing `});`:

```ts
  it("nearestNeighbor.ts is pure (no map UI, no network)", () => {
    const src = read("lib/nearestNeighbor.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });

  it("distance.ts is pure (no map UI, no network)", () => {
    const src = read("lib/distance.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });

  it("geolocation.ts is pure (no map UI, no network)", () => {
    const src = read("lib/geolocation.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });
```

- [ ] **Step 2: Add 2 tests to `__tests__/optimizeRoute.test.ts`**

Inside the existing `describe("composeOptimization", () => { ... })` block, append before the closing `});`:

```ts
  it("returns stopCoords aligned with optimizedStops", async () => {
    const geocode = vi.fn(async (addr: string) => {
      const map: Record<string, Coord> = {
        Home: coord(1, 1),
        School: coord(2, 2),
        A: coord(3, 3),
        B: coord(4, 4),
        C: coord(5, 5),
      };
      return map[addr];
    });
    const optimize = vi.fn(async () => [2, 0, 1]);
    const directions = vi.fn(async () => ({
      polyline: [] as [number, number][],
      etaSeconds: 0,
      distanceMeters: 0,
    }));
    const result = await composeOptimization(
      { start: "Home", end: "School", stops: ["A", "B", "C"] },
      { geocode, optimize, directions }
    );
    expect(result.orderedStops).toEqual(["C", "A", "B"]);
    expect(result.stopCoords).toEqual([coord(5, 5), coord(3, 3), coord(4, 4)]);
  });

  it("skips geocoding the start when startCoord is provided", async () => {
    const geocode = vi.fn(async () => coord(0, 0));
    const optimize = vi.fn(async () => [0]);
    const directions = vi.fn(async () => ({
      polyline: [] as [number, number][],
      etaSeconds: 0,
      distanceMeters: 0,
    }));
    await composeOptimization(
      { start: "ignored-address", end: "E", stops: ["S1"] },
      { geocode, optimize, directions },
      { startCoord: coord(99, 99) }
    );
    // start address was NOT geocoded — only end + one stop.
    expect(geocode).toHaveBeenCalledTimes(2);
    expect(geocode).not.toHaveBeenCalledWith("ignored-address");
  });
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: 102 tests pass across 14 test files.

- [ ] **Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: no errors.

- [ ] **Step 5: Final commit**

```bash
git add __tests__/boundaries.test.ts __tests__/optimizeRoute.test.ts
git commit -m "test: add boundary + stopCoords + startCoord bypass tests"
```

---

### Task 7: Final verification commit

**Files:** none (verification only)

- [ ] **Step 1: Run all checks**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected:
- typecheck: 0 errors
- lint: 0 errors  
- test: 102 passed
- build: compiled successfully

- [ ] **Step 2: Consolidation commit**

```bash
git add -A
git commit -m "feat(lib): distance, nearest-neighbor, geolocation; ORS optimize/directions fallbacks; stopCoords pass-through"
```
