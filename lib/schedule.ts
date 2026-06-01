import type { RidePlan, SavedRoute } from "./types";

export type RideScheduleSnapshot = {
  arrivalAt: Date;
  departAt?: Date;
  reminderAt?: Date;
  isUpcoming: boolean;
};

export type UpcomingSavedRoute = {
  route: SavedRoute;
  schedule: RideScheduleSnapshot;
};

export type RideScheduleStatus = {
  tone: "scheduled" | "reminder" | "depart" | "late";
  headline: string;
  detail: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDateParts(dateText: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText);
}

function isValidTimeParts(timeText: string): boolean {
  return /^\d{2}:\d{2}$/.test(timeText);
}

export function parseRideArrival(ridePlan: RidePlan): Date | null {
  if (!isValidDateParts(ridePlan.rideDate) || !isValidTimeParts(ridePlan.arrivalTime)) return null;
  const [year, month, day] = ridePlan.rideDate.split("-").map(Number);
  const [hours, minutes] = ridePlan.arrivalTime.split(":").map(Number);
  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toCandidateWithTime(day: Date, template: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    template.getHours(),
    template.getMinutes(),
    0,
    0
  );
}

function nextWeeklyCandidate(baseArrival: Date, now: Date): Date {
  let candidate = new Date(baseArrival);
  while (candidate.getTime() < now.getTime()) {
    candidate = addDays(candidate, 7);
  }
  return candidate;
}

function nextDailyCandidate(baseArrival: Date, now: Date): Date {
  const day = startOfDay(now);
  const todayCandidate = toCandidateWithTime(day, baseArrival);
  return todayCandidate.getTime() >= now.getTime() ? todayCandidate : addDays(todayCandidate, 1);
}

function nextWeekdayCandidate(baseArrival: Date, now: Date): Date {
  let offset = 0;
  while (offset < 14) {
    const candidate = addDays(startOfDay(now), offset);
    const dayOfWeek = candidate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      offset += 1;
      continue;
    }
    const timedCandidate = toCandidateWithTime(candidate, baseArrival);
    if (timedCandidate.getTime() >= now.getTime()) return timedCandidate;
    offset += 1;
  }
  return nextDailyCandidate(baseArrival, now);
}

export function getRideScheduleSnapshot(
  ridePlan: RidePlan,
  etaSeconds?: number,
  now = new Date()
): RideScheduleSnapshot | null {
  const baseArrival = parseRideArrival(ridePlan);
  if (!baseArrival) return null;

  let arrivalAt = baseArrival;
  if (ridePlan.repeat === "daily") {
    arrivalAt = nextDailyCandidate(baseArrival, now);
  } else if (ridePlan.repeat === "weekdays") {
    arrivalAt = nextWeekdayCandidate(baseArrival, now);
  } else if (ridePlan.repeat === "weekly") {
    arrivalAt = nextWeeklyCandidate(baseArrival, now);
  }

  const departAt =
    typeof etaSeconds === "number" && etaSeconds > 0
      ? new Date(arrivalAt.getTime() - etaSeconds * 1000)
      : undefined;
  const reminderAt =
    ridePlan.reminderMinutes > 0
      ? new Date(
          (departAt ?? arrivalAt).getTime() - ridePlan.reminderMinutes * 60 * 1000
        )
      : undefined;

  return {
    arrivalAt,
    departAt,
    reminderAt,
    isUpcoming: arrivalAt.getTime() >= now.getTime(),
  };
}

export function getNextSavedRoute(route: SavedRoute, now = new Date()): RideScheduleSnapshot | null {
  return getRideScheduleSnapshot(
    route.ridePlan ?? {
      driverName: "",
      rideDate: "",
      arrivalTime: "",
      repeat: "none",
      seatsAvailable: 4,
      reminderMinutes: 0,
      checklist: [],
    },
    route.etaSeconds,
    now
  );
}

export function listUpcomingSavedRoutes(
  routes: SavedRoute[],
  now = new Date()
): UpcomingSavedRoute[] {
  return routes
    .map((route) => {
      const schedule = getNextSavedRoute(route, now);
      return schedule?.isUpcoming ? { route, schedule } : null;
    })
    .filter((entry): entry is UpcomingSavedRoute => entry !== null)
    .sort((a, b) => a.schedule.arrivalAt.getTime() - b.schedule.arrivalAt.getTime());
}

export function formatScheduleDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatScheduleTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeUntil(date: Date, now = new Date()): string {
  const diffMinutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (diffMinutes <= 1) return "now";
  if (diffMinutes < 60) return `in ${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes === 0 ? `in ${hours} h` : `in ${hours} h ${minutes} min`;
}

export function getRideScheduleStatus(
  schedule: RideScheduleSnapshot,
  now = new Date()
): RideScheduleStatus {
  if (!schedule.isUpcoming || schedule.arrivalAt.getTime() < now.getTime()) {
    return {
      tone: "late",
      headline: "Arrival time passed",
      detail: `Scheduled for ${formatScheduleDateTime(schedule.arrivalAt)}`,
    };
  }

  if (schedule.departAt && now.getTime() >= schedule.departAt.getTime()) {
    return {
      tone: "depart",
      headline: "Leave now",
      detail: `Arrive ${formatScheduleTime(schedule.arrivalAt)}`,
    };
  }

  if (schedule.reminderAt && now.getTime() >= schedule.reminderAt.getTime()) {
    return {
      tone: "reminder",
      headline: "Reminder window",
      detail: schedule.departAt
        ? `Leave ${formatTimeUntil(schedule.departAt, now)}`
        : `Arrive ${formatTimeUntil(schedule.arrivalAt, now)}`,
    };
  }

  if (schedule.reminderAt) {
    return {
      tone: "scheduled",
      headline: `Reminder ${formatTimeUntil(schedule.reminderAt, now)}`,
      detail: `Arrive ${formatScheduleTime(schedule.arrivalAt)}`,
    };
  }

  return {
    tone: "scheduled",
    headline: `Arrive ${formatTimeUntil(schedule.arrivalAt, now)}`,
    detail: schedule.departAt
      ? `Leave ${formatScheduleTime(schedule.departAt)}`
      : "No departure target yet",
  };
}
