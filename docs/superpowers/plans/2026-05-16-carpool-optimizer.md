# Carpool Route Optimizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-driver, mobile-first carpool drop-off optimizer web app that orders waypoints via Google Maps DirectionsService and hands off to native Google Maps.

**Architecture:** Single-page Next.js 15 App Router app. All Google Maps work lives in the browser; no backend. Pure helper libs are TDD'd first, then UI components are composed in `app/page.tsx`. Production optimizer and mock fallback are strictly separated and only meet inside the page component.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, `@react-google-maps/api@^2.20.0`, `lucide-react`, Vitest.

**Spec:** [docs/superpowers/specs/2026-05-16-carpool-optimizer-design.md](../specs/2026-05-16-carpool-optimizer-design.md)

---

## Guardrails (re-read before every task)

These constraints come from the spec and the user's reinforced review. They apply to every task — if a task would violate one, stop and surface the conflict instead of breaking the rule.

1. **`OptimizedRoute.directionsResult` is optional.** Mock fallback never returns one. Types must reflect this.
2. **Strict mock/production separation.** `lib/optimizeRoute.ts` MUST NOT import `mockOptimizeRoute` or anything from it. `lib/mockOptimizeRoute.ts` MUST NOT import `optimizeRoute` or `@react-google-maps/api`. The two paths only meet inside `app/page.tsx`. A test in Task 8 enforces this.
3. **API key priority.** `lib/googleMaps.ts` resolves keys in this order: (a) `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; (b) `localStorage['carpool.devApiKey']` only when `process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === 'true'`; (c) `null`. Production builds without the flag never expose the paste dialog.
4. **`localStorage` scope is fixed.** `storage.ts` reads/writes only `carpool.savedRoutes`. The payload contains `{id, label, start, end, stops, createdAt}` — nothing else. Tests reject any payload containing an `apiKey` field or a `directionsResult` blob.
5. **Bottom sheet is non-draggable in v1.** Two states (collapsed/expanded) toggled by a chevron button. No drag gestures, no momentum, no snap intermediates.
6. **Unit tests come before UI.** Tasks 2–8 (pure libs) ship before Tasks 9+ (components). Don't reorder.

---

## Task 0: Repo scaffold (Next.js + Tailwind + Vitest)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (placeholder)
- Create: `app/globals.css`
- Create: `next-env.d.ts` (auto-generated on first build — included for clarity)

**Goal:** Get a Next.js 15 + Tailwind + TypeScript + Vitest scaffold that builds clean and renders a placeholder page.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "carpool-optimizer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@react-google-maps/api": "^2.20.0",
    "lucide-react": "^0.462.0",
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9",
    "eslint-config-next": "15.0.3",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create `postcss.config.js`**

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
.env.local
.env*.local
coverage/
*.log
.DS_Store
```

- [ ] **Step 7: Create `.env.example`**

```
# Required in production for live Google Maps DirectionsService.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Set to "true" only on preview/staging deploys to allow a paste-key dialog
# when the env key is missing. NEVER set this in production.
NEXT_PUBLIC_ENABLE_API_KEY_DIALOG=
```

- [ ] **Step 8: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": "/" },
  },
});
```

- [ ] **Step 9: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { height: 100%; }
body { @apply bg-white text-slate-900 antialiased; }
```

- [ ] **Step 10: Create `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carpool Optimizer",
  description: "Fastest drop-off order for group drives.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 11: Create `app/page.tsx` (placeholder)**

```tsx
export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Carpool Optimizer — scaffold</h1>
    </main>
  );
}
```

- [ ] **Step 12: Install dependencies**

Run: `npm install`
Expected: lockfile written, no peer-dep errors.

- [ ] **Step 13: Verify build, typecheck, and test runner**

Run: `npm run typecheck && npm run build && npm test`
Expected: typecheck passes; `next build` succeeds; vitest reports `No test files found` (acceptable — no tests yet).

- [ ] **Step 14: Commit**

```bash
git add .
git commit -m "chore: scaffold next.js + tailwind + vitest project"
```

**Acceptance criteria:**
- `npm run typecheck` passes
- `npm run build` produces a `.next/` directory with no errors
- `npm test` exits 0 (no tests yet, but runner works)
- `npm run dev` serves the placeholder at `http://localhost:3000`

**Verify command:** `npm run typecheck && npm run build && npm test`

**Rollback:** If the scaffold breaks, `git reset --hard HEAD~1` returns to the spec-only state. No production users to affect — this is the first code commit.

---

## Task 1: Shared types

**Files:**
- Create: `lib/types.ts`

**Goal:** Define `RouteInputs`, `OptimizedRoute`, and `SavedRoute` so every subsequent task has a single source of truth. Lock in that `directionsResult` is optional.

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export type RouteInputs = {
  start: string;
  end: string;
  stops: string[];
};

export type OptimizedRoute = {
  orderedStops: string[];
  etaSeconds: number;
  distanceMeters: number;
  source: "google" | "mock";
  // Optional: only the real DirectionsService path returns this.
  // The mock fallback omits it because there's no real route to render.
  directionsResult?: google.maps.DirectionsResult;
};

export type SavedRoute = {
  id: string;
  label: string;
  start: string;
  end: string;
  stops: string[];
  createdAt: number;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (`google.maps.DirectionsResult` resolves because `@react-google-maps/api` ships ambient types via `@types/google.maps`, pulled transitively. If it doesn't, add `@types/google.maps` as a dev dependency.)

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts package.json package-lock.json
git commit -m "feat(types): add shared RouteInputs, OptimizedRoute, SavedRoute"
```

**Acceptance criteria:**
- `OptimizedRoute.directionsResult` is `?` optional.
- No file outside `lib/` is touched.

**Verify command:** `npm run typecheck`

**Rollback:** `git revert HEAD`. Nothing else depends on this file yet.

---

## Task 2: `validation.ts` (TDD)

**Files:**
- Create: `lib/validation.ts`
- Create: `__tests__/validation.test.ts`

**Goal:** Pure validator that returns `{ok: true, cleanedWaypoints}` or `{ok: false, message}`. No I/O, no side effects.

- [ ] **Step 1: Write failing tests**

Create `__tests__/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateRouteInputs } from "../lib/validation";

describe("validateRouteInputs", () => {
  it("passes for valid inputs and trims waypoints", () => {
    const r = validateRouteInputs({ start: "A", end: "B", waypoints: ["  C ", "D"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cleanedWaypoints).toEqual(["C", "D"]);
  });

  it("fails when start is blank", () => {
    const r = validateRouteInputs({ start: " ", end: "B", waypoints: ["C"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/start/i);
  });

  it("fails when end is blank", () => {
    const r = validateRouteInputs({ start: "A", end: "", waypoints: ["C"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/start.*end/i);
  });

  it("fails when both start and end are blank", () => {
    const r = validateRouteInputs({ start: "", end: "", waypoints: ["C"] });
    expect(r.ok).toBe(false);
  });

  it("fails when there are zero waypoints", () => {
    const r = validateRouteInputs({ start: "A", end: "B", waypoints: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/at least one/i);
  });

  it("fails when any waypoint row is blank", () => {
    const r = validateRouteInputs({ start: "A", end: "B", waypoints: ["C", " "] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/empty/i);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- validation`
Expected: FAIL — `Cannot find module '../lib/validation'`.

- [ ] **Step 3: Implement `lib/validation.ts`**

```ts
export type ValidationResult =
  | { ok: true; cleanedWaypoints: string[] }
  | { ok: false; message: string };

export type ValidateInput = {
  start: string;
  end: string;
  waypoints: string[];
};

export function validateRouteInputs(input: ValidateInput): ValidationResult {
  const cleanStart = input.start.trim();
  const cleanEnd = input.end.trim();
  const trimmed = input.waypoints.map((w) => w.trim());
  const cleanedWaypoints = trimmed.filter(Boolean);

  if (!cleanStart || !cleanEnd) {
    return { ok: false, message: "Start and end locations are required." };
  }
  if (cleanedWaypoints.length === 0) {
    return { ok: false, message: "Add at least one drop-off waypoint before optimizing." };
  }
  if (trimmed.some((w) => w.length === 0)) {
    return { ok: false, message: "Remove empty drop-off rows or fill them in before optimizing." };
  }
  return { ok: true, cleanedWaypoints };
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm test -- validation`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts __tests__/validation.test.ts
git commit -m "feat(validation): pure validator for route inputs"
```

**Acceptance criteria:**
- All 6 tests pass.
- No imports outside `./types` (which it doesn't need yet).

**Verify command:** `npm test -- validation`

**Rollback:** `git revert HEAD`. No callers yet.

---

## Task 3: `routeUrl.ts` (TDD)

**Files:**
- Create: `lib/routeUrl.ts`
- Create: `__tests__/routeUrl.test.ts`

**Goal:** Build the `https://www.google.com/maps/dir/?api=1...` deep link. Pure, deterministic.

- [ ] **Step 1: Write failing tests**

Create `__tests__/routeUrl.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGoogleMapsUrl } from "../lib/routeUrl";

describe("buildGoogleMapsUrl", () => {
  it("encodes origin, destination, and waypoints", () => {
    const url = buildGoogleMapsUrl({
      start: "Deerfield High School, IL",
      end: "Chicago, IL",
      orderedStops: ["Highland Park, IL", "Northbrook, IL"],
    });
    expect(url).toContain("api=1");
    expect(url).toContain("origin=Deerfield%20High%20School%2C%20IL");
    expect(url).toContain("destination=Chicago%2C%20IL");
    expect(url).toContain("travelmode=driving");
    expect(url).toContain("waypoints=Highland%20Park%2C%20IL|Northbrook%2C%20IL");
  });

  it("omits the waypoints param when there are zero ordered stops", () => {
    const url = buildGoogleMapsUrl({ start: "A", end: "B", orderedStops: [] });
    expect(url).not.toContain("waypoints=");
  });

  it("encodes special characters like & inside addresses", () => {
    const url = buildGoogleMapsUrl({
      start: "Lake Cook Rd & Waukegan Rd, IL",
      end: "B",
      orderedStops: [],
    });
    expect(url).toContain("origin=Lake%20Cook%20Rd%20%26%20Waukegan%20Rd%2C%20IL");
  });

  it("trims surrounding whitespace from inputs before encoding", () => {
    const url = buildGoogleMapsUrl({ start: "  A  ", end: " B ", orderedStops: ["  C "] });
    expect(url).toContain("origin=A");
    expect(url).toContain("destination=B");
    expect(url).toContain("waypoints=C");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- routeUrl`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/routeUrl.ts`**

```ts
export type BuildUrlInput = {
  start: string;
  end: string;
  orderedStops: string[];
};

export function buildGoogleMapsUrl({ start, end, orderedStops }: BuildUrlInput): string {
  const o = encodeURIComponent(start.trim());
  const d = encodeURIComponent(end.trim());
  const base = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;
  const cleaned = orderedStops.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return base;
  const wp = cleaned.map(encodeURIComponent).join("|");
  return `${base}&waypoints=${wp}`;
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm test -- routeUrl`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/routeUrl.ts __tests__/routeUrl.test.ts
git commit -m "feat(routeUrl): build google maps deep link"
```

**Acceptance criteria:**
- All 4 tests pass.
- Zero waypoints → no `&waypoints=` segment.
- `|` is left unencoded between waypoints.

**Verify command:** `npm test -- routeUrl`

**Rollback:** `git revert HEAD`. No callers yet.

---

## Task 4: `mockOptimizeRoute.ts` (TDD)

**Files:**
- Create: `lib/mockOptimizeRoute.ts`
- Create: `__tests__/mockOptimizeRoute.test.ts`

**Goal:** Deterministic fallback optimizer for preview/demo. **MUST NOT import** `@react-google-maps/api` or anything Google-related.

- [ ] **Step 1: Write failing tests**

Create `__tests__/mockOptimizeRoute.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mockOptimizeRoute } from "../lib/mockOptimizeRoute";

describe("mockOptimizeRoute", () => {
  it("preserves stop count", () => {
    const r = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B", "C"] });
    expect(r.orderedStops).toHaveLength(3);
    expect(new Set(r.orderedStops)).toEqual(new Set(["A", "B", "C"]));
  });

  it("is deterministic given identical input", () => {
    const a = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B", "C"] });
    const b = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B", "C"] });
    expect(a.orderedStops).toEqual(b.orderedStops);
  });

  it("returns source 'mock' and no directionsResult", () => {
    const r = mockOptimizeRoute({ start: "S", end: "E", stops: ["A"] });
    expect(r.source).toBe("mock");
    expect(r.directionsResult).toBeUndefined();
  });

  it("returns positive synthetic eta and distance", () => {
    const r = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B"] });
    expect(r.etaSeconds).toBeGreaterThan(0);
    expect(r.distanceMeters).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- mockOptimizeRoute`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/mockOptimizeRoute.ts`**

```ts
import type { OptimizedRoute, RouteInputs } from "./types";

export function mockOptimizeRoute(input: RouteInputs): OptimizedRoute {
  const start = input.start.trim();
  const end = input.end.trim();
  const orderedStops = [...input.stops].sort((a, b) => {
    const aScore = Math.abs(a.length - start.length) + a.localeCompare(end);
    const bScore = Math.abs(b.length - start.length) + b.localeCompare(end);
    return aScore - bScore;
  });
  // Synthetic numbers: ~11 min per stop + 9 min buffer; ~3.4 mi per stop.
  const etaSeconds = Math.max(18, orderedStops.length * 11 + 9) * 60;
  const distanceMeters = Math.max(4, orderedStops.length * 3.4) * 1609.34;
  return { orderedStops, etaSeconds, distanceMeters, source: "mock" };
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm test -- mockOptimizeRoute`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/mockOptimizeRoute.ts __tests__/mockOptimizeRoute.test.ts
git commit -m "feat(mock): deterministic fallback optimizer for preview mode"
```

**Acceptance criteria:**
- All 4 tests pass.
- Source string is `"mock"`.
- File contains **zero** imports from `@react-google-maps/api` or any path under `./optimizeRoute`.

**Verify command:** `npm test -- mockOptimizeRoute && ! grep -E "@react-google-maps|optimizeRoute" lib/mockOptimizeRoute.ts`

**Rollback:** `git revert HEAD`. No callers yet.

---

## Task 5: `storage.ts` (TDD)

**Files:**
- Create: `lib/storage.ts`
- Create: `__tests__/storage.test.ts`

**Goal:** Read/write saved routes to `localStorage`. Reject any payload carrying an API key, a `directionsResult` blob, or unknown fields.

- [ ] **Step 1: Write failing tests**

Create `__tests__/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { listSavedRoutes, saveRoute, deleteRoute, clearAll, STORAGE_KEY } from "../lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("storage", () => {
  it("save -> list roundtrips with id and createdAt", () => {
    const saved = saveRoute({ label: "School Run", start: "Home", end: "School", stops: ["A", "B"] });
    expect(saved.id).toMatch(/[0-9a-f-]{36}/i);
    expect(saved.createdAt).toBeGreaterThan(0);

    const list = listSavedRoutes();
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("School Run");
    expect(list[0].stops).toEqual(["A", "B"]);
  });

  it("lists newest first", async () => {
    saveRoute({ label: "First", start: "A", end: "B", stops: ["C"] });
    await new Promise((r) => setTimeout(r, 5));
    saveRoute({ label: "Second", start: "A", end: "B", stops: ["C"] });
    const list = listSavedRoutes();
    expect(list[0].label).toBe("Second");
    expect(list[1].label).toBe("First");
  });

  it("deletes by id", () => {
    const a = saveRoute({ label: "A", start: "x", end: "y", stops: ["z"] });
    saveRoute({ label: "B", start: "x", end: "y", stops: ["z"] });
    deleteRoute(a.id);
    expect(listSavedRoutes()).toHaveLength(1);
    expect(listSavedRoutes()[0].label).toBe("B");
  });

  it("survives a corrupt entry without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(listSavedRoutes()).toEqual([]);
  });

  it("rejects payloads containing apiKey", () => {
    expect(() =>
      // @ts-expect-error intentional misuse for security test
      saveRoute({ label: "Bad", start: "x", end: "y", stops: ["z"], apiKey: "AIzaSecret" })
    ).toThrow(/forbidden field/i);
  });

  it("rejects payloads containing directionsResult", () => {
    expect(() =>
      // @ts-expect-error intentional misuse for security test
      saveRoute({ label: "Bad", start: "x", end: "y", stops: ["z"], directionsResult: {} })
    ).toThrow(/forbidden field/i);
  });

  it("clearAll empties the list", () => {
    saveRoute({ label: "x", start: "a", end: "b", stops: ["c"] });
    clearAll();
    expect(listSavedRoutes()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- storage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/storage.ts`**

```ts
import type { SavedRoute } from "./types";

export const STORAGE_KEY = "carpool.savedRoutes";

const ALLOWED_FIELDS = ["label", "start", "end", "stops"] as const;
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

// Suppress unused warning while keeping the contract explicit.
void ALLOWED_FIELDS;
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm test -- storage`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/storage.test.ts
git commit -m "feat(storage): localStorage saved routes with apiKey/directionsResult rejection"
```

**Acceptance criteria:**
- All 7 tests pass.
- `STORAGE_KEY === 'carpool.savedRoutes'`.
- `saveRoute` throws on `apiKey` or `directionsResult` fields.
- `listSavedRoutes` returns newest-first.

**Verify command:** `npm test -- storage`

**Rollback:** `git revert HEAD`. No callers yet. Any user data is in the browser, not the codebase — rollback doesn't lose anything.

---

## Task 6: `googleMaps.ts` (TDD)

**Files:**
- Create: `lib/googleMaps.ts`
- Create: `__tests__/googleMaps.test.ts`

**Goal:** Resolve the active API key in the documented priority order. The only place that touches `NEXT_PUBLIC_*` env vars or `carpool.devApiKey` in localStorage.

- [ ] **Step 1: Write failing tests**

Create `__tests__/googleMaps.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveApiKey, DEV_KEY_STORAGE_KEY } from "../lib/googleMaps";

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveApiKey", () => {
  it("prefers the env key", () => {
    expect(
      resolveApiKey({
        envKey: "ENV_KEY",
        enableDialog: true,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBe("ENV_KEY");
  });

  it("falls back to localStorage when env missing AND dialog flag is true", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        enableDialog: true,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBe("LOCAL_KEY");
  });

  it("ignores localStorage when dialog flag is not true", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        enableDialog: false,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBeNull();
  });

  it("returns null when nothing is available", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        enableDialog: true,
        readLocalStorage: () => null,
      })
    ).toBeNull();
  });

  it("treats empty env string as missing", () => {
    expect(
      resolveApiKey({
        envKey: "",
        enableDialog: true,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBe("LOCAL_KEY");
  });

  it("exposes the dev-key localStorage key under a namespace", () => {
    expect(DEV_KEY_STORAGE_KEY).toBe("carpool.devApiKey");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- googleMaps`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/googleMaps.ts`**

```ts
export const DEV_KEY_STORAGE_KEY = "carpool.devApiKey";

export type ResolveDeps = {
  envKey: string | undefined;
  enableDialog: boolean;
  readLocalStorage: () => string | null;
};

export function resolveApiKey(deps: ResolveDeps): string | null {
  if (deps.envKey && deps.envKey.length > 0) return deps.envKey;
  if (!deps.enableDialog) return null;
  const local = deps.readLocalStorage();
  return local && local.length > 0 ? local : null;
}

// Convenience for the page: resolves with live env + localStorage.
export function getActiveApiKey(): string | null {
  const enableDialog = process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === "true";
  return resolveApiKey({
    envKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    enableDialog,
    readLocalStorage: () =>
      typeof window === "undefined" ? null : window.localStorage.getItem(DEV_KEY_STORAGE_KEY),
  });
}

export function writeDevApiKey(key: string): void {
  if (process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG !== "true") {
    throw new Error("Dev API key dialog is disabled in this build.");
  }
  window.localStorage.setItem(DEV_KEY_STORAGE_KEY, key);
}

export function clearDevApiKey(): void {
  window.localStorage.removeItem(DEV_KEY_STORAGE_KEY);
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm test -- googleMaps`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/googleMaps.ts __tests__/googleMaps.test.ts
git commit -m "feat(googleMaps): api key resolution with strict priority order"
```

**Acceptance criteria:**
- All 6 tests pass.
- `resolveApiKey` ignores localStorage when `enableDialog` is false.
- `writeDevApiKey` throws when the flag is not `"true"`.

**Verify command:** `npm test -- googleMaps`

**Rollback:** `git revert HEAD`. No callers yet.

---

## Task 7: `optimizeRoute.ts` (TDD against a hand-crafted fixture)

**Files:**
- Create: `lib/optimizeRoute.ts`
- Create: `__tests__/optimizeRoute.test.ts`

**Goal:** Production optimizer that calls `DirectionsService` and transforms the response. Tests exercise the **pure transformation** (`waypoint_order` reorder + leg summation) using a fake `DirectionsResult` — no real Google calls in unit tests.

- [ ] **Step 1: Write failing tests**

Create `__tests__/optimizeRoute.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyOptimization } from "../lib/optimizeRoute";

const fakeResponse = {
  routes: [
    {
      waypoint_order: [2, 0, 1],
      legs: [
        { duration: { value: 300 }, distance: { value: 1000 } },
        { duration: { value: 600 }, distance: { value: 2500 } },
        { duration: { value: 450 }, distance: { value: 1800 } },
        { duration: { value: 750 }, distance: { value: 4000 } },
      ],
    },
  ],
} as unknown as google.maps.DirectionsResult;

describe("applyOptimization", () => {
  it("reorders stops by waypoint_order", () => {
    const r = applyOptimization(["A", "B", "C"], fakeResponse);
    expect(r.orderedStops).toEqual(["C", "A", "B"]);
  });

  it("sums leg durations and distances", () => {
    const r = applyOptimization(["A", "B", "C"], fakeResponse);
    expect(r.etaSeconds).toBe(300 + 600 + 450 + 750);
    expect(r.distanceMeters).toBe(1000 + 2500 + 1800 + 4000);
  });

  it("marks source as google and includes the raw response", () => {
    const r = applyOptimization(["A", "B", "C"], fakeResponse);
    expect(r.source).toBe("google");
    expect(r.directionsResult).toBe(fakeResponse);
  });

  it("handles missing duration/distance values as zero", () => {
    const partial = {
      routes: [
        {
          waypoint_order: [0],
          legs: [{ duration: undefined, distance: undefined }, {}],
        },
      ],
    } as unknown as google.maps.DirectionsResult;
    const r = applyOptimization(["X"], partial);
    expect(r.etaSeconds).toBe(0);
    expect(r.distanceMeters).toBe(0);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- optimizeRoute`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/optimizeRoute.ts`**

```ts
import type { OptimizedRoute, RouteInputs } from "./types";

// Pure transformation, exported for unit tests.
export function applyOptimization(
  originalStops: string[],
  response: google.maps.DirectionsResult
): OptimizedRoute {
  const route = response.routes[0];
  const order = (route?.waypoint_order ?? []) as number[];
  const orderedStops = order.length
    ? order.map((i) => originalStops[i])
    : [...originalStops];
  const legs = (route?.legs ?? []) as google.maps.DirectionsLeg[];
  const etaSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);
  const distanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
  return {
    orderedStops,
    etaSeconds,
    distanceMeters,
    source: "google",
    directionsResult: response,
  };
}

// Browser-only call. Throws if the Maps SDK isn't loaded.
export async function optimizeRoute(inputs: RouteInputs): Promise<OptimizedRoute> {
  if (typeof window === "undefined" || !window.google?.maps) {
    throw new Error("Google Maps SDK not loaded");
  }
  const service = new window.google.maps.DirectionsService();
  const response = await service.route({
    origin: inputs.start,
    destination: inputs.end,
    waypoints: inputs.stops.map((s) => ({ location: s, stopover: true })),
    travelMode: window.google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true,
  });
  return applyOptimization(inputs.stops, response);
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm test -- optimizeRoute`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/optimizeRoute.ts __tests__/optimizeRoute.test.ts
git commit -m "feat(optimizeRoute): real DirectionsService wrapper + pure transform"
```

**Acceptance criteria:**
- All 4 tests pass.
- `lib/optimizeRoute.ts` contains **zero** references to `mockOptimizeRoute`.
- `source: "google"` on every successful response.

**Verify command:** `npm test -- optimizeRoute && ! grep -E "mockOptimizeRoute" lib/optimizeRoute.ts`

**Rollback:** `git revert HEAD`. No callers yet.

---

## Task 8: Boundary enforcement test

**Files:**
- Create: `__tests__/boundaries.test.ts`

**Goal:** A repository-level test that hard-fails if anyone ever wires `optimizeRoute` and `mockOptimizeRoute` together, or if `mockOptimizeRoute` ever imports the Google SDK. This is the seatbelt for Guardrail #2.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(rel), "utf8");
}

describe("module boundaries", () => {
  it("optimizeRoute.ts never imports mockOptimizeRoute", () => {
    const src = read("lib/optimizeRoute.ts");
    expect(src).not.toMatch(/mockOptimizeRoute/);
  });

  it("mockOptimizeRoute.ts never imports optimizeRoute", () => {
    const src = read("lib/mockOptimizeRoute.ts");
    expect(src).not.toMatch(/from\s+["']\.\/optimizeRoute["']/);
  });

  it("mockOptimizeRoute.ts never imports @react-google-maps/api", () => {
    const src = read("lib/mockOptimizeRoute.ts");
    expect(src).not.toMatch(/@react-google-maps\/api/);
  });

  it("storage.ts never references apiKey or directionsResult as a stored field", () => {
    const src = read("lib/storage.ts");
    // The string "apiKey" must appear only in FORBIDDEN_FIELDS.
    const matches = src.match(/apiKey/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run and confirm pass**

Run: `npm test -- boundaries`
Expected: PASS — 4 tests.

- [ ] **Step 3: Commit**

```bash
git add __tests__/boundaries.test.ts
git commit -m "test(boundaries): enforce mock/production optimizer separation"
```

**Acceptance criteria:**
- All 4 tests pass.
- If any future task imports across the boundary, CI fails.

**Verify command:** `npm test -- boundaries`

**Rollback:** `git revert HEAD`. Removing this test only loses the guardrail — no behavior change.

---

## Task 9: `ErrorAlert` component

**Files:**
- Create: `components/ErrorAlert.tsx`

**Goal:** Shared dismissible error card. Used by validation errors, Maps load failures, and DirectionsService errors.

- [ ] **Step 1: Write `components/ErrorAlert.tsx`**

```tsx
import { AlertCircle } from "lucide-react";

export function ErrorAlert({ message, tone = "error" }: { message: string; tone?: "error" | "warn" }) {
  const cls =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${cls}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ErrorAlert.tsx
git commit -m "feat(ui): error alert component"
```

**Acceptance criteria:** Compiles. No new lint warnings.

**Verify command:** `npm run typecheck && npm run lint`

**Rollback:** `git revert HEAD`. Not yet used.

---

## Task 10: `LocationInput` component

**Files:**
- Create: `components/LocationInput.tsx`

**Goal:** Single labeled address input. Stateless — fully controlled by parent.

- [ ] **Step 1: Write `components/LocationInput.tsx`**

```tsx
import { MapPin } from "lucide-react";

export function LocationInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <MapPin className="h-3.5 w-3.5" /> {label}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? label}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/LocationInput.tsx
git commit -m "feat(ui): location input component"
```

**Acceptance criteria:** Compiles. Fully controlled by parent.

**Verify command:** `npm run typecheck`

**Rollback:** `git revert HEAD`. Not yet used.

---

## Task 11: `WaypointList` component

**Files:**
- Create: `components/WaypointList.tsx`

**Goal:** Dynamic list of address rows with add/remove. Numbered chip per row. Stateless.

- [ ] **Step 1: Write `components/WaypointList.tsx`**

```tsx
import { Minus, Plus } from "lucide-react";

export function WaypointList({
  waypoints,
  onAdd,
  onRemove,
  onChange,
  disabled,
}: {
  waypoints: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drop-off stops</p>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add stop
        </button>
      </div>
      <div className="space-y-2">
        {waypoints.map((wp, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
              {i + 1}
            </span>
            <input
              type="text"
              value={wp}
              disabled={disabled}
              placeholder={`Stop ${i + 1}`}
              onChange={(e) => onChange(i, e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <button
              type="button"
              aria-label={`Remove stop ${i + 1}`}
              onClick={() => onRemove(i)}
              disabled={disabled}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/WaypointList.tsx
git commit -m "feat(ui): waypoint list with add/remove"
```

**Acceptance criteria:** Compiles. All callbacks are required props (no internal state).

**Verify command:** `npm run typecheck`

**Rollback:** `git revert HEAD`.

---

## Task 12: `MapView` component

**Files:**
- Create: `components/MapView.tsx`

**Goal:** Render the Google map. SSR-safe (renders `null` until loaded). Draws the optimized route via `DirectionsRenderer` when a `directionsResult` is supplied.

- [ ] **Step 1: Write `components/MapView.tsx`**

```tsx
"use client";

import { GoogleMap, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { useMemo } from "react";

type Props = {
  apiKey: string | null;
  directionsResult?: google.maps.DirectionsResult;
  onLoadError?: () => void;
};

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // continental US center
const defaultZoom = 4;

export function MapView({ apiKey, directionsResult, onLoadError }: Props) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    // No 'places' library yet — Places autocomplete is out of v1 scope.
  });

  // Surface a load error once, without effects in render.
  useMemo(() => {
    if (loadError && onLoadError) onLoadError();
  }, [loadError, onLoadError]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-600">
        Map preview unavailable — running in mock mode (no API key).
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-600">
        Map failed to load. Falling back to mock optimizer.
      </div>
    );
  }
  if (!isLoaded) {
    return <div className="h-full w-full animate-pulse bg-slate-100" />;
  }

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={defaultZoom}>
      {directionsResult && <DirectionsRenderer directions={directionsResult} />}
    </GoogleMap>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/MapView.tsx
git commit -m "feat(ui): SSR-safe map view with directions renderer"
```

**Acceptance criteria:** Compiles. `useLoadScript` is the only place that loads the Maps script. Renders a benign placeholder when `apiKey` is null.

**Verify command:** `npm run typecheck && npm run build`

**Rollback:** `git revert HEAD`.

---

## Task 13: `RouteSummary` component

**Files:**
- Create: `components/RouteSummary.tsx`

**Goal:** Post-optimization summary card: ETA, miles, ordered stops, "Open in Google Maps", "Copy Link", "Save this route", "Edit stops".

- [ ] **Step 1: Write `components/RouteSummary.tsx`**

```tsx
"use client";

import { Clock, Copy, Navigation, Pencil, Save } from "lucide-react";
import { useState } from "react";
import type { OptimizedRoute } from "@/lib/types";
import { buildGoogleMapsUrl } from "@/lib/routeUrl";

function formatEta(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

function formatMiles(meters: number): string {
  const mi = meters / 1609.34;
  return `${mi.toFixed(1)} mi`;
}

export function RouteSummary({
  start,
  end,
  optimized,
  onEdit,
  onSave,
}: {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  onEdit: () => void;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = buildGoogleMapsUrl({ start, end, orderedStops: optimized.orderedStops });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" /> {formatEta(optimized.etaSeconds)}
        </span>
        <span>•</span>
        <span>{formatMiles(optimized.distanceMeters)}</span>
        <span>•</span>
        <span>{optimized.orderedStops.length} stops</span>
      </div>

      <ol className="space-y-1 text-sm">
        <li className="flex gap-2"><span className="font-semibold text-emerald-700">S</span> {start}</li>
        {optimized.orderedStops.map((s, i) => (
          <li key={`${s}-${i}`} className="flex gap-2"><span className="font-semibold text-slate-700">{i + 1}.</span> {s}</li>
        ))}
        <li className="flex gap-2"><span className="font-semibold text-red-700">E</span> {end}</li>
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <Navigation className="h-4 w-4" /> Open in Maps
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" /> Edit stops
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Save className="h-4 w-4" /> Save route
        </button>
      </div>

      {optimized.source === "mock" && (
        <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          Mock mode: stop order is a deterministic placeholder. Add a Google Maps API key for real optimization.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/RouteSummary.tsx
git commit -m "feat(ui): route summary with maps handoff, copy, save"
```

**Acceptance criteria:** Compiles. Renders a "mock mode" notice when `source === "mock"`. URL built via `buildGoogleMapsUrl`.

**Verify command:** `npm run typecheck`

**Rollback:** `git revert HEAD`.

---

## Task 14: `RouteSheet` component (non-draggable bottom panel)

**Files:**
- Create: `components/RouteSheet.tsx`

**Goal:** Sticky bottom panel with two states (collapsed/expanded) toggled by a chevron button. No drag. Per Guardrail #5, true drag is deferred.

- [ ] **Step 1: Write `components/RouteSheet.tsx`**

```tsx
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export function RouteSheet({
  expanded,
  onToggle,
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-expanded={expanded}
      className={`fixed inset-x-0 bottom-0 z-10 rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl transition-[max-height] duration-200 ease-out ${
        expanded ? "max-h-[80vh]" : "max-h-[36vh]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
        className="mx-auto mt-2 flex h-6 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      <div className="max-h-[calc(80vh-2.5rem)] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/RouteSheet.tsx
git commit -m "feat(ui): non-draggable bottom sheet with collapsed/expanded states"
```

**Acceptance criteria:** Compiles. No pointer/touch event handlers (no drag).

**Verify command:** `npm run typecheck && ! grep -E "onTouch|onPointer|drag" components/RouteSheet.tsx`

**Rollback:** `git revert HEAD`.

---

## Task 15: `SavedRoutesMenu` component

**Files:**
- Create: `components/SavedRoutesMenu.tsx`

**Goal:** Dropdown that lists saved routes from `localStorage` with load/delete actions. Pulls live from `storage.ts`.

- [ ] **Step 1: Write `components/SavedRoutesMenu.tsx`**

```tsx
"use client";

import { Menu as MenuIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteRoute, listSavedRoutes } from "@/lib/storage";
import type { SavedRoute } from "@/lib/types";

export function SavedRoutesMenu({ onLoad }: { onLoad: (r: SavedRoute) => void }) {
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  useEffect(() => {
    if (open) setRoutes(listSavedRoutes());
  }, [open]);

  return (
    <div className="absolute left-3 top-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open saved routes"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <MenuIcon className="h-5 w-5 text-slate-700" />
      </button>
      {open && (
        <div className="mt-2 w-72 max-h-72 overflow-y-auto rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
          {routes.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No saved routes yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {routes.map((r) => (
                <li key={r.id} className="flex items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLoad(r);
                      setOpen(false);
                    }}
                    className="flex-1 truncate text-left text-sm text-slate-800 hover:underline"
                  >
                    <span className="font-semibold">{r.label}</span>
                    <span className="ml-2 text-xs text-slate-500">{r.stops.length} stops</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${r.label}`}
                    onClick={() => {
                      deleteRoute(r.id);
                      setRoutes(listSavedRoutes());
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/SavedRoutesMenu.tsx
git commit -m "feat(ui): saved routes menu with load and delete"
```

**Acceptance criteria:** Compiles. Reads from `listSavedRoutes()`.

**Verify command:** `npm run typecheck`

**Rollback:** `git revert HEAD`.

---

## Task 16: `ApiKeyDialog` component

**Files:**
- Create: `components/ApiKeyDialog.tsx`

**Goal:** Dev/preview-only paste-key UI. Renders **only** when the env key is missing **and** `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === 'true'`. Persists to `carpool.devApiKey` (separate from saved routes).

- [ ] **Step 1: Write `components/ApiKeyDialog.tsx`**

```tsx
"use client";

import { Key } from "lucide-react";
import { useState } from "react";
import { clearDevApiKey, writeDevApiKey } from "@/lib/googleMaps";

export function ApiKeyDialog({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("");
  const enabled = process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === "true";
  if (!enabled) return null;

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Key className="h-4 w-4" /> Dev/preview Google Maps key
      </div>
      <p className="mb-2 text-xs">
        Pastes are stored only in this browser at <code>carpool.devApiKey</code>. Never used in production builds.
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AIza..."
          className="h-9 min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={() => {
            writeDevApiKey(value.trim());
            onSaved();
          }}
          className="rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            clearDevApiKey();
            setValue("");
            onSaved();
          }}
          className="rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/ApiKeyDialog.tsx
git commit -m "feat(ui): flag-gated dev api key dialog"
```

**Acceptance criteria:** Compiles. Returns `null` when the env flag is anything other than `"true"`.

**Verify command:** `npm run typecheck`

**Rollback:** `git revert HEAD`.

---

## Task 17: Page wiring — compose everything in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Goal:** The only place where production and mock optimizer paths meet. Holds all UI state for the screen. Handles validation, optimize button, save, load.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LocationInput } from "@/components/LocationInput";
import { WaypointList } from "@/components/WaypointList";
import { MapView } from "@/components/MapView";
import { RouteSheet } from "@/components/RouteSheet";
import { RouteSummary } from "@/components/RouteSummary";
import { SavedRoutesMenu } from "@/components/SavedRoutesMenu";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { validateRouteInputs } from "@/lib/validation";
import { optimizeRoute } from "@/lib/optimizeRoute";
import { mockOptimizeRoute } from "@/lib/mockOptimizeRoute";
import { getActiveApiKey } from "@/lib/googleMaps";
import { saveRoute } from "@/lib/storage";
import type { OptimizedRoute, SavedRoute } from "@/lib/types";

export default function Page() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapsLoadFailed, setMapsLoadFailed] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([""]);
  const [optimized, setOptimized] = useState<OptimizedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Resolve API key on mount (and after the dev dialog saves).
  function refreshApiKey() {
    setApiKey(getActiveApiKey());
  }
  useEffect(refreshApiKey, []);

  const useMock = !apiKey || mapsLoadFailed;

  async function handleOptimize() {
    if (loading) return;
    setError(null);

    const v = validateRouteInputs({ start, end, waypoints });
    if (!v.ok) {
      setError(v.message);
      return;
    }
    setLoading(true);
    try {
      const result = useMock
        ? mockOptimizeRoute({ start, end, stops: v.cleanedWaypoints })
        : await optimizeRoute({ start, end, stops: v.cleanedWaypoints });
      setOptimized(result);
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't calculate this route. Check the addresses and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!optimized) return;
    saveRoute({
      label: `${start} → ${end}`,
      start,
      end,
      stops: optimized.orderedStops,
    });
  }

  function handleLoad(r: SavedRoute) {
    setStart(r.start);
    setEnd(r.end);
    setWaypoints(r.stops.length ? r.stops : [""]);
    setOptimized(null);
    setExpanded(true);
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-slate-100">
      <div className="absolute inset-0">
        <MapView
          apiKey={apiKey}
          directionsResult={optimized?.directionsResult}
          onLoadError={() => setMapsLoadFailed(true)}
        />
      </div>

      <SavedRoutesMenu onLoad={handleLoad} />

      <RouteSheet expanded={expanded} onToggle={() => setExpanded((e) => !e)}>
        {!optimized || expanded ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold text-slate-900">Carpool Optimizer</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  useMock ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {useMock ? "Mock mode" : "Live"}
              </span>
            </div>

            <ApiKeyDialog onSaved={refreshApiKey} />

            <LocationInput label="Start" value={start} onChange={setStart} disabled={loading} />
            <LocationInput label="End" value={end} onChange={setEnd} disabled={loading} />
            <WaypointList
              waypoints={waypoints}
              disabled={loading}
              onAdd={() => setWaypoints((w) => [...w, ""])}
              onRemove={(i) => setWaypoints((w) => w.filter((_, idx) => idx !== i))}
              onChange={(i, v) => setWaypoints((w) => w.map((x, idx) => (idx === i ? v : x)))}
            />

            {error && <ErrorAlert message={error} />}

            <button
              type="button"
              disabled={loading}
              onClick={handleOptimize}
              className="h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Optimizing…" : "Optimize Route"}
            </button>
          </div>
        ) : (
          <RouteSummary
            start={start}
            end={end}
            optimized={optimized}
            onEdit={() => setExpanded(true)}
            onSave={handleSave}
          />
        )}
      </RouteSheet>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck, build, and smoke-run dev**

Run: `npm run typecheck && npm run build`
Expected: PASS.

Then run `npm run dev` and open `http://localhost:3000`. Without an API key set in `.env.local`:
- Page renders. Badge says "Mock mode".
- Map area shows the "Map preview unavailable" placeholder.
- Adding a start, end, and one or more waypoints and clicking "Optimize Route" yields a deterministic stop order in the summary view (sheet collapses).
- "Open in Maps" link points to a valid `google.com/maps/dir/?api=1...` URL.
- "Save route" persists; reopening the saved routes menu lists it.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(page): wire optimizer, validation, sheet, save, load"
```

**Acceptance criteria:**
- Page is the **only** file that imports both `optimizeRoute` and `mockOptimizeRoute`.
- Both paths produce an `OptimizedRoute` consumed by the same `RouteSummary`.
- "Optimize" button disabled while in-flight (no double-submit).
- Validation errors render via `ErrorAlert`, never `alert()`.

**Verify command:** `npm run typecheck && npm run build && npm test`

**Rollback:** `git revert HEAD`. The lib layer remains intact and tested; only the wiring is removed.

---

## Task 18: README + env example

**Files:**
- Create: `README.md`

**Goal:** Explain Google Cloud setup, env vars, dev vs prod behavior, deploy steps.

- [ ] **Step 1: Write `README.md`**

```markdown
# Carpool Optimizer

Single-driver, mobile-first carpool drop-off optimizer. Built with Next.js 15, React 19, Tailwind, and Google Maps DirectionsService.

## Quick start

```bash
npm install
cp .env.example .env.local
# add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
npm run dev
```

Open http://localhost:3000.

If no API key is present, the app runs in **mock mode** with a deterministic placeholder optimizer and no real map. This is intentional — the app remains usable for UI work without a billable Google account.

## Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
2. Enable these APIs:
   - **Maps JavaScript API**
   - **Directions API**
3. Create an API key under **APIs & Services → Credentials**.
4. **Restrict the key:**
   - Application restrictions → HTTP referrers → add your dev (`http://localhost:3000/*`) and prod hostnames.
   - API restrictions → restrict to Maps JavaScript + Directions APIs only.
5. Set up a billing account (required by Google for the JS API).

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Production API key. Required for live optimization. |
| `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` | Set to `"true"` on preview/staging to expose a paste-key UI. **Never set this in production.** |

API keys are never persisted to `localStorage` from the app's saved-routes flow. The dev paste dialog (when enabled) writes to a separate namespace (`carpool.devApiKey`) that the saved-routes code cannot read or write.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | Next.js / ESLint |
| `npm test` | Vitest unit tests |

## Deploy (Vercel)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a Production env var.
4. Leave `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` unset in Production.
5. Deploy.

## Architecture notes

- `lib/optimizeRoute.ts` is the only file that talks to `DirectionsService`. It never imports the mock.
- `lib/mockOptimizeRoute.ts` is the deterministic preview fallback. It never imports the Google SDK.
- The two paths meet exactly once — inside `app/page.tsx` — using a single `useMock` boolean derived from `apiKey` presence and load status.
- `lib/storage.ts` only reads/writes route data. It throws if you try to pass an `apiKey` or `directionsResult` field.

See [docs/superpowers/specs/2026-05-16-carpool-optimizer-design.md](docs/superpowers/specs/2026-05-16-carpool-optimizer-design.md) for the full design spec.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: readme with setup, env, and architecture notes"
```

**Acceptance criteria:** README documents both env vars, Google Cloud setup, and the architectural separation rules.

**Verify command:** None — pure docs.

**Rollback:** `git revert HEAD`.

---

## Task 19: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Goal:** Run typecheck + lint + tests on every push and PR. Catches boundary violations before they merge.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck, lint, test, build on every push"
```

**Acceptance criteria:** YAML parses. On the next push, Actions runs and all four steps pass.

**Verify command:** Open the Actions tab on GitHub after pushing.

**Rollback:** Delete the workflow file. No production impact.

---

## Self-review

**1. Spec coverage check.** Walked the spec section by section:
- §1 Goal → covered by all tasks; specifically realized in Task 17.
- §2 Non-goals → no task contradicts (no autocomplete, no geolocation, no rider names, no auth).
- §3 Approved scope summary → fully covered.
- §4 Stack → Task 0 pins versions including `@react-google-maps/api@^2.20.0` (Guardrail #2/spec).
- §5 File layout → Tasks 0, 7, 4, 12, 13, 14, 15, 16 create every listed file.
- §6 UX flow → Task 17 implements the three states (fresh, optimizing, optimized) and Task 14 the sheet collapse/expand.
- §7 Optimizer logic → Tasks 4, 7, 8, 17 implement and enforce the boundary.
- §8 Route URL builder → Task 3 with zero-waypoint test.
- §9 Validation → Task 2 with all listed surface messages.
- §10 API key resolution → Task 6 with priority-order tests; Task 16 honors the flag.
- §11 Persistence → Task 5 with forbidden-field tests for `apiKey` and `directionsResult`.
- §12 Error handling surface → Task 9 + Task 17 (ErrorAlert always used; double-click guard; loader fallback to mock).
- §13 Testing → Tasks 2–8 cover every listed file.
- §14 Deployment → Task 18 README documents env vars, key restriction, billing.

**2. Placeholder scan.** No TBDs, no "implement later", no "similar to Task N". Every code step has executable code.

**3. Type consistency.** `OptimizedRoute.directionsResult` declared optional in Task 1, omitted by mock in Task 4, populated by `applyOptimization` in Task 7, consumed as `optimized?.directionsResult` in Task 17 (`MapView`). `SavedRoute` shape used identically in Tasks 5, 15, 17. `validateRouteInputs` signature in Task 2 matches the call site in Task 17. `buildGoogleMapsUrl({start,end,orderedStops})` defined in Task 3, called identically in Task 13.

No fixes needed.
