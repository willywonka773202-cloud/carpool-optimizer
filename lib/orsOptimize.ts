import type { Coord } from "./orsTypes";

export type OptimizeFetch = typeof fetch;

const OPTIMIZATION_URL = "https://api.openrouteservice.org/optimization";

type OrsOptimizationResponse = {
  routes?: Array<{
    steps?: Array<{ type: string; id?: number }>;
  }>;
};

/**
 * Pure transformation — extract job-visit order as 0-based indices into the
 * original stops array. ORS jobs are 1-indexed; we map back to 0-indexed.
 */
export function extractJobOrder(response: OrsOptimizationResponse): number[] {
  const steps = response.routes?.[0]?.steps ?? [];
  const order: number[] = [];
  for (const step of steps) {
    if (step.type === "job" && typeof step.id === "number") {
      order.push(step.id - 1);
    }
  }
  return order;
}

export async function solveStopOrder(
  start: Coord,
  end: Coord,
  stops: Coord[],
  apiKey: string,
  fetchFn: OptimizeFetch = fetch
): Promise<number[]> {
  if (stops.length === 0) return [];

  const body = {
    jobs: stops.map((s, i) => ({ id: i + 1, location: [s.lng, s.lat] })),
    vehicles: [
      {
        id: 1,
        profile: "driving-car",
        start: [start.lng, start.lat],
        end: [end.lng, end.lat],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetchFn(OPTIMIZATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Network error during route optimization: ${(err as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("OpenRouteService rejected the API key. Check NEXT_PUBLIC_OPENROUTESERVICE_API_KEY.");
  }
  if (!res.ok) {
    throw new Error(`Route optimization failed (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as OrsOptimizationResponse;
  const order = extractJobOrder(data);
  if (order.length !== stops.length) {
    throw new Error(
      `ORS returned an incomplete optimization (${order.length} of ${stops.length} stops).`
    );
  }
  return order;
}
