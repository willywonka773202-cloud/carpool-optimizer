# Carpool Optimizer v2 (Premium Polish) — Design Notes

**Date:** 2026-05-16
**Branch:** `premium/v2-polish` (from `main @ 7bc7b52`)
**Status:** Spec approved by user, executing.

## Mission

Turn the working v1 into a premium, app-store-quality web app. Deep upgrade — not cosmetic.

## Non-negotiable invariants (must NOT change)

1. **Optimizer boundary.** `lib/optimizeRoute.ts` is real Google only; `lib/mockOptimizeRoute.ts` is mock only; only `app/page.tsx` may import both. Boundary tests must continue to pass and should be expanded if new lib files are added.
2. **API key safety.** Env first, flag-gated paste dialog second, null third. Never persisted to `localStorage` saved-routes namespace. Never logged. Never exported.
3. **Saved route schema.** Only `{id, label, start, end, stops, createdAt, [updatedAt], [riderNames]}` and route summary numbers if useful. NEVER `apiKey`, NEVER raw `DirectionsResult`.
4. **Real route logic.** Real path must call `DirectionsService` with `optimizeWaypoints: true`, read `waypoint_order`, reorder, render with `DirectionsRenderer`.
5. **No fake premium.** Every button works. Every state is meaningful.

## Phase plan

| Phase | Scope | Files (high level) |
|---|---|---|
| **A** | Pure libs | `lib/format.ts` (new), `lib/waypointOps.ts` (new), `lib/types.ts` (expand for lifecycle + rider names), `lib/validation.ts` (tighten), `lib/storage.ts` (rename + updatedAt + rider names + dedupe ids) |
| **B** | Design system | `app/globals.css` (tokens), `tailwind.config.ts` (theme), `components/ui/Button.tsx` (new), `components/ui/Badge.tsx` (new), `components/ui/Card.tsx` (new) |
| **C1** | Toast + ErrorAlert | `components/Toast.tsx` (new), `components/ToastProvider.tsx` (new), `components/ErrorAlert.tsx` (dismissible + variants) |
| **C2** | Form components | `components/LocationInput.tsx` (clear, swap), `components/WaypointList.tsx` (reorder, duplicate, undo, rider name, large targets), `components/SavedRoutesMenu.tsx` (rename, polished empty) |
| **C3** | Result/map/dialog | `components/MapView.tsx` (skeleton, empty), `components/RouteSheet.tsx` (smooth states, sticky CTA), `components/RouteSummary.tsx` (badges, formatters, hierarchy), `components/ApiKeyDialog.tsx` (copy + session-state option) |
| **D** | Page integration | `app/page.tsx` (lifecycle reducer, mode banner, desktop split, toast wiring) |
| **E** | PWA + metadata | `public/manifest.webmanifest`, `app/layout.tsx` (theme-color, app icon), `app/icon.tsx` route |
| **F** | Docs + final | `README.md`, `.env.example` (any new flag), `__tests__/*` expansions |

## Test surface to add (in addition to existing 36)

- `format.test.ts` — `formatEta`, `formatMiles` (mi + ft), `formatDuration`
- `waypointOps.test.ts` — `moveStopUp`, `moveStopDown`, `duplicateStop`, `removeWithUndo` reducer
- `lifecycle.test.ts` — route state reducer transitions if a reducer is created
- Updated `storage.test.ts` — rename, updatedAt, optional `riderNames` array, deduped ids
- Updated `boundaries.test.ts` — confirm new lib files don't cross boundaries

## Visual direction

- Background: deep slate gradient
- Sheet: dark translucent with subtle blur, defined border, soft shadow
- Inputs: dark cards, bright focus ring
- Primary CTA (Optimize): blue→indigo gradient
- Nav CTA (Open in Maps): emerald
- Secondary CTAs (Copy, Save): neutral slate
- Demo badge: amber; Live badge: emerald
- Errors: restrained red

## Out of scope (deferred to v3+)

- Authentication, backend, multi-driver
- Real-time traffic re-optimization
- Places Autocomplete (deferred — adds Places API billing and complicates input flow; mark for v3)
- True drag-to-reorder waypoints (using buttons instead — drag conflicts with mobile keyboards)
- Recurring carpools, route sharing across devices, paid features

## Acceptance criteria

All 36 existing tests still pass. New tests pass. `typecheck`/`lint`/`test`/`build` clean. Real mode renders a Google route with a key. Demo mode works without a key. Saved routes round-trip. Mobile + desktop both look premium. Branch `premium/v2-polish` is clean and ready to merge.
