import type { RidePlan } from "./types";

export const DEFAULT_RIDE_PLAN: RidePlan = {
  driverName: "",
  rideDate: "",
  arrivalTime: "",
  repeat: "none",
  seatsAvailable: 4,
  reminderMinutes: 20,
  checklist: ["Fuel or charge", "Confirm riders", "Pack pickup essentials"],
};

export function normalizeRidePlan(input?: Partial<RidePlan> | null): RidePlan {
  const driverNote =
    typeof input?.driverNote === "string" ? input.driverNote.trim().slice(0, 280) : "";
  const checklist = Array.isArray(input?.checklist)
    ? input.checklist.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : DEFAULT_RIDE_PLAN.checklist;

  return {
    driverName: typeof input?.driverName === "string" ? input.driverName : DEFAULT_RIDE_PLAN.driverName,
    ...(driverNote ? { driverNote } : {}),
    rideDate: typeof input?.rideDate === "string" ? input.rideDate : DEFAULT_RIDE_PLAN.rideDate,
    arrivalTime:
      typeof input?.arrivalTime === "string" ? input.arrivalTime : DEFAULT_RIDE_PLAN.arrivalTime,
    repeat: input?.repeat ?? DEFAULT_RIDE_PLAN.repeat,
    seatsAvailable:
      typeof input?.seatsAvailable === "number"
        ? Math.min(8, Math.max(1, input.seatsAvailable))
        : DEFAULT_RIDE_PLAN.seatsAvailable,
    reminderMinutes:
      typeof input?.reminderMinutes === "number"
        ? input.reminderMinutes
        : DEFAULT_RIDE_PLAN.reminderMinutes,
    checklist: checklist.length > 0 ? checklist : DEFAULT_RIDE_PLAN.checklist,
  };
}
