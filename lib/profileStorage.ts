import { DEFAULT_RIDE_PLAN, normalizeRidePlan } from "./ridePlan";
import type { RoutePreferences, SavedTripDefaults } from "./types";

export const PROFILE_STORAGE_KEY = "carpool.profile";

export type SavedRiderGroup = {
  id: string;
  label: string;
  stops: string[];
  riderNames?: (string | null)[];
  createdAt: number;
  updatedAt?: number;
};

export type CarpoolProfile = {
  homeAddress?: string;
  groups: SavedRiderGroup[];
  tripDefaults?: SavedTripDefaults;
};

const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = {
  intent: "fastest",
  avoidTolls: false,
  avoidHighways: false,
  avoidFerries: false,
  avoidReportedHazards: false,
};

function emptyProfile(): CarpoolProfile {
  return { groups: [] };
}

function normalizeTripDefaults(input: unknown): SavedTripDefaults | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const candidate = input as Partial<SavedTripDefaults>;
  const normalizedPlan = normalizeRidePlan({
    driverName: candidate.driverName,
    seatsAvailable: candidate.seatsAvailable,
    reminderMinutes: candidate.reminderMinutes,
    repeat: candidate.repeat,
    checklist: candidate.checklist,
  });

  const routePreferences =
    typeof candidate.routePreferences === "object" && candidate.routePreferences !== null
      ? {
          intent: candidate.routePreferences.intent ?? DEFAULT_ROUTE_PREFERENCES.intent,
          avoidTolls: Boolean(candidate.routePreferences.avoidTolls),
          avoidHighways: Boolean(candidate.routePreferences.avoidHighways),
          avoidFerries: Boolean(candidate.routePreferences.avoidFerries),
          avoidReportedHazards: Boolean(candidate.routePreferences.avoidReportedHazards),
        }
      : DEFAULT_ROUTE_PREFERENCES;

  return {
    driverName: normalizedPlan.driverName,
    seatsAvailable: normalizedPlan.seatsAvailable,
    reminderMinutes: normalizedPlan.reminderMinutes,
    repeat: normalizedPlan.repeat,
    checklist: normalizedPlan.checklist,
    routePreferences,
  };
}

function readProfile(): CarpoolProfile {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as Partial<CarpoolProfile>;
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups.filter(
          (group): group is SavedRiderGroup =>
            typeof group === "object" &&
            group !== null &&
            typeof group.id === "string" &&
            typeof group.label === "string" &&
            Array.isArray(group.stops) &&
            group.stops.every((stop) => typeof stop === "string") &&
            typeof group.createdAt === "number"
        )
      : [];
    return {
      homeAddress: typeof parsed.homeAddress === "string" ? parsed.homeAddress : undefined,
      groups,
      tripDefaults: normalizeTripDefaults(parsed.tripDefaults),
    };
  } catch {
    return emptyProfile();
  }
}

function writeProfile(profile: CarpoolProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function getProfile(): CarpoolProfile {
  const profile = readProfile();
  return {
    ...profile,
    groups: [...profile.groups].sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)),
  };
}

export function setHomeAddress(homeAddress: string): CarpoolProfile {
  const profile = readProfile();
  const next = { ...profile, homeAddress: homeAddress.trim() || undefined };
  writeProfile(next);
  return next;
}

export function saveRiderGroup(input: {
  label: string;
  stops: string[];
  riderNames?: (string | null)[];
}): SavedRiderGroup {
  const profile = readProfile();
  const stops = input.stops.map((stop) => stop.trim()).filter(Boolean);
  const riderNames = input.riderNames?.slice(0, stops.length).map((name) => name ?? null);
  const group: SavedRiderGroup = {
    id: crypto.randomUUID(),
    label: input.label.trim() || `Carpool group ${profile.groups.length + 1}`,
    stops,
    ...(riderNames?.some((name) => name) ? { riderNames } : {}),
    createdAt: Date.now(),
  };
  writeProfile({ ...profile, groups: [group, ...profile.groups] });
  return group;
}

export function updateRiderGroup(
  id: string,
  input: {
    label?: string;
    stops: string[];
    riderNames?: (string | null)[];
  }
): CarpoolProfile {
  const profile = readProfile();
  const existing = profile.groups.find((group) => group.id === id);
  if (!existing) {
    throw new Error(`profileStorage: group "${id}" not found`);
  }

  const stops = input.stops.map((stop) => stop.trim()).filter(Boolean);
  const riderNames = input.riderNames?.slice(0, stops.length).map((name) => name ?? null);
  const groups = profile.groups.map((group) =>
    group.id === id
      ? {
          ...group,
          label: input.label?.trim() || group.label,
          stops,
          ...(riderNames?.some((name) => name) ? { riderNames } : {}),
          ...(riderNames?.some((name) => name) ? {} : { riderNames: undefined }),
          updatedAt: Date.now(),
        }
      : group
  );

  const next = { ...profile, groups };
  writeProfile(next);
  return next;
}

export function renameRiderGroup(id: string, label: string): CarpoolProfile {
  const profile = readProfile();
  const groups = profile.groups.map((group) =>
    group.id === id ? { ...group, label: label.trim() || group.label, updatedAt: Date.now() } : group
  );
  const next = { ...profile, groups };
  writeProfile(next);
  return next;
}

export function deleteRiderGroup(id: string): CarpoolProfile {
  const profile = readProfile();
  const next = { ...profile, groups: profile.groups.filter((group) => group.id !== id) };
  writeProfile(next);
  return next;
}

export function saveTripDefaults(input: SavedTripDefaults): CarpoolProfile {
  const profile = readProfile();
  const next = {
    ...profile,
    tripDefaults: normalizeTripDefaults(input) ?? {
      driverName: DEFAULT_RIDE_PLAN.driverName,
      seatsAvailable: DEFAULT_RIDE_PLAN.seatsAvailable,
      reminderMinutes: DEFAULT_RIDE_PLAN.reminderMinutes,
      repeat: DEFAULT_RIDE_PLAN.repeat,
      checklist: DEFAULT_RIDE_PLAN.checklist,
      routePreferences: DEFAULT_ROUTE_PREFERENCES,
    },
  };
  writeProfile(next);
  return next;
}

export function clearTripDefaults(): CarpoolProfile {
  const profile = readProfile();
  const next = { ...profile, tripDefaults: undefined };
  writeProfile(next);
  return next;
}
