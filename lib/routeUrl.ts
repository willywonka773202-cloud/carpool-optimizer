export type BuildUrlInput = {
  start: string;
  end: string;
  orderedStops: string[];
};

export function buildGoogleMapsUrl({ start, end, orderedStops }: BuildUrlInput): string {
  const o = encodeURIComponent(start.trim());
  const d = encodeURIComponent(end.trim());
  const base = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;
  const cleaned = orderedStops.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return base;
  const wp = cleaned.map(encodeURIComponent).join("|");
  return `${base}&waypoints=${wp}`;
}
