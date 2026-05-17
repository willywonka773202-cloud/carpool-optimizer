import type { OptimizedRoute, RouteInputs } from "./types";

/**
 * Real-route optimization via OpenRouteService.
 * Implementation arrives in Phase P2 (ORS geocode → optimize → directions).
 * The page falls back to the mock optimizer when this is unavailable or fails.
 */
export async function optimizeRoute(_inputs: RouteInputs): Promise<OptimizedRoute> {
  void _inputs;
  throw new Error(
    "Live ORS optimization is not yet wired in this build. Set NEXT_PUBLIC_OPENROUTESERVICE_API_KEY and rebuild after P2."
  );
}
