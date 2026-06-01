import type { Coord } from "./orsTypes";
import type { RouteOption } from "./types";

export type FetchRouteOptionsInput = {
  start: Coord;
  end: Coord;
  stops: Coord[];
};

export async function fetchRouteOptions(
  input: FetchRouteOptionsInput,
  fetchFn: typeof fetch = fetch
): Promise<RouteOption[]> {
  const res = await fetchFn("/api/route-options", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { options?: RouteOption[] };
  return Array.isArray(data.options) ? data.options : [];
}
