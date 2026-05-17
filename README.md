# Carpool Optimizer

Single-driver, mobile-first carpool drop-off optimizer. Built with Next.js 15, React 19, Tailwind, and Google Maps DirectionsService.

A driver enters a start address, an end address, and a list of rider drop-off addresses. The app computes the fastest stop order using Google's `DirectionsService` (with `optimizeWaypoints: true`), renders the route on a Google Map, and hands off to native Google Maps for turn-by-turn navigation.

## Quick start

```bash
npm install
cp .env.example .env.local
# add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
npm run dev
```

Open http://localhost:3000.

If no API key is present, the app runs in **mock mode** with a deterministic placeholder optimizer and no real map. This is intentional — the UI remains usable for development and demos without a billable Google account.

## Google Cloud setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com).
2. Enable these APIs under **APIs & Services → Library**:
   - **Maps JavaScript API** (required — renders the map)
   - **Directions API** (required — computes the optimized route)
3. Create an API key under **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict the key** (this is important to prevent abuse):
   - Application restrictions → **HTTP referrers** → add your dev host (`http://localhost:3000/*`) and your production host (e.g. `https://your-app.vercel.app/*`).
   - API restrictions → **Restrict key** → select only **Maps JavaScript API** and **Directions API**.
5. Set up a billing account — Google requires this even for free-tier usage of the JS API.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Production API key. Required for live route optimization. |
| `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` | Set to `"true"` only on preview/staging deploys to expose a paste-key UI in the app. **Never set this in production.** |

Note: any variable prefixed with `NEXT_PUBLIC_` is inlined into the client bundle and visible to anyone who loads the page. That's expected for a Google Maps key — the HTTP referrer restriction (step 4 above) is what protects you from abuse, not secrecy.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | Next.js / ESLint |
| `npm test` | Vitest unit tests (one-shot) |
| `npm run test:watch` | Vitest in watch mode |

## How testing works

Pure helpers in `lib/` are unit-tested with Vitest. The full suite runs in under a second and exercises:

- Validation (`__tests__/validation.test.ts`)
- Google Maps deep-link URL building (`__tests__/routeUrl.test.ts`)
- Mock optimizer determinism (`__tests__/mockOptimizeRoute.test.ts`)
- localStorage round-trips and forbidden-field rejection (`__tests__/storage.test.ts`)
- API key resolution priority (`__tests__/googleMaps.test.ts`)
- `waypoint_order` transformation for the real optimizer (`__tests__/optimizeRoute.test.ts`)
- Architectural boundaries between the real and mock optimizer paths (`__tests__/boundaries.test.ts`)

There are no integration tests against the live Google API in v1 — the production optimizer's pure transformation is tested against hand-crafted `DirectionsResult` fixtures.

## Deploy (Vercel)

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a Production environment variable.
4. Leave `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` **unset** in Production. Set it to `true` only on Preview deploys if you want to test with a different key without redeploying.
5. Deploy. Vercel auto-detects Next.js 15.

## Architecture

```
app/page.tsx        # the only file that imports BOTH optimizers
components/         # presentational + composed UI
  MapView           # SSR-safe Google Map + DirectionsRenderer
  RouteSheet        # non-draggable bottom panel (v1)
  LocationInput / WaypointList / RouteSummary / ...
lib/
  optimizeRoute     # real Google DirectionsService — never imports mock
  mockOptimizeRoute # deterministic preview fallback — never imports Google
  routeUrl          # builds google.com/maps/dir/?api=1 deep link
  validation        # pure input validator
  storage           # localStorage, rejects apiKey/directionsResult payloads
  googleMaps        # API key resolution (env → flag-gated localStorage → null)
  types             # shared TS types
__tests__/          # unit tests for pure helpers + boundary contract
```

**Boundary rules (enforced by `__tests__/boundaries.test.ts`):**
- `lib/optimizeRoute.ts` is the only file that talks to `DirectionsService`. It never imports the mock.
- `lib/mockOptimizeRoute.ts` is the deterministic preview fallback. It never imports the Google SDK.
- The two paths meet exactly once — in `app/page.tsx` — via a single `useMock` boolean derived from the API key presence and Maps load status.
- `lib/storage.ts` reads/writes only route data. It throws if you pass it an `apiKey` or `directionsResult` field.

## Security notes

- **API keys** are never persisted to `localStorage` from the saved-routes flow. The optional dev-mode paste dialog writes to a separate namespace (`carpool.devApiKey`) that the saved-routes code cannot read or write.
- **Saved routes** store only `{id, label, start, end, stops, createdAt}`. The full Google `DirectionsResult` is never persisted (it would balloon localStorage and may contain account-linked data).
- **Restrict your Google Maps key by HTTP referrer.** Without restrictions, a public key can be lifted from the page source and used to drain your billing quota.

## Mock / demo mode

When no `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (or when the Maps script fails to load), the app shows an amber "Mock mode" badge and uses a deterministic placeholder optimizer instead of the real one. All other features work — including the Google Maps deep-link handoff, which is just URL construction and doesn't need an API key to generate.

This is intended for local development and design work. Don't ship a public deployment in mock mode — the stop order it returns is a length-based heuristic, not a real optimization.

## Known limitations (v1)

- Single driver only. Multi-driver coordination / rider-to-driver assignment is out of scope.
- No address autocomplete. Drivers type full addresses by hand. Places autocomplete is a logical v2 add.
- No "use my current location" button. Geolocation is deferred.
- No rider names attached to addresses. Saved routes show "Stop 1, Stop 2…" only.
- Bottom sheet is non-draggable. Drag gestures interact poorly with mobile keyboards and map gestures; v1 uses a chevron-toggled expand/collapse instead.
- The page must render in a browser. Server components do not call Google Maps.

## Spec & plan

The full design spec and implementation plan are in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
