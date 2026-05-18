import type { RouteInputs } from "./types";

export const SHARE_ROUTE_PARAM = "route";

export type SharedRoute = RouteInputs & {
  riderNames?: (string | null)[];
};

type SharedRoutePayload = {
  v: 1;
  start: string;
  end: string;
  stops: string[];
  riderNames?: (string | null)[];
};

function normalizeRoute(input: SharedRoute): SharedRoute {
  const stopsWithRiders = input.stops
    .map((stop, index) => ({
      stop: stop.trim(),
      riderName: input.riderNames?.[index]?.trim() || null,
    }))
    .filter((item) => item.stop.length > 0);

  const route: SharedRoute = {
    start: input.start.trim(),
    end: input.end.trim(),
    stops: stopsWithRiders.map((item) => item.stop),
  };

  if (input.riderNames) {
    route.riderNames = stopsWithRiders.map((item) => item.riderName);
  }

  return route;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeSharedRoute(input: SharedRoute): string {
  const normalized = normalizeRoute(input);
  const payload: SharedRoutePayload = {
    v: 1,
    start: normalized.start,
    end: normalized.end,
    stops: normalized.stops,
    ...(normalized.riderNames ? { riderNames: normalized.riderNames } : {}),
  };
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeSharedRoute(token: string): SharedRoute | null {
  if (!token) return null;
  const json = decodeBase64Url(token);
  if (!json) return null;

  try {
    const payload = JSON.parse(json) as Partial<SharedRoutePayload>;
    if (
      payload.v !== 1 ||
      typeof payload.start !== "string" ||
      typeof payload.end !== "string" ||
      !Array.isArray(payload.stops) ||
      !payload.stops.every((stop) => typeof stop === "string")
    ) {
      return null;
    }
    if (
      payload.riderNames !== undefined &&
      (!Array.isArray(payload.riderNames) ||
        payload.riderNames.length !== payload.stops.length ||
        !payload.riderNames.every((name) => name === null || typeof name === "string"))
    ) {
      return null;
    }
    return normalizeRoute({
      start: payload.start,
      end: payload.end,
      stops: payload.stops,
      riderNames: payload.riderNames,
    });
  } catch {
    return null;
  }
}

export function buildShareRouteUrl(origin: string, pathname: string, route: SharedRoute): string {
  const url = new URL(pathname || "/", origin);
  url.searchParams.set(SHARE_ROUTE_PARAM, encodeSharedRoute(route));
  return url.toString();
}
