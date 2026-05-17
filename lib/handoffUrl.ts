import { buildGoogleMapsUrl } from "./routeUrl";
import type { OptimizedRoute } from "./types";

/**
 * Build the Google Maps deep link from an OptimizedRoute. The TYPE here is
 * the safety: this helper cannot be called with raw input order — it only
 * accepts the `OptimizedRoute.orderedStops` from a real or mock optimization.
 *
 * Pair this with the rule: components must never construct the handoff URL
 * directly from `routeInputs.stops`; they must call this helper with the
 * post-optimization result.
 */
export function buildOptimizedHandoffUrl(
  start: string,
  end: string,
  optimized: OptimizedRoute
): string {
  return buildGoogleMapsUrl({
    start,
    end,
    orderedStops: optimized.orderedStops,
  });
}
