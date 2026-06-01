import { formatDistance, formatEta } from "./format";
import { formatScheduleDateTime, formatScheduleTime, getRideScheduleSnapshot } from "./schedule";
import type { OptimizedRoute, RidePlan, RoutePreferences, SavedRoute } from "./types";

type RideBriefInput = {
  start: string;
  end: string;
  optimized: Pick<OptimizedRoute, "orderedStops" | "etaSeconds" | "distanceMeters">;
  ridePlan: RidePlan;
  riderNames?: (string | null)[];
  routePreferences?: RoutePreferences;
};

function formatRoutePreferences(preferences?: RoutePreferences): string {
  if (!preferences) return "Default";

  const avoids = [
    preferences.avoidTolls ? "tolls" : null,
    preferences.avoidHighways ? "highways" : null,
    preferences.avoidFerries ? "ferries" : null,
    preferences.avoidReportedHazards ? "reported hazards" : null,
  ].filter((value): value is string => value !== null);

  return avoids.length > 0
    ? `${preferences.intent} · avoid ${avoids.join(", ")}`
    : preferences.intent;
}

function buildStopLines(stops: string[], riderNames?: (string | null)[]): string[] {
  if (stops.length === 0) return ["Stops: none"];

  return [
    "Stops:",
    ...stops.map((stop, index) => {
      const riderName = riderNames?.[index]?.trim();
      return `${index + 1}. ${riderName ? `${riderName} - ` : ""}${stop}`;
    }),
  ];
}

function buildChecklistLines(ridePlan: RidePlan): string[] {
  const checklist = ridePlan.checklist.map((item) => item.trim()).filter(Boolean);
  if (checklist.length === 0) return ["Checklist: none"];
  return ["Checklist:", ...checklist.map((item) => `- ${item}`)];
}

export function buildRideBrief(input: RideBriefInput): string {
  const driverName = input.ridePlan.driverName.trim() || "Me";
  const driverNote = input.ridePlan.driverNote?.trim();
  const schedule = getRideScheduleSnapshot(input.ridePlan, input.optimized.etaSeconds);
  const summaryLines = [
    "Carpool driver brief",
    `Driver: ${driverName}`,
    ...(driverNote ? [`Note: ${driverNote}`] : []),
    `Route: ${input.start} -> ${input.end}`,
    `Stops total: ${input.optimized.orderedStops.length}`,
    `Trip: ${formatEta(input.optimized.etaSeconds)} · ${formatDistance(input.optimized.distanceMeters)}`,
    `Route style: ${formatRoutePreferences(input.routePreferences)}`,
    schedule ? `Arrival: ${formatScheduleDateTime(schedule.arrivalAt)}` : "Arrival: Not scheduled",
    schedule?.departAt ? `Leave by: ${formatScheduleTime(schedule.departAt)}` : "Leave by: When ready",
    schedule?.reminderAt
      ? `Reminder: ${formatScheduleTime(schedule.reminderAt)}`
      : input.ridePlan.reminderMinutes > 0
        ? `Reminder: ${input.ridePlan.reminderMinutes} min before`
        : "Reminder: Off",
  ];

  return [...summaryLines, "", ...buildStopLines(input.optimized.orderedStops, input.riderNames), "", ...buildChecklistLines(input.ridePlan)].join("\n");
}

export function buildSavedRouteBrief(route: SavedRoute): string {
  return buildRideBrief({
    start: route.start,
    end: route.end,
    optimized: {
      orderedStops: route.stops,
      etaSeconds: route.etaSeconds ?? 0,
      distanceMeters: route.distanceMeters ?? 0,
    },
    ridePlan: route.ridePlan ?? {
      driverName: "",
      rideDate: "",
      arrivalTime: "",
      repeat: "none",
      seatsAvailable: 4,
      reminderMinutes: 0,
      checklist: [],
    },
    riderNames: route.riderNames,
    routePreferences: route.routePreferences,
  });
}
