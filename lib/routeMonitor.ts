import { formatDistance, formatEta } from "./format";
import { getRideReadiness } from "./rideReadiness";
import { formatScheduleDateTime, formatScheduleTime, getRideScheduleSnapshot } from "./schedule";
import type { RidePlan } from "./types";

export type RouteMonitorInput = {
  start: string;
  end: string;
  stops: string[];
  riderNames?: (string | null)[];
  ridePlan: RidePlan;
  etaSeconds?: number;
  distanceMeters?: number;
  routeLabel?: string;
  routeOptionCount?: number;
};

export type RouteMonitor = {
  status: "draft" | "attention" | "ready";
  badgeLabel: string;
  headline: string;
  subheadline: string;
  routeLine: string;
  seatLine: string;
  checklistLine: string;
  riderLine: string;
  arrivalLine: string;
  reminderLine: string;
};

export function buildRouteMonitor(input: RouteMonitorInput): RouteMonitor {
  const readiness = getRideReadiness({
    start: input.start,
    end: input.end,
    stops: input.stops,
    riderNames: input.riderNames,
    ridePlan: input.ridePlan,
  });
  const schedule = getRideScheduleSnapshot(input.ridePlan, input.etaSeconds);
  const hasRouteMetrics =
    typeof input.etaSeconds === "number" && typeof input.distanceMeters === "number";
  const badgeLabel =
    readiness.status === "ready"
      ? "Ready to drive"
      : readiness.status === "attention"
        ? "Needs attention"
        : "Draft route";

  let headline = "Add route details";
  let subheadline = "Start with pickup, destination, and rider stops.";

  if (schedule?.departAt && hasRouteMetrics) {
    headline = `Leave ${formatScheduleTime(schedule.departAt)}`;
    subheadline = `Arrive ${formatScheduleDateTime(schedule.arrivalAt)}`;
  } else if (readiness.missingCoreInputs.length > 0) {
    headline = readiness.missingCoreInputs[0];
    subheadline =
      readiness.missingCoreInputs.length > 1
        ? `${readiness.missingCoreInputs.length} inputs missing`
        : "Complete the route to unlock planning.";
  } else if (readiness.attentionItems.length > 0) {
    headline = readiness.attentionItems[0];
    subheadline = "Driver workflow still needs cleanup.";
  } else if (schedule?.arrivalAt) {
    headline = `Arrive ${formatScheduleDateTime(schedule.arrivalAt)}`;
    subheadline = schedule.reminderAt
      ? `Reminder ${formatScheduleTime(schedule.reminderAt)}`
      : "Add a route to estimate departure.";
  } else if (hasRouteMetrics) {
    headline = `${formatEta(input.etaSeconds ?? 0)} drive`;
    subheadline = `${formatDistance(input.distanceMeters ?? 0)} planned`;
  }

  const routeLine = hasRouteMetrics
    ? [
        input.routeLabel ?? "Optimized route",
        formatEta(input.etaSeconds ?? 0),
        formatDistance(input.distanceMeters ?? 0),
        input.routeOptionCount && input.routeOptionCount > 1
          ? `${input.routeOptionCount} options`
          : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · ")
    : `${readiness.totalStops} stop${readiness.totalStops === 1 ? "" : "s"} queued`;

  const totalChecklistItems = readiness.filledChecklistItems + readiness.blankChecklistItems;
  const seatLine = `${Math.min(readiness.totalStops, input.ridePlan.seatsAvailable)}/${input.ridePlan.seatsAvailable} seats`;
  const checklistLine =
    totalChecklistItems > 0
      ? `${readiness.filledChecklistItems}/${totalChecklistItems} prep ready`
      : "No prep list";
  const riderLine =
    readiness.totalStops > 0
      ? `${readiness.namedRiders}/${readiness.totalStops} riders named`
      : "No riders queued";
  const arrivalLine = schedule ? formatScheduleDateTime(schedule.arrivalAt) : "Not scheduled";
  const reminderLine = schedule?.reminderAt ? formatScheduleTime(schedule.reminderAt) : "Off";

  return {
    status: readiness.status,
    badgeLabel,
    headline,
    subheadline,
    routeLine,
    seatLine,
    checklistLine,
    riderLine,
    arrivalLine,
    reminderLine,
  };
}
