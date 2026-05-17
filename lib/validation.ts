export type ValidationResult =
  | { ok: true; cleanedWaypoints: string[] }
  | { ok: false; message: string };

export type ValidateInput = {
  start: string;
  end: string;
  waypoints: string[];
};

export function validateRouteInputs(input: ValidateInput): ValidationResult {
  const cleanStart = input.start.trim();
  const cleanEnd = input.end.trim();
  const trimmed = input.waypoints.map((w) => w.trim());
  const cleanedWaypoints = trimmed.filter(Boolean);

  if (!cleanStart || !cleanEnd) {
    return { ok: false, message: "Start and end locations are required." };
  }
  if (trimmed.some((w) => w.length === 0)) {
    return { ok: false, message: "Remove empty drop-off rows or fill them in before optimizing." };
  }
  if (cleanedWaypoints.length === 0) {
    return { ok: false, message: "Add at least one drop-off waypoint before optimizing." };
  }
  return { ok: true, cleanedWaypoints };
}
