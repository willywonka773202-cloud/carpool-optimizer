# Carpool Optimizer

A premium, mobile-first carpool drop-off optimizer. Drivers enter a start, an end, and a list of rider drop-offs; the app calls Google's `DirectionsService` with `optimizeWaypoints: true` to reorder the stops for the fastest route, renders the result on a Google Map, and hands off to native Google Maps for turn-by-turn navigation.

Built with Next.js 15, React 19, TypeScript, Tailwind, and `@react-google-maps/api`.

## What's new in v2

- **Premium dark UI** — Apple-Maps-style polish with deep slate gradients, glass surfaces, and consistent motion.
- **Toasts** for save, load, optimize success/failure, and clear actions.
- **Waypoint controls** — reorder up/down, duplicate, remove with 5-second undo, optional rider names per stop.
- **Lifecycle state machine** — explicit `editing → optimizing → optimized` phases with clean error recovery.
- **Saved-route management** — inline rename, polished empty state, relative timestamps, ETA/distance/source persisted with the route.
- **Desktop split layout** — fixed left control panel on `md+` screens; bottom sheet on mobile.
- **Mode badges** — Live, Demo, and Map error states are explicit and obvious.
- **PWA polish** — manifest, dynamic favicon, Apple touch icon, theme color, "Add to Home Screen" support.
- **Better formatting** — distance in ft below 0.1 mi and mi above; ETA in `min` / `h min`.
- **Boundary-tested architecture** — real and mock optimizer paths are isolated by automated tests.

## Quick start

```bash
npm install
cp .env.example .env.local
# add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If no API key is present, the app runs in **demo mode** with a deterministic placeholder optimizer and no real map rendering. Every other feature works.

## Google Cloud setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → Library**, enable:
   - **Maps JavaScript API**
   - **Directions API**
3. **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict the key** (do not skip):
   - **Application restrictions → HTTP referrers**: add `http://localhost:3000/*` and your production host (e.g. `https://<project>.vercel.app/*`).
   - **API restrictions → Restrict key**: select **Maps JavaScript API** and **Directions API** only.
5. Enable a billing account (Google requires it for the JS API even on free tier).

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Production API key. Required for live optimization. |
| `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` | Set to `"true"` on Preview/staging deploys to expose a paste-key dialog. **Never set in Production.** |

`NEXT_PUBLIC_*` vars are inlined into the client bundle and visible to anyone who loads the page. That is expected for a Google Maps key — the HTTP referrer restriction (above) is what prevents abuse, not secrecy.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | Next.js ESLint |
| `npm test` | Vitest unit tests (one-shot) |
| `npm run test:watch` | Vitest watch mode |

## Testing

Pure helpers live in `lib/` and are unit-tested with Vitest. The full suite runs in under three seconds. Coverage:

- `validation.test.ts` — start/end blank, zero stops, blank rows, valid input, error-message precedence
- `routeUrl.test.ts` — encoding, zero waypoints, special characters, whitespace trimming
- `mockOptimizeRoute.test.ts` — determinism, stop preservation, `source: "mock"`
- `storage.test.ts` — save/list/delete, rename, update with `updatedAt`, riderNames length alignment, forbidden-field rejection, corrupt-entry recovery
- `googleMaps.test.ts` — env-key priority, flag-gated localStorage fallback, null fallback
- `optimizeRoute.test.ts` — `waypoint_order` reordering, leg ETA/distance summation
- `format.test.ts` — ETA / distance formatters incl. edge cases
- `waypointOps.test.ts` — move-up, move-down, duplicate, remove
- `boundaries.test.ts` — real/mock optimizer separation, storage forbidden fields, new lib files purity

Total: **66 tests**.

There are no integration tests against the live Google API; the production optimizer's pure transformation is tested with hand-crafted `DirectionsResult` fixtures. Component-level tests are intentionally deferred — see "Known limitations".

## Deploy to Vercel

1. Push to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. **Framework Preset:** Next.js (auto).
4. Environment variables (Production):
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — your restricted key.
   - Leave `NEXT_PUBLIC_ENABLE_API_KEY_DIALOG` unset.
5. Deploy.
6. Copy the production URL and add `https://<project>.vercel.app/*` to the HTTP referrer restrictions on your Google Maps key in Google Cloud Console.

Every push to `main` and every PR runs the CI matrix (`typecheck → lint → test → build`) defined in `.github/workflows/ci.yml`.

## Architecture

```
app/
  layout.tsx       # ToastProvider wrapper, viewport, theme-color, manifest link
  page.tsx         # lifecycle reducer, mode resolution, desktop split / mobile sheet
  icon.tsx         # dynamic 32×32 favicon
  apple-icon.tsx   # dynamic 180×180 Apple touch icon
  globals.css      # theme tokens, safe-area helpers, skeleton + rise animations
components/
  ui/Button.tsx    # primary | secondary | ghost | success | danger
  ui/Badge.tsx     # live | demo | neutral | error
  ui/Card.tsx      # rounded surface
  MapView.tsx      # SSR-safe Google map with dark styling + premium empty states
  RouteSheet.tsx   # non-draggable bottom sheet, two states
  RouteSummary.tsx # ETA/distance/stops, ordered list, Open in Maps, Copy, Save
  WaypointList.tsx # add/remove/reorder/duplicate, undo, optional rider names
  LocationInput.tsx# labeled input with clear button
  SavedRoutesMenu.tsx # rename inline, delete, relative timestamps
  ApiKeyDialog.tsx # flag-gated; shows "Detected/Not set"
  ErrorAlert.tsx   # error | warn | info, optional dismiss
  Toast.tsx        # ToastProvider + useToast hook, success | error | info
lib/
  optimizeRoute.ts    # real Google DirectionsService — never imports mock
  mockOptimizeRoute.ts# deterministic preview fallback — never imports Google
  routeUrl.ts         # google.com/maps/dir/?api=1 deep link
  validation.ts       # input validator
  storage.ts          # localStorage saved routes, rename + updatedAt + riderNames
  googleMaps.ts       # API key resolution
  format.ts           # ETA + distance formatters
  waypointOps.ts      # pure array reorder/duplicate/remove
  types.ts            # RouteInputs, OptimizedRoute, SavedRoute, OptimizationMode
__tests__/            # 66 unit tests + boundary contract
```

**Boundary rules (enforced by `__tests__/boundaries.test.ts`):**
- `lib/optimizeRoute.ts` is the only file that talks to `DirectionsService`. It never imports the mock.
- `lib/mockOptimizeRoute.ts` is the deterministic fallback. It never imports the Google SDK.
- The two paths meet exactly once — in `app/page.tsx` — via a `useMock` boolean derived from API-key presence and Maps load status.
- `lib/storage.ts` reads/writes only route data. It throws if you pass it an `apiKey` or `directionsResult` field.

## Security

- **API keys** are never written to the saved-routes namespace. The optional dev paste dialog writes to a separate key (`carpool.devApiKey`) that the saved-routes code cannot read or write.
- **Saved routes** store only `{id, label, start, end, stops, createdAt, updatedAt?, riderNames?, etaSeconds?, distanceMeters?, source?}`. Raw `DirectionsResult` is never persisted.
- **Restrict your Google Maps key** by HTTP referrer. Without restrictions, a public key can be lifted and used to drain your billing quota.
- The repo never commits a real key. `.env.local` is gitignored. CI builds with no key (the app falls back to demo mode in tests).

## Mode behavior

| Mode | When | What you see |
|---|---|---|
| **Live** | Env key present and Maps script loaded | Emerald badge, real map, real DirectionsService optimization |
| **Demo** | No env key (and no dev paste key) | Amber badge, demo placeholder map, deterministic mock optimizer |
| **Map error** | Maps script failed to load (bad key, network) | Red badge, fallback to mock optimizer with a banner |

The handoff URL to native Google Maps is built locally from the optimized order in all three modes — it works without an API key.

## Known limitations (v2)

- Single driver only — no multi-driver coordination or rider-to-driver assignment.
- No Places Autocomplete — drivers type full addresses by hand.
- No browser-geolocation "use my current location" button.
- Bottom sheet is non-draggable (two states toggled by chevron). Drag conflicts with mobile keyboards and map gestures.
- Mock optimizer's ordering is a length-based heuristic, not a real solution.
- Component-level React tests are not in v1/v2; pure logic is tested instead.
- PWA icons are dynamic 32×32 / 180×180. For full app-store-grade installability, ship 192×192 and 512×512 PNGs in `public/icons/` and reference them in `public/manifest.webmanifest`.
- npm-audit shows two moderate advisories for vendored PostCSS inside Next.js internals — both are false positives (the suggested "fix" downgrades Next.js to 9.x).

## Future improvements

- Places Autocomplete on address inputs.
- Browser geolocation for the start address.
- Drag-to-reorder waypoints (currently up/down buttons).
- Route sharing across devices (would need a backend).
- Multi-driver assignment.
- Recurring carpools.
- Real PWA app icons in multiple sizes.

## Repo metadata

The full v2 design notes are at [docs/superpowers/specs/2026-05-16-v2-premium-design.md](docs/superpowers/specs/2026-05-16-v2-premium-design.md). The v1 spec + plan are alongside it.
