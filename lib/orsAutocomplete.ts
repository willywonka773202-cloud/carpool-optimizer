import type { Coord } from "./orsTypes";

const AUTOCOMPLETE_URL = "/api/ors/geocode/autocomplete";
const FALLBACK_AUTOCOMPLETE_URL = "/api/address-suggestions";

export type Suggestion = {
  label: string;
  coord: Coord;
};

type OrsAutocompleteResponse = {
  features?: Array<{
    properties?: { label?: string };
    geometry?: { coordinates?: [number, number] };
  }>;
};

export type AutocompleteFetch = typeof fetch;

/**
 * Fetch top autocomplete suggestions for a partial address. Returns [] on any
 * network/parse/non-ok response — autocomplete should never throw to its caller
 * because the user is mid-typing.
 */
export async function searchAutocomplete(
  text: string,
  apiKey: string | null,
  size = 5,
  fetchFn: AutocompleteFetch = fetch,
  signal?: AbortSignal
): Promise<Suggestion[]> {
  const trimmed = text.trim();
  if (trimmed.length < 3) return [];
  const url = apiKey
    ? `${AUTOCOMPLETE_URL}?api_key=${encodeURIComponent(
        apiKey
      )}&text=${encodeURIComponent(trimmed)}&size=${size}`
    : `${FALLBACK_AUTOCOMPLETE_URL}?text=${encodeURIComponent(trimmed)}&size=${size}`;

  let res: Response;
  try {
    res = await fetchFn(url, { signal });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let data: OrsAutocompleteResponse;
  try {
    data = (await res.json()) as OrsAutocompleteResponse;
  } catch {
    return [];
  }

  const features = data.features ?? [];
  const out: Suggestion[] = [];
  for (const f of features) {
    const label = f.properties?.label;
    const c = f.geometry?.coordinates;
    if (typeof label === "string" && Array.isArray(c) && c.length === 2) {
      out.push({ label, coord: { lat: c[1], lng: c[0] } });
    }
  }
  return out;
}
