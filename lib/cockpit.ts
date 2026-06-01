import type { SavedRoute } from "./types";

/** The single navigation enum for both layouts: Build the trip → Tune the plan → Go drive. */
export type Stage = "build" | "tune" | "go";

export const STAGE_ORDER: Stage[] = ["build", "tune", "go"];

/**
 * Mobile map height (in dvh) per stage. The map shrinks as the user moves toward driving so
 * the stage body gets more room, but it never drops below the GO height — it stays visible.
 */
export function mapDvhForStage(stage: Stage): number {
  switch (stage) {
    case "build":
      return 32;
    case "tune":
      return 30;
    case "go":
      return 28;
  }
}

/** The minimum map height the cockpit will ever show (the GO value) — map is never hidden. */
export const MIN_MAP_DVH = mapDvhForStage("go");

/**
 * Fast repeat-use: a route that was previously optimized (has an ETA or a routing source)
 * lands in TUNE — one tap from re-planning. A bare draft lands in BUILD.
 */
export function nextStageForLoadedRoute(
  route: Pick<SavedRoute, "etaSeconds" | "source">
): Stage {
  return typeof route.etaSeconds === "number" || Boolean(route.source) ? "tune" : "build";
}

/**
 * Whether the "Plan drop-off order" action should be enabled for the given raw inputs.
 * This is an affordance gate only — validateRouteInputs still runs on submit and surfaces
 * the precise error (e.g. a blank stop in the middle of the list).
 */
export function canOptimizeInputs(input: {
  start: string;
  end: string;
  stops: string[];
}): boolean {
  return Boolean(
    input.start.trim() && input.end.trim() && input.stops.some((stop) => stop.trim().length > 0)
  );
}

/** Whether a stage is reachable given whether a route has been optimized yet. */
export function isStageReachable(stage: Stage, goUnlocked: boolean): boolean {
  return stage === "go" ? goUnlocked : true;
}
