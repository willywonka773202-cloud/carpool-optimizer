import { formatScheduleDateTime, formatScheduleTime, getRideScheduleSnapshot } from "./schedule";
import type { RidePlan } from "./types";

export type RideReadinessInput = {
  start: string;
  end: string;
  stops: string[];
  riderNames?: (string | null)[];
  ridePlan: RidePlan;
};

export type RideReadiness = {
  totalStops: number;
  namedRiders: number;
  unnamedStops: number;
  filledChecklistItems: number;
  blankChecklistItems: number;
  hasStart: boolean;
  hasEnd: boolean;
  hasSchedule: boolean;
  isOverCapacity: boolean;
  spareSeats: number;
  missingCoreInputs: string[];
  attentionItems: string[];
  status: "draft" | "attention" | "ready";
  arrivalLabel: string;
  reminderLabel: string;
  repeatLabel: string;
};

function formatRepeatLabel(repeat: RidePlan["repeat"]): string {
  switch (repeat) {
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekly":
      return "Weekly";
    default:
      return "One-time";
  }
}

export function getRideReadiness(input: RideReadinessInput): RideReadiness {
  const totalStops = input.stops.map((stop) => stop.trim()).filter(Boolean).length;
  const riderNames = input.riderNames ?? [];
  const namedRiders = riderNames
    .slice(0, totalStops)
    .filter((name) => typeof name === "string" && name.trim().length > 0).length;
  const unnamedStops = Math.max(totalStops - namedRiders, 0);
  const filledChecklistItems = input.ridePlan.checklist.filter((item) => item.trim().length > 0).length;
  const blankChecklistItems = input.ridePlan.checklist.filter((item) => item.trim().length === 0).length;
  const hasStart = input.start.trim().length > 0;
  const hasEnd = input.end.trim().length > 0;
  const isOverCapacity = totalStops > input.ridePlan.seatsAvailable;
  const spareSeats = Math.max(input.ridePlan.seatsAvailable - totalStops, 0);
  const schedule = getRideScheduleSnapshot(input.ridePlan);
  const missingCoreInputs = [
    ...(hasStart ? [] : ["Add a start point"]),
    ...(hasEnd ? [] : ["Add an end point"]),
    ...(totalStops > 0 ? [] : ["Add at least one rider stop"]),
  ];
  const attentionItems = [
    ...(isOverCapacity
      ? [`Capacity is short by ${totalStops - input.ridePlan.seatsAvailable} seat${totalStops - input.ridePlan.seatsAvailable === 1 ? "" : "s"}`]
      : []),
    ...(schedule ? [] : ["Add a ride date and arrival time"]),
    ...(unnamedStops > 0 ? [`Name ${unnamedStops} stop${unnamedStops === 1 ? "" : "s"} for a clearer drop-off order`] : []),
    ...(blankChecklistItems > 0 ? [`Finish ${blankChecklistItems} checklist item${blankChecklistItems === 1 ? "" : "s"}`] : []),
  ];

  const status =
    missingCoreInputs.length > 0 ? "draft" : attentionItems.length > 0 ? "attention" : "ready";

  return {
    totalStops,
    namedRiders,
    unnamedStops,
    filledChecklistItems,
    blankChecklistItems,
    hasStart,
    hasEnd,
    hasSchedule: Boolean(schedule),
    isOverCapacity,
    spareSeats,
    missingCoreInputs,
    attentionItems,
    status,
    arrivalLabel: schedule ? formatScheduleDateTime(schedule.arrivalAt) : "Not scheduled",
    reminderLabel: schedule?.reminderAt ? formatScheduleTime(schedule.reminderAt) : "Off",
    repeatLabel: formatRepeatLabel(input.ridePlan.repeat),
  };
}
