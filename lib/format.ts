const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;
const FEET_PER_METER = 1 / METERS_PER_FOOT;
const MILE_THRESHOLD_METERS = 0.1 * METERS_PER_MILE;

function isUsable(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/** Format an ETA given in seconds as a short human label. */
export function formatEta(seconds: number | null | undefined): string {
  if (!isUsable(seconds)) return "—";
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const rem = totalMinutes % 60;
  return rem === 0 ? `${hours} h` : `${hours} h ${rem} min`;
}

/** Format a distance in meters using ft below 0.1 mi and mi above. */
export function formatDistance(meters: number | null | undefined): string {
  if (!isUsable(meters)) return "—";
  if (meters < MILE_THRESHOLD_METERS) {
    const feet = Math.round(meters * FEET_PER_METER);
    return `${feet} ft`;
  }
  const miles = meters / METERS_PER_MILE;
  return `${miles.toFixed(1)} mi`;
}
