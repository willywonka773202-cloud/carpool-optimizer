# Carpool Route Optimizer — Design Spec

**Date:** 2026-05-16
**Status:** Approved for implementation planning
**Owner:** willywonka773202-cloud

## 1. Goal

A web app that lets a single driver enter a start address, a final destination, and a list of rider drop-off addresses, then computes the fastest stop order using Google Maps DirectionsService and hands off to the native Google Maps app for turn-by-turn navigation. Mobile-first, map-first, no login.

## 2. Non-goals (v1)

- Multi-driver coordination or rider-to-driver assignment.
- User accounts, server-side persistence, cross-device sync.
- Places autocomplete, browser geolocation, per-rider names/metadata.
- Mid-route re-optimization based on live traffic.
- Native iOS/Android apps. v1 is a web app only.

## 3. Approved scope summary

- Mobile-first, map-first single-page web app.
- Single driver, many riders.
- Inputs: start, end, dynamic drop-off list.
- Optimized waypoint ordering via Google `DirectionsService` with `optimizeWaypoints: true`.
- Route rendering via `DirectionsRenderer`.
- Native Google Maps handoff URL.
- Saved routes in `localStorage` (no backend).
- API key from env var; optional dev paste-key dialog gated by feature flag.
- Unit-tested pure helpers.

## 4. Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Familiar to owner; one-command Vercel deploy. |
| UI | React 19 + TypeScript | Type safety; matches stack. |
| Styling | Tailwind CSS | Utility-first; no design system overhead for v1. |
| Maps wrapper | `@react-google-maps/api@^2.20.0` | React 19 support starts at 2.20.0. 3.x has commercial licensing language — avoid until needed. |
| Icons | `lucide-react` | Wide icon set, consistent stroke. |
| State | Plain `useState` / `useReducer` in `app/page.tsx` | Scope too small to justify zustand. |
| Tests | Vitest | Fast, ESM-native, works cleanly with Next.js. |
| Persistence | `localStorage` only | No backend in v1. |

## 5. File layout

```
carpool-optimizer/
  app/
    layout.tsx                # root layout, viewport meta, font
    page.tsx                  # single screen: <MapView/> + <RouteSheet/>
    globals.css               # tailwind base
  components/
    MapView.tsx               # GoogleMap + DirectionsRenderer
    RouteSheet.tsx            # collapsed/expanded bottom panel (no drag in v1)
    LocationInput.tsx         # labeled address input
    WaypointList.tsx          # dynamic add/remove waypoints
    RouteSummary.tsx          # post-optimize: ETA, miles, ordered stops, CTAs
    SavedRoutesMenu.tsx       # list / load / delete from localStorage
    ApiKeyDialog.tsx          # dev-only paste UI, gated by feature flag
    ErrorAlert.tsx            # shared error card
  lib/
    optimizeRoute.ts          # production-only: wraps DirectionsService, transforms waypoint_order
    mockOptimizeRoute.ts      # preview/demo fallback only (never imported by optimizeRoute.ts)
    routeUrl.ts               # builds google.com/maps/dir/?api=1 deep link
    validation.ts             # input validation -> {ok, message}
    storage.ts                # save/load/list/delete saved routes
    googleMaps.ts             # API key resolution, shared loader options
    types.ts                  # RouteInputs, OptimizedRoute, SavedRoute
  __tests__/                  # unit tests for pure lib functions
  .env.example
  README.md
```

**Boundary rule:** `lib/optimizeRoute.ts` MUST NOT import `mockOptimizeRoute`. `lib/mockOptimizeRoute.ts` MUST NOT import `optimizeRoute` or anything from `@react-google-maps/api`. The two paths only meet inside `app/page.tsx`.

## 6. UX flow

### State 0 — fresh load
Map fills viewport, centered on a sensible default (continental US bounds, or last-used route's start if a saved route exists). Bottom sheet **expanded** showing:
- Hamburger icon (top-left of map) opens `SavedRoutesMenu`.
- Start Location input.
- End Location input.
- Waypoint list with one empty row.
- "+ Add stop" secondary button.
- Big "Optimize Route" primary button.
- Mode badge (small, near the optimize button): "Live optimizer" (green) when API key present, "Mock mode" (amber) when not.

### State 1 — optimizing
Primary button disabled, shows spinner + "Optimizing…". Inputs locked (read-only) to prevent edits mid-request. Double-click guard: button onClick early-returns if a request is in flight.

### State 2 — optimized
- Map renders the optimized route via `<DirectionsRenderer>` with numbered markers (`1`, `2`, … plus `S`/`E` for start/end).
- Bottom sheet **collapses** to a summary card showing:
  - ETA (formatted from `legs[].duration.value` sum)
  - Distance in miles (from `legs[].distance.value` sum, converted)
  - Ordered stop list (scrollable inside the card)
  - Green "Open in Google Maps" CTA → opens the deep-link URL in a new tab (mobile: launches native Maps)
  - "Copy Route Link" secondary CTA → `navigator.clipboard.writeText`, falls back to a selectable textarea when blocked
  - "Save this route" tertiary CTA → writes to `localStorage`
- A chevron button on the sheet header re-expands it for editing.
- "Edit stops" link inside the summary card also re-expands.

### State 3 — error
`ErrorAlert` card slots in above the primary button inside the expanded sheet. Sheet stays expanded so the driver can fix the issue immediately.

### Sheet behavior (v1 — non-draggable)
- Two states only: **collapsed** (~110px tall, summary view) and **expanded** (~75vh, full inputs).
- Toggled by a single tap on the sheet's chevron handle or by buttons inside the sheet.
- No drag gestures, no momentum, no snap intermediates — these break in too many real-world scenarios with maps, scrolling inputs, and mobile keyboards. Drag can be added in v2 if drivers actually want it.

## 7. Optimizer logic

### `lib/optimizeRoute.ts` (production)

```ts
import type { RouteInputs, OptimizedRoute } from './types';

export async function optimizeRoute(inputs: RouteInputs): Promise<OptimizedRoute> {
  if (typeof window === 'undefined' || !window.google?.maps) {
    throw new Error('Google Maps SDK not loaded');
  }
  const service = new window.google.maps.DirectionsService();
  const response = await service.route({
    origin: inputs.start,
    destination: inputs.end,
    waypoints: inputs.stops.map((s) => ({ location: s, stopover: true })),
    travelMode: window.google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true,
  });

  const route = response.routes[0];
  const order = route.waypoint_order;
  const orderedStops = order.map((i) => inputs.stops[i]);
  const etaSeconds = route.legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);
  const distanceMeters = route.legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);

  return { orderedStops, etaSeconds, distanceMeters, source: 'google', directionsResult: response };
}
```

### `lib/mockOptimizeRoute.ts` (preview/demo)

Deterministic heuristic sort (the one from the prompt's example component). Returns synthetic `etaSeconds` and `distanceMeters` derived from stop count. `source: 'mock'`. Never returns a `directionsResult` — the map renders an empty viewport when in mock mode and the badge tells the user.

### Caller — `app/page.tsx`

```ts
const useMock = !apiKey || googleMapsLoadError;
const result = useMock
  ? mockOptimizeRoute(inputs)
  : await optimizeRoute(inputs);
```

This is the **only** boundary between the two paths.

## 8. Route URL builder

`lib/routeUrl.ts`:

```
https://www.google.com/maps/dir/?api=1
  &origin=<encoded>
  &destination=<encoded>
  &travelmode=driving
  &waypoints=<encoded>|<encoded>|...
```

Zero ordered waypoints → omit `&waypoints=` entirely. All address values pass through `encodeURIComponent`; the `|` separator between waypoints is left unencoded (required by Google's URL spec).

## 9. Validation

`lib/validation.ts` returns `{ ok: true, cleanedWaypoints }` or `{ ok: false, message }`. Surface messages:

| Condition | Message |
|---|---|
| Blank start | `"Start and end locations are required."` |
| Blank end | `"Start and end locations are required."` |
| Zero waypoints | `"Add at least one drop-off waypoint before optimizing."` |
| Any blank waypoint row | `"Remove empty drop-off rows or fill them in before optimizing."` |
| `DirectionsService` non-OK status | `"Couldn't calculate this route. Check the addresses and try again."` (status code logged to console in dev) |
| Maps loader failure | `"Google Maps failed to load. Optimizing with offline fallback…"` then auto-runs `mockOptimizeRoute` |

## 10. API key resolution

`lib/googleMaps.ts` resolves the active key in this priority order:

1. `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — production source of truth.
2. `localStorage['carpool.devApiKey']` — **only** read if `process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === 'true'`.
3. Otherwise `null` → app runs in mock mode with a visible amber banner.

`ApiKeyDialog` renders only when:
- No env key is set, **and**
- `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === 'true'`.

Production builds without the flag will never expose the paste UI even if the env key is missing — they'll just run in mock mode.

## 11. Persistence (localStorage)

Single namespace key: `carpool.savedRoutes`. Schema:

```ts
type SavedRoute = {
  id: string;          // crypto.randomUUID()
  label: string;       // user-supplied or auto from start→end
  start: string;
  end: string;
  stops: string[];     // in the order the user saved (post-optimization if saved after optimize)
  createdAt: number;   // Date.now()
};
```

`storage.ts` API: `listSavedRoutes()`, `saveRoute(input)`, `deleteRoute(id)`, `clearAll()`. Reads are wrapped in try/catch — corrupt entries are silently dropped and the cleaned list is rewritten.

**Security rule:** `storage.ts` MUST NOT read or write any field containing an API key. The dev paste key lives at a separate, explicit key (`carpool.devApiKey`) accessed only by `googleMaps.ts`. The save/load flow has no path to either read or persist that value.

## 12. Error handling surface

- All user-visible errors render through `<ErrorAlert/>` — never `alert()` or `console.error` alone.
- The sheet stays expanded when an error is showing.
- Loading state: optimize button shows spinner + disabled. Second click is a no-op (state guard).
- Maps script load failure: fall back to mock + show amber banner + still let the user proceed.

## 13. Testing

Vitest unit tests for pure functions. No DOM, no Google SDK mocking beyond hand-constructed response objects.

| File | Coverage |
|---|---|
| `validation.test.ts` | missing start; missing end; both blank; zero waypoints; blank waypoint row; valid case |
| `routeUrl.test.ts` | basic encoding; addresses with spaces; addresses with `&`; zero ordered waypoints (no `&waypoints=` segment) |
| `optimizeRoute.test.ts` | `waypoint_order` transformation: given a mock `DirectionsResult` with `waypoint_order: [2, 0, 1]` and stops `['A','B','C']`, expect `['C','A','B']`; ETA/distance summation across legs |
| `mockOptimizeRoute.test.ts` | deterministic given same input; preserves stop count; returns `source: 'mock'` |
| `storage.test.ts` | save → load roundtrip; list ordering by `createdAt` desc; delete by id; corrupt entry survives; rejects any payload with an `apiKey` field |

CI: `npm run typecheck && npm run lint && npm test` on every push (GitHub Actions, simple matrix).

## 14. Deployment

- **Target:** Vercel.
- **Build:** `next build` — no custom config needed.
- **Runtime:** Node.js (default). No Edge runtime — `@react-google-maps/api` is browser-only, and there are no server routes in v1 anyway.
- **SSR safety:** `MapView` uses `useLoadScript` and renders `null` until `isLoaded === true`. No `window` access at module scope anywhere.
- **Env vars on Vercel:**
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — required in production.
  - `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` — leave unset in production; set to `true` only on Preview deploys if needed.
- **README must document:**
  - Enabling Maps JavaScript API and Directions API in Google Cloud Console.
  - Setting up the billing account (required by Google for the JS API).
  - Restricting the key by HTTP referrer to prevent quota theft.
  - The env var names and what they do.

## 15. Open questions (deferred to implementation plan)

- Default map center when no saved routes exist — pick a coordinate or `fitBounds` to the inputs as the user types?
- "Save this route" UX — auto-name (`<start> → <end>`) vs prompt for a label?
- Mobile keyboard behavior — when the keyboard pushes the sheet up, do we need any special handling? Probably not for a non-draggable sheet, but verify on a real device.

These are details, not scope changes. Implementation plan (writing-plans skill, next step) will resolve them.
