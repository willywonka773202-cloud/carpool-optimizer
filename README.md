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
npm run dev:local
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

On macOS you can also double-click [`/Users/willlambert/Documents/Carpool/Open Carpool.command`](/Users/willlambert/Documents/Carpool/Open%20Carpool.command). It installs dependencies if needed, starts the local dev server, and opens the app in your browser.

**Optimization works with no API key.** When no OpenRouteService key is present, the app still optimizes the real drop-off order for free: it geocodes the addresses via OpenStreetMap (Nominatim) and orders the stops with a nearest-neighbor solver, then draws the route line via the free OSRM service. An OpenRouteService key is an optional upgrade to road-distance ordering plus in-app ETAs. Either way, you hand off to a real navigation app (Google Maps, Waze, or Apple Maps) for turn-by-turn directions.

## Mobile cockpit (Build → Tune → Go)

The phone experience is a **fixed operational cockpit**, not a scrolling page. The layout is a pinned 4-region flex column — map (always visible, 28–32dvh) · status strip · stage body · stage rail + command bar — and the page itself never scrolls (`html, body { overflow: hidden }`). A single directional spine moves the driver through three stages:

- **Build** — Start/End/round-trip/swap/GPS (Trip sub-tab) and the per-stop stepper with reorder, duplicate, and undo-on-remove (Stops sub-tab). The map highlights and pans to the stop being edited.
- **Tune** — driver, seats, date, arrival, and route style (which picks among the alternate route lines). Intentionally minimal: no checklists, reminders, or avoidances.
- **Go** — a lean drive summary (hero ETA/distance, driver + seats, the ordered drop-off list, and route options) inside one short bounded scroll. A navigation-app picker (**Google Maps / Waze / Apple Maps**) chooses which app the pinned **Open in …** handoff launches; the choice is remembered.

Where content genuinely overflows (the Go summary, the Tune accordion, an open address dropdown) it scrolls **inside its own bounded region** — the map, status strip, stage rail, and command bar stay pinned. Saved routes (top-left), driver profile, and settings (top-right) float over the map and are reachable from every stage. Desktop (≥768px) reuses the same shared sub-panels in a two-column layout (28rem control panel beside a full-bleed map).

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
| `npm run dev:local` | Local dev pinned to http://127.0.0.1:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (one-shot) |
| `npm run test:watch` | Vitest watch mode |
| `npm run auto:expand` | Run one bounded Codex expansion pass for UI + persistence/database work |
| `npm run auto:expand:install` | Install the local 20-minute cron schedule for `auto:expand` |
| `npm run auto:expand:uninstall` | Remove the local cron schedule |

## Auto expansion

The repo includes an optional local automation harness under `automation/` and `scripts/`. It runs a bounded Codex pass that looks for one coherent product increment touching both the UI and the persistence layer. Runtime logs and summaries are written under `.automation/`, which is gitignored.

To enable the 20-minute cadence locally:

```bash
npm run auto:expand:install
```

The installer modifies your user crontab, so it is explicit and reversible with `npm run auto:expand:uninstall`. In this app, browser `localStorage` is the current database layer; the automation treats it that way unless a real database is deliberately introduced with schema, tests, and docs.

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

Total: **162 tests** (includes `cockpit.test.ts` for the Build → Tune → Go stage flow).

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
  MapViewClient.tsx    # react-leaflet + OSM dark tiles + ORS polyline + S/E divIcon markers + numbered 1..N stop markers
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
__tests__/             # 102 unit tests + boundary contract
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

## GPS & graceful fallbacks

- **Use my current location** — there's a button next to the Start field that requests the browser's `geolocation` permission. If granted, the start point uses your exact coordinates (no geocoding round trip) and the map fits to a route that begins there. Denying / timeout / unsupported all surface friendly inline messages — the manual address path always still works.
- **Nearest-neighbor fallback** — if ORS optimization fails or rate-limits, the app falls back to a local greedy nearest-neighbor solver on the geocoded coords. The route is still real; the solver is just simpler.
- **Straight-line polyline fallback** — if ORS directions fails, the app shows a straight-line polyline between the optimized stops and estimates the duration using a ~50 km/h average. The route order is still real; only the on-screen shape is approximate.

In all three fallback modes the Google Maps handoff URL is still built from the optimized stop order — Google Maps does the actual driving navigation, so visual approximation in this app doesn't degrade the result the driver follows.

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

- **Production tile servers**: the demo uses CARTO Dark Matter (free, but not for high-traffic production). For a public deployment, consider a paid tile provider (Mapbox, MapTiler) or your own raster cache to comply with OSM usage rules.
- Single driver only — no multi-driver coordination.
- Mock optimizer's ordering is a length-based heuristic (only used when no API key is set).
- No React component-level tests; pure logic only (no testing-library installed), so cockpit/stage logic is unit-tested via the pure `lib/cockpit.ts` helpers.
- On a phone with the on-screen keyboard up, a long address-autocomplete dropdown opens downward into the keyboard-occluded region (reachable via the bounded body scroll, but a portal/open-upward refinement is a future improvement). This is the standard iOS-keyboard-with-fixed-layout limitation.
- The map is mounted in two breakpoint branches, so crossing 768px (resize / tablet rotation) remounts Leaflet and re-fits the route; uncommon in real single-device use.

## Future improvements

- Address autocomplete — implemented (ORS `/autocomplete` with a Nominatim fallback).
- Browser geolocation for the start address — implemented via "Use my location" button.
- Portal-anchored / open-upward address dropdown so suggestions clear the mobile keyboard.
- Mount the map once across breakpoints so crossing 768px doesn't remount Leaflet.
- Drag-to-reorder waypoints (desktop; buttons used on mobile to avoid keyboard conflicts).
- Route sharing across devices (would need a backend).
- Multi-driver assignment.
- Map controls overlay (recenter, fit-to-route).
- Stop markers (1..N) at geocoded coordinates — now implemented with numbered blue divIcon markers and autofit-to-route framing.

## Repo metadata

The full v2 design notes are at `docs/superpowers/specs/2026-05-16-v2-premium-design.md`. The v1 spec + plan are alongside it.
