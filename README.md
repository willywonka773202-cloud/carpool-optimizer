# Carpool Optimizer

A premium, mobile-first carpool drop-off optimizer. Drivers enter a start, an end, and a list of rider drop-offs; the app geocodes each address with OpenRouteService, solves the optimal stop order with the ORS Optimization API, renders the route on a Leaflet/OpenStreetMap map — then **hands off to native Google Maps** for turn-by-turn navigation. The handoff URL is built locally and does **not** require a Google Maps API key.

Built with Next.js 15, React 19, TypeScript, Tailwind, react-leaflet, and the OpenRouteService API.

## Why this stack

| Concern | Stack |
|---|---|
| Map UI | **Leaflet + react-leaflet** with **OpenStreetMap** tiles (CARTO Dark Matter) — no key required for tiles |
| Geocoding | **OpenRouteService** `/geocode/search` |
| Optimization | **OpenRouteService** `/optimization` (Vroom-based VRP solver) |
| Polyline | **OpenRouteService** `/v2/directions/driving-car/geojson` |
| Native navigation | **Google Maps deep link** (no API key needed — just a URL) |

## Quick start

```bash
npm install
cp .env.example .env.local
# add NEXT_PUBLIC_OPENROUTESERVICE_API_KEY=...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If no API key is present, the app runs in **demo mode** with a deterministic placeholder optimizer and a designed map illustration. Every other feature works — including the Google Maps handoff URL.

## OpenRouteService setup

1. Sign up for a free dev account at [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup).
2. Create a new token under **Dashboard → Tokens**.
3. Copy the token and put it in `.env.local` as `NEXT_PUBLIC_OPENROUTESERVICE_API_KEY=...`.
4. The free tier includes:
   - 2,000 geocoding requests / day (40 / minute)
   - 500 optimization requests / day (40 / minute)
   - 2,000 directions requests / day (40 / minute)
   For a single driver doing a few carpool runs a day, this is generous.

## How a single optimization call works (live mode)

1. **Geocode** start, end, and every drop-off address in parallel → `[lat, lng]` for each.
2. **Optimize** — POST the stops + start/end to ORS Optimization (one vehicle, N jobs). ORS returns the visit order.
3. **Directions** — POST the start + optimized stops + end to ORS Directions. ORS returns the road polyline and total time/distance.
4. **Render** the polyline on Leaflet with custom S/E markers and an autofit-bounds animation.
5. **Build the Google Maps handoff URL** from the optimized address order. The user clicks **Open Optimized Route in Google Maps** and the native Maps app takes over from there.

The Google Maps URL is constructed locally as a deep link and uses no Google APIs — see `lib/handoffUrl.ts`.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_OPENROUTESERVICE_API_KEY` | Required for live mode (geocoding + optimization + directions). |
| `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` | Set to `"true"` on Preview/staging to expose a paste-key dialog behind the settings gear. **Never set in Production.** |

`NEXT_PUBLIC_*` vars are inlined into the client bundle and visible to anyone who loads the page — that's expected for the ORS public token. ORS keys are bound to your account and rate-limited; restrict usage in your ORS dashboard if needed.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (one-shot) |
| `npm run test:watch` | Vitest watch mode |

## Testing

Pure helpers are unit-tested with Vitest. No live network calls — fetch is dependency-injected and tests use fake response objects.

| File | What it covers |
|---|---|
| `validation.test.ts` | Start/end blank, zero stops, blank rows, valid input, message ordering |
| `routeUrl.test.ts` | Google Maps URL encoding, zero waypoints, special characters |
| `handoffUrl.test.ts` | Optimized-order guarantee, no input-order leakage, single source of truth |
| `mockOptimizeRoute.test.ts` | Determinism, stop preservation, `source: 'mock'` |
| `storage.test.ts` | Save/list/delete/rename, riderNames alignment, forbidden-field rejection |
| `orsKey.test.ts` | API key priority (env → localStorage → null) |
| `orsHelpers.test.ts` | Geocoding + optimization order extraction + directions polyline parsing + HTTP 401/403 + incomplete-solution detection |
| `optimizeRoute.test.ts` | `composeOptimization` orchestration with stub deps, skip-optimize edge cases |
| `format.test.ts` | ETA + distance formatters |
| `waypointOps.test.ts` | move-up / move-down / duplicate / remove |
| `boundaries.test.ts` | Real/mock separation, storage forbidden-field discipline, ORS helpers never import map UI |

Total: **84 tests**.

## Architecture

```
app/
  layout.tsx       # ToastProvider wrapper, viewport, theme-color, manifest link
  page.tsx         # lifecycle reducer, mode resolution, desktop split / mobile sheet
  icon.tsx         # dynamic 32x32 favicon
  apple-icon.tsx   # dynamic 180x180 Apple touch icon
  globals.css      # theme tokens, safe-area helpers, skeleton + rise animations
components/
  ui/Button.tsx    # primary | secondary | ghost | success | danger
  ui/Badge.tsx     # live | demo | neutral | error
  ui/Card.tsx      # rounded surface
  MapView.tsx          # SSR-safe wrapper: shows DemoMapPreview when no key, else lazy-loads MapViewClient
  MapViewClient.tsx    # react-leaflet + OSM dark tiles + ORS polyline + S/E divIcon markers
  DemoMapPreview.tsx   # designed SVG illustration for demo/no-key mode
  RouteSheet.tsx       # non-draggable bottom sheet, two states
  RouteSummary.tsx     # ETA/distance/stops, ordered list, BIG green Open in Maps CTA (sticky)
  WaypointList.tsx     # add/remove/reorder/duplicate, undo, optional rider names
  LocationInput.tsx    # labeled input with clear button
  SavedRoutesMenu.tsx  # rename inline, delete, relative timestamps
  ApiKeyDialog.tsx     # flag-gated; shows "Detected/Not set"
  SettingsMenu.tsx     # gear icon in header that wraps ApiKeyDialog
  ErrorAlert.tsx       # error | warn | info, optional dismiss
  Toast.tsx            # ToastProvider + useToast hook
lib/
  optimizeRoute.ts     # composeOptimization (testable) + optimizeRoute (live, needs ORS key)
  mockOptimizeRoute.ts # deterministic preview fallback — never imports network or map UI
  orsGeocode.ts        # ORS geocoding, injectable fetch
  orsOptimize.ts       # ORS optimization (VRP), pure extractJobOrder + solveStopOrder
  orsDirections.ts     # ORS directions, pure extractDirections + fetchDirections
  orsKey.ts            # API key resolution (env first, flag-gated localStorage second)
  orsTypes.ts          # Coord, RoutePolyline shared types
  routeUrl.ts          # google.com/maps/dir/?api=1 deep link builder
  handoffUrl.ts        # typed wrapper that requires an OptimizedRoute (can't be misused)
  validation.ts        # input validator
  storage.ts           # localStorage saved routes, rename + updatedAt + riderNames
  format.ts            # ETA + distance formatters
  waypointOps.ts       # pure array reorder / duplicate / remove
  types.ts             # RouteInputs, OptimizedRoute, SavedRoute, OptimizationMode
__tests__/             # 84 unit tests + boundary contract
```

**Boundary rules (enforced by `__tests__/boundaries.test.ts`):**
- `lib/optimizeRoute.ts` is the only file that talks to ORS endpoints (via the three `ors*` helpers).
- `lib/mockOptimizeRoute.ts` is the deterministic fallback. It never imports network, ORS, leaflet, or any map UI.
- The two paths meet exactly once — in `app/page.tsx` — via a `useMock` boolean derived from API-key presence.
- `lib/storage.ts` reads/writes only route data. It throws on `apiKey` / `directionsResult` fields.
- `lib/handoffUrl.ts` is pure URL string construction; it never touches map libraries.

## Security

- **ORS API keys** are never written to the saved-routes namespace. The optional dev paste dialog writes to a separate key (`carpool.devOrsKey`) that the saved-routes code cannot read or write.
- **Saved routes** store only `{id, label, start, end, stops, createdAt, updatedAt?, riderNames?, etaSeconds?, distanceMeters?, source?}`. The full ORS response is never persisted.
- The repo never commits an API key. `.env.local` is gitignored. CI builds with no key (the app falls back to demo mode in tests).
- `NEXT_PUBLIC_*` keys are visible client-side — that's a property of the env-var prefix, not a leak. Restrict your ORS key by domain in the ORS dashboard for production use.

## Mode behavior

| Mode | When | What you see |
|---|---|---|
| **Live** | ORS env key present | Emerald badge, OSM map with the real ORS route polyline, live ETA/distance |
| **Demo** | No ORS env key (and no dev paste key) | Amber badge, designed demo map preview, deterministic mock optimizer |
| **Map error** | (Reserved) | Red badge, fallback to demo |

The handoff URL to native Google Maps is built locally from the optimized order in all modes — it works without any API key (Google or ORS).

## Deploy to Vercel

1. Push to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. **Framework Preset:** Next.js (auto).
4. Environment variables (Production):
   - `NEXT_PUBLIC_OPENROUTESERVICE_API_KEY` — your ORS token.
   - Leave `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` unset.
5. Deploy.
6. (Optional) restrict the ORS token in the ORS dashboard to your production origin.

CI (`.github/workflows/ci.yml`) runs `typecheck → lint → test → build` on every push and PR.

## Known limitations

- Single driver only — no multi-driver coordination.
- No Places-style autocomplete (ORS has a `/autocomplete` endpoint that could be wired in v3).
- No browser-geolocation "use my current location" button.
- Bottom sheet is non-draggable (two states toggled by chevron).
- Mock optimizer's ordering is a length-based heuristic (only used when no API key is set).
- No React component-level tests; pure logic only.

## Future improvements

- ORS autocomplete on address inputs.
- Browser geolocation for the start address.
- Drag-to-reorder waypoints.
- Route sharing across devices (would need a backend).
- Multi-driver assignment.
- Map controls overlay (recenter, fit-to-route).
- Stop markers (1..N) at geocoded coordinates, not just S/E.

## Repo metadata

The full v2 design notes are at `docs/superpowers/specs/2026-05-16-v2-premium-design.md`. The v1 spec + plan are alongside it.
