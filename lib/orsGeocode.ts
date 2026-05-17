import type { Coord } from "./orsTypes";

export type GeocodeFetch = typeof fetch;

const GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";

export async function geocodeAddress(
  address: string,
  apiKey: string,
  fetchFn: GeocodeFetch = fetch
): Promise<Coord> {
  const url = `${GEOCODE_URL}?api_key=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(
    address
  )}&size=1`;
  let res: Response;
  try {
    res = await fetchFn(url);
  } catch (err) {
    throw new Error(`Network error geocoding "${address}": ${(err as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("OpenRouteService rejected the API key. Check NEXT_PUBLIC_OPENROUTESERVICE_API_KEY.");
  }
  if (!res.ok) {
    throw new Error(`Geocoding failed for "${address}" (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const feature = data.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!coords) {
    throw new Error(`Couldn't find address: "${address}". Try a more specific address.`);
  }
  return { lat: coords[1], lng: coords[0] };
}
