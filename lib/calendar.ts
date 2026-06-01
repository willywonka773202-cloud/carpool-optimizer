import type { OptimizedRoute, RidePlan, SavedRoute } from "./types";
import { getRideScheduleSnapshot } from "./schedule";

type CalendarEventInput = {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  ridePlan: RidePlan;
};

function formatUtcIcs(date: Date): string {
  const iso = date.toISOString().replace(/[-:]/g, "");
  return `${iso.slice(0, 15)}Z`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildCarpoolCalendarEvent(input: CalendarEventInput): string | null {
  const schedule = getRideScheduleSnapshot(input.ridePlan, input.optimized.etaSeconds);
  if (!schedule) return null;

  const startAt = schedule.departAt ?? schedule.arrivalAt;
  const endAt = schedule.arrivalAt;
  const lines = [
    `Driver: ${input.ridePlan.driverName.trim() || "Me"}`,
    `Route: ${input.start} -> ${input.end}`,
    `Stops: ${input.optimized.orderedStops.join(" | ") || "None"}`,
    `Reminder: ${
      input.ridePlan.reminderMinutes > 0
        ? `${input.ridePlan.reminderMinutes} minutes before departure`
        : "None"
    }`,
  ];

  if (input.ridePlan.checklist.length > 0) {
    lines.push(`Checklist: ${input.ridePlan.checklist.join(" | ")}`);
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carpool Optimizer//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@carpool-optimizer`,
    `DTSTAMP:${formatUtcIcs(new Date())}`,
    `DTSTART:${formatUtcIcs(startAt)}`,
    `DTEND:${formatUtcIcs(endAt)}`,
    `SUMMARY:${escapeIcsText(`Carpool: ${input.start} to ${input.end}`)}`,
    `DESCRIPTION:${escapeIcsText(lines.join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildSavedRouteCalendarEvent(route: SavedRoute): string | null {
  const ridePlan = route.ridePlan;
  if (!ridePlan) return null;

  return buildCarpoolCalendarEvent({
    start: route.start,
    end: route.end,
    optimized: {
      orderedStops: route.stops,
      etaSeconds: route.etaSeconds ?? 0,
      distanceMeters: route.distanceMeters ?? 0,
      source: route.source ?? "mock",
    },
    ridePlan,
  });
}
