"use client";

import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { ListOrdered, MapPin, Navigation, RotateCcw, Sparkles } from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { MapView, type DraftMapMarker } from "@/components/MapView";
import type { Coord } from "@/lib/orsTypes";
import type { Suggestion } from "@/lib/orsAutocomplete";
import { RouteSummary } from "@/components/RouteSummary";
import { SavedRoutesMenu } from "@/components/SavedRoutesMenu";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ProfileMenu } from "@/components/ProfileMenu";
import { StageRail } from "@/components/StageRail";
import {
  canOptimizeInputs,
  mapDvhForStage,
  nextStageForLoadedRoute,
  type Stage,
} from "@/lib/cockpit";
import { EmptyState } from "@/components/EmptyState";
import { DriveMode } from "@/components/DriveMode";
import { TripFields } from "@/components/stages/TripFields";
import { StopsEditor } from "@/components/stages/StopsEditor";
import { TuneControls } from "@/components/stages/TuneControls";
import { ConsoleShell } from "@/components/mobile/ConsoleShell";
import { StatusStrip } from "@/components/mobile/StatusStrip";
import { CommandBar } from "@/components/mobile/CommandBar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { validateRouteInputs } from "@/lib/validation";
import { optimizeRoute } from "@/lib/optimizeRoute";
import { localOptimizeRoute } from "@/lib/localOptimize";
import { getActiveApiKey } from "@/lib/orsKey";
import { DEFAULT_RIDE_PLAN, normalizeRidePlan } from "@/lib/ridePlan";
import { saveRoute, updateRoute } from "@/lib/storage";
import {
  duplicateItem,
  moveItemDown,
  moveItemUp,
  removeItem,
} from "@/lib/waypointOps";
import type {
  OptimizationMode,
  OptimizedRoute,
  RidePlan,
  RoutePreferences,
  RouteOption,
  RouteInputs,
  SavedRoute,
} from "@/lib/types";
import { fetchRouteOptions } from "@/lib/routeOptions";
import { getProfile, type SavedRiderGroup } from "@/lib/profileStorage";
import { collectStopAssignments, matchAssignmentsInOrder } from "@/lib/stopAssignments";
import { buildNavUrl, navAppLabel, type NavApp } from "@/lib/navLinks";

type Phase =
  | { kind: "editing"; error?: string }
  | { kind: "optimizing" }
  | { kind: "optimized"; result: OptimizedRoute };

type Action =
  | { type: "edit_changed" }
  | { type: "validation_failed"; message: string }
  | { type: "optimize_start" }
  | { type: "optimize_success"; result: OptimizedRoute }
  | { type: "select_route"; index: number }
  | { type: "optimize_error"; message: string }
  | { type: "back_to_edit" }
  | { type: "reset" };

/** Build the trip, Tune the plan, Go drive. The single navigation enum for both layouts. */
type BuildSub = "trip" | "stops";

function phaseReducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case "edit_changed":
      if (state.kind === "editing" && state.error) {
        return { kind: "editing" };
      }
      return state;
    case "validation_failed":
      return { kind: "editing", error: action.message };
    case "optimize_start":
      return { kind: "optimizing" };
    case "optimize_success":
      return { kind: "optimized", result: action.result };
    case "select_route":
      if (state.kind !== "optimized" || !state.result.routeOptions?.[action.index]) return state;
      const option = state.result.routeOptions[action.index];
      return {
        kind: "optimized",
        result: {
          ...state.result,
          selectedRouteIndex: action.index,
          etaSeconds: option.etaSeconds,
          distanceMeters: option.distanceMeters,
          polyline: option.polyline,
        },
      };
    case "optimize_error":
      return { kind: "editing", error: action.message };
    case "back_to_edit":
      return { kind: "editing" };
    case "reset":
      return { kind: "editing" };
  }
}

function resolveMode(apiKey: string | null, loadFailed: boolean): OptimizationMode {
  if (loadFailed) return "loadError";
  return apiKey ? "live" : "demo";
}

const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = {
  intent: "fastest",
  avoidTolls: false,
  avoidHighways: false,
  avoidFerries: false,
  avoidReportedHazards: false,
};

function applyProfileTripDefaults(
  defaults: ReturnType<typeof getProfile>["tripDefaults"],
  fallbackRidePlan: RidePlan = DEFAULT_RIDE_PLAN,
  fallbackRoutePreferences: RoutePreferences = DEFAULT_ROUTE_PREFERENCES
): { ridePlan: RidePlan; routePreferences: RoutePreferences } {
  if (!defaults) {
    return {
      ridePlan: normalizeRidePlan(fallbackRidePlan),
      routePreferences: fallbackRoutePreferences,
    };
  }

  return {
    ridePlan: normalizeRidePlan({
      ...fallbackRidePlan,
      driverName: defaults.driverName,
      seatsAvailable: defaults.seatsAvailable,
      reminderMinutes: defaults.reminderMinutes,
      repeat: defaults.repeat,
      checklist: defaults.checklist,
    }),
    routePreferences: defaults.routePreferences,
  };
}

export default function Page() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapsLoadFailed, setMapsLoadFailed] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([""]);
  const [riderNames, setRiderNames] = useState<(string | null)[]>([null]);
  const [showRiderNames, setShowRiderNames] = useState(false);
  const [startCoord, setStartCoord] = useState<Coord | null>(null);
  const [endCoord, setEndCoord] = useState<Coord | null>(null);
  const [waypointCoords, setWaypointCoords] = useState<(Coord | null)[]>([null]);
  const [endSameAsStart, setEndSameAsStart] = useState(false);
  const [ridePlan, setRidePlan] = useState<RidePlan>(DEFAULT_RIDE_PLAN);
  const [routePreferences, setRoutePreferences] = useState<RoutePreferences>(
    DEFAULT_ROUTE_PREFERENCES
  );
  const [phase, dispatch] = useReducer(phaseReducer, { kind: "editing" });
  const [stage, setStage] = useState<Stage>("build");
  const [buildSub, setBuildSub] = useState<BuildSub>("trip");
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeSavedRouteId, setActiveSavedRouteId] = useState<string | null>(null);
  const [navApp, setNavApp] = useState<NavApp>("google");
  const [driveOpen, setDriveOpen] = useState(false);

  const toast = useToast();

  function refreshApiKey() {
    setApiKey(getActiveApiKey());
  }
  useEffect(refreshApiKey, []);

  // Remember the driver's preferred navigation app.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("carpool.navApp");
      if (saved === "google" || saved === "waze" || saved === "apple") setNavApp(saved);
    } catch {
      /* ignore */
    }
  }, []);
  function chooseNavApp(app: NavApp) {
    setNavApp(app);
    try {
      window.localStorage.setItem("carpool.navApp", app);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const profileDefaults = getProfile().tripDefaults;
    if (!profileDefaults) return;
    const next = applyProfileTripDefaults(profileDefaults);
    setRidePlan(next.ridePlan);
    setRoutePreferences(next.routePreferences);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setActiveStopIndex((index) => Math.min(Math.max(index, 0), Math.max(waypoints.length - 1, 0)));
  }, [waypoints.length]);

  const mode = useMemo(() => resolveMode(apiKey, mapsLoadFailed), [apiKey, mapsLoadFailed]);
  const useMock = mode !== "live";
  const draftMarkers = useMemo<DraftMapMarker[]>(() => {
    const markers: DraftMapMarker[] = [];
    if (startCoord) {
      markers.push({ key: "draft-start", label: "S", tone: "start", coord: startCoord });
    }
    waypointCoords.forEach((coord, index) => {
      if (coord && waypoints[index]?.trim()) {
        markers.push({
          key: `draft-stop-${index}`,
          label: String(index + 1),
          tone: "stop",
          coord,
        });
      }
    });
    if (endCoord) {
      markers.push({ key: "draft-end", label: "E", tone: "end", coord: endCoord });
    }
    return markers;
  }, [endCoord, startCoord, waypointCoords, waypoints]);

  function ensureRidersAlignment(stops: string[], names: (string | null)[]): (string | null)[] {
    if (names.length === stops.length) return names;
    if (names.length < stops.length) {
      return [...names, ...Array<string | null>(stops.length - names.length).fill(null)];
    }
    return names.slice(0, stops.length);
  }

  function ensureCoordAlignment(stops: string[], coords: (Coord | null)[]): (Coord | null)[] {
    if (coords.length === stops.length) return coords;
    if (coords.length < stops.length) {
      return [...coords, ...Array<Coord | null>(stops.length - coords.length).fill(null)];
    }
    return coords.slice(0, stops.length);
  }

  function applyStops(
    next: string[],
    nextRiders?: (string | null)[],
    nextCoords?: (Coord | null)[]
  ) {
    setWaypoints(next);
    setRiderNames(ensureRidersAlignment(next, nextRiders ?? riderNames));
    setWaypointCoords(ensureCoordAlignment(next, nextCoords ?? waypointCoords));
    dispatch({ type: "edit_changed" });
  }

  function handleAddStop() {
    applyStops([...waypoints, ""], [...riderNames, null]);
  }

  function handleRemoveStop(i: number) {
    applyStops(removeItem(waypoints, i), removeItem(riderNames, i), removeItem(waypointCoords, i));
  }

  function handleRestoreStop(i: number, address: string, riderName?: string | null) {
    const nextStops = [...waypoints];
    nextStops.splice(i, 0, address);
    const nextRiders = [...riderNames];
    nextRiders.splice(i, 0, riderName ?? null);
    const nextCoords = [...waypointCoords];
    nextCoords.splice(i, 0, null);
    applyStops(nextStops, nextRiders, nextCoords);
  }

  function handleChangeStop(i: number, value: string) {
    applyStops(
      waypoints.map((x, idx) => (idx === i ? value : x)),
      undefined,
      waypointCoords.map((coord, idx) => (idx === i ? null : coord))
    );
  }

  function handlePickStop(i: number, coord: Coord | null) {
    setWaypointCoords((cur) =>
      ensureCoordAlignment(waypoints, cur).map((current, idx) => (idx === i ? coord : current))
    );
  }

  function handleChangeRider(i: number, value: string | null) {
    setRiderNames((cur) => cur.map((x, idx) => (idx === i ? value : x)));
  }

  function handleMoveUp(i: number) {
    applyStops(moveItemUp(waypoints, i), moveItemUp(riderNames, i), moveItemUp(waypointCoords, i));
  }

  function handleMoveDown(i: number) {
    applyStops(
      moveItemDown(waypoints, i),
      moveItemDown(riderNames, i),
      moveItemDown(waypointCoords, i)
    );
  }

  function handleDuplicate(i: number) {
    applyStops(
      duplicateItem(waypoints, i),
      duplicateItem(riderNames, i),
      duplicateItem(waypointCoords, i)
    );
  }

  function handleSwapEnds() {
    const oldStart = start;
    const oldStartCoord = startCoord;
    setStart(end);
    setStartCoord(endCoord);
    setEnd(oldStart);
    setEndCoord(oldStartCoord);
    setEndSameAsStart(false);
    dispatch({ type: "edit_changed" });
  }

  // --- Trip-field closures (lifted from inline JSX so TripFields has exactly one source). ---
  function handleStartChange(value: string) {
    setStart(value);
    if (startCoord) setStartCoord(null);
    if (endSameAsStart) {
      setEnd(value);
      setEndCoord(null);
    }
    dispatch({ type: "edit_changed" });
  }
  function handleStartPreview(coord: Coord | null) {
    setStartCoord(coord);
    if (endSameAsStart) setEndCoord(coord);
  }
  function handleStartPick(suggestion: Suggestion) {
    setStartCoord(suggestion.coord);
    if (endSameAsStart) {
      setEnd(suggestion.label);
      setEndCoord(suggestion.coord);
    }
  }
  function handleEndChange(value: string) {
    setEndSameAsStart(false);
    setEnd(value);
    if (endCoord) setEndCoord(null);
    dispatch({ type: "edit_changed" });
  }
  function handleEndPreview(coord: Coord | null) {
    setEndCoord(coord);
  }
  function handleEndPick(suggestion: Suggestion) {
    setEndCoord(suggestion.coord);
  }
  function handleToggleRoundTrip(checked: boolean) {
    setEndSameAsStart(checked);
    if (checked) {
      setEnd(start);
      setEndCoord(startCoord);
    }
    dispatch({ type: "edit_changed" });
  }

  function handleUseLocation(coord: Coord) {
    setStartCoord(coord);
    setStart(`Current location (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`);
    if (endSameAsStart) {
      setEnd(`Current location (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`);
      setEndCoord(coord);
    }
    dispatch({ type: "edit_changed" });
    toast.show({ title: "Using current location as start", tone: "success" });
  }
  function handleLocationError(message: string) {
    dispatch({ type: "validation_failed", message });
  }

  function handleUseHome(address: string) {
    setStart(address);
    setStartCoord(null);
    if (endSameAsStart) {
      setEnd(address);
      setEndCoord(null);
    }
    setStage((current) => (current === "go" ? "build" : current));
    setBuildSub("trip");
    dispatch({ type: "edit_changed" });
  }

  function handleLoadGroup(group: SavedRiderGroup) {
    const stops = group.stops.length ? group.stops : [""];
    setWaypoints(stops);
    setWaypointCoords(Array<Coord | null>(stops.length).fill(null));
    setRiderNames(ensureRidersAlignment(stops, group.riderNames ?? Array<string | null>(stops.length).fill(null)));
    setShowRiderNames(Boolean(group.riderNames?.some((name) => name)));
    setStage("build");
    setBuildSub("stops");
    dispatch({ type: "edit_changed" });
    toast.show({ title: `Loaded ${group.label}`, tone: "info" });
  }

  function handleApplyTripDefaults(defaults: ReturnType<typeof getProfile>["tripDefaults"]) {
    if (!defaults) return;
    const next = applyProfileTripDefaults(defaults, ridePlan, routePreferences);
    setRidePlan(next.ridePlan);
    setRoutePreferences(next.routePreferences);
    setStage((current) => (current === "go" ? "tune" : current));
    dispatch({ type: "edit_changed" });
    toast.show({ title: "Applied trip defaults", tone: "success" });
  }

  async function getDraftRouteOptions(cleanedStops: string[]): Promise<RouteOption[]> {
    if (!startCoord || !endCoord) return [];
    const assignments = collectStopAssignments(
      waypoints,
      ensureRidersAlignment(waypoints, riderNames),
      ensureCoordAlignment(waypoints, waypointCoords)
    );
    const stopCoords = matchAssignmentsInOrder(cleanedStops, assignments).map(
      (assignment) => assignment.coord
    );
    if (stopCoords.some((coord) => coord === null)) return [];
    return fetchRouteOptions({
      start: startCoord,
      end: endCoord,
      stops: stopCoords as Coord[],
    });
  }

  async function handleOptimize() {
    if (phase.kind === "optimizing") return;
    const inputs: RouteInputs = { start, end, stops: waypoints };
    const v = validateRouteInputs({ start, end, waypoints });
    if (!v.ok) {
      dispatch({ type: "validation_failed", message: v.message });
      return;
    }
    dispatch({ type: "optimize_start" });
    try {
      const cleanInputs: RouteInputs = { start, end, stops: v.cleanedWaypoints };

      let result: OptimizedRoute;
      let routeOptions: RouteOption[];
      if (useMock) {
        // Free, keyless optimization: reuse coords already resolved from autocomplete,
        // geocode the rest, then nearest-neighbor order. Real reordering, no API key.
        const assignments = collectStopAssignments(
          waypoints,
          ensureRidersAlignment(waypoints, riderNames),
          ensureCoordAlignment(waypoints, waypointCoords)
        );
        const knownStopCoords = matchAssignmentsInOrder(cleanInputs.stops, assignments).map(
          (assignment) => assignment.coord
        );
        const local = await localOptimizeRoute(cleanInputs, {
          startCoord,
          endCoord,
          stopCoords: knownStopCoords,
        });
        result = local.route;
        routeOptions =
          local.startCoord &&
          local.endCoord &&
          result.stopCoords &&
          result.stopCoords.length === result.orderedStops.length
            ? await fetchRouteOptions({
                start: local.startCoord,
                end: local.endCoord,
                stops: result.stopCoords,
              })
            : [];
      } else {
        result = await optimizeRoute(cleanInputs, apiKey ?? "", {
          startCoord: startCoord ?? undefined,
          routePreferences,
        });
        routeOptions = await getDraftRouteOptions(result.orderedStops);
      }

      const preferredIndex = pickPreferredRouteIndex(routeOptions, routePreferences);
      const preferredOption = routeOptions[preferredIndex];
      const resultWithOptions: OptimizedRoute = preferredOption
        ? {
            ...result,
            routeOptions,
            selectedRouteIndex: preferredIndex,
            etaSeconds: preferredOption.etaSeconds,
            distanceMeters: preferredOption.distanceMeters,
            polyline: preferredOption.polyline,
            stopCoords: result.stopCoords ?? ensureCoordAlignment(waypoints, waypointCoords).filter(
              (coord): coord is Coord => coord !== null
            ),
          }
        : result;
      dispatch({ type: "optimize_success", result: resultWithOptions });
      setStage("go");
      toast.show({ title: "Route ready", tone: "success" });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't calculate this route. Check the addresses and try again.";
      dispatch({ type: "optimize_error", message });
      toast.show({ title: "Couldn't optimize route", tone: "error" });
    }
    // inputs used for type-checking RouteInputs; suppress unused-var if linter flags it
    void inputs;
  }

  function handleSaveDraft() {
    const assignments = collectStopAssignments(
      waypoints,
      ensureRidersAlignment(waypoints, riderNames),
      ensureCoordAlignment(waypoints, waypointCoords)
    );
    const cleanedStops = assignments.map((assignment) => assignment.address);
    const cleanedRiders = assignments.map((assignment) => assignment.riderName);
    const hasAnyRider = cleanedRiders.some((name) => name !== null && name !== "");
    const payload = {
      start: start.trim(),
      end: end.trim(),
      stops: cleanedStops,
      riderNames: hasAnyRider ? cleanedRiders : undefined,
      ridePlan,
      routePreferences,
      etaSeconds: undefined,
      distanceMeters: undefined,
      source: undefined,
    };

    if (!payload.start || !payload.end || payload.stops.length === 0) {
      toast.show({
        title: "Add start, end, and at least one stop before saving",
        tone: "error",
      });
      return;
    }

    try {
      if (activeSavedRouteId) {
        updateRoute(activeSavedRouteId, payload);
        toast.show({ title: "Draft updated", tone: "success" });
      } else {
        const saved = saveRoute({
          label: `${payload.start} → ${payload.end}`,
          ...payload,
        });
        setActiveSavedRouteId(saved.id);
        toast.show({ title: "Draft saved", tone: "success" });
      }
    } catch {
      toast.show({ title: "Couldn't save draft", tone: "error" });
    }
  }

  function handleSave() {
    if (phase.kind !== "optimized") return;
    const result = phase.result;
    try {
      const stops = result.orderedStops;
      const assignments = collectStopAssignments(
        waypoints,
        ensureRidersAlignment(waypoints, riderNames),
        ensureCoordAlignment(waypoints, waypointCoords)
      );
      const orderedRiders = matchAssignmentsInOrder(stops, assignments).map(
        (assignment) => assignment.riderName
      );
      const hasAnyRider = orderedRiders.some((n) => n !== null && n !== "");
      const payload = {
        start,
        end,
        stops,
        riderNames: hasAnyRider ? orderedRiders : undefined,
        ridePlan,
        routePreferences,
        etaSeconds: result.etaSeconds,
        distanceMeters: result.distanceMeters,
        source: result.source,
      };
      if (activeSavedRouteId) {
        updateRoute(activeSavedRouteId, payload);
        toast.show({ title: "Saved route updated", tone: "success" });
      } else {
        const saved = saveRoute({
          label: `${start} → ${end}`,
          ...payload,
        });
        setActiveSavedRouteId(saved.id);
        toast.show({ title: "Route saved", tone: "success" });
      }
    } catch {
      toast.show({ title: "Couldn't save route", tone: "error" });
    }
  }

  function handleLoad(r: SavedRoute) {
    setActiveSavedRouteId(r.id);
    setStart(r.start);
    setEnd(r.end);
    const stops = r.stops.length ? r.stops : [""];
    setWaypoints(stops);
    setWaypointCoords(Array<Coord | null>(stops.length).fill(null));
    setRiderNames(
      ensureRidersAlignment(stops, r.riderNames ?? Array<string | null>(stops.length).fill(null))
    );
    setShowRiderNames(Boolean(r.riderNames?.some((n) => n)));
    setStartCoord(null);
    setEndCoord(null);
    setEndSameAsStart(false);
    setRidePlan(normalizeRidePlan(r.ridePlan));
    setRoutePreferences(r.routePreferences ?? DEFAULT_ROUTE_PREFERENCES);
    // Fast repeat: a previously-optimized route lands in TUNE (one tap from re-planning);
    // a bare draft lands in BUILD.
    setStage(nextStageForLoadedRoute(r));
    setBuildSub("trip");
    setActiveStopIndex(0);
    dispatch({ type: "reset" });
    toast.show({ title: `Loaded ${r.label}`, tone: "info" });
  }

  function handleReset() {
    const profileDefaults = getProfile().tripDefaults;
    const nextDefaults = applyProfileTripDefaults(profileDefaults);
    setActiveSavedRouteId(null);
    setStart("");
    setEnd("");
    setWaypoints([""]);
    setRiderNames([null]);
    setWaypointCoords([null]);
    setShowRiderNames(false);
    setStartCoord(null);
    setEndCoord(null);
    setEndSameAsStart(false);
    setRidePlan(nextDefaults.ridePlan);
    setRoutePreferences(nextDefaults.routePreferences);
    setStage("build");
    setBuildSub("trip");
    setActiveStopIndex(0);
    dispatch({ type: "reset" });
    toast.show({
      title: profileDefaults ? "Cleared route and restored defaults" : "Cleared route",
      tone: "info",
    });
  }

  // --- Stage navigation ---
  function handleStageJump(target: Stage) {
    if (target === "go" && phase.kind !== "optimized") return;
    setStage(target);
  }

  function handleStepperAddStop() {
    handleAddStop();
    setActiveStopIndex(waypoints.length); // new stop sits at the previous length
    setBuildSub("stops");
  }

  async function handleCopyLink() {
    if (phase.kind !== "optimized") return;
    const url = buildNavUrl(navApp, { start, end, orderedStops: phase.result.orderedStops });
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      toast.show({ title: "Link copied", tone: "success" });
    } catch {
      window.prompt("Copy route link", url);
    }
  }

  function openNav() {
    if (phase.kind !== "optimized") return;
    window.location.assign(
      buildNavUrl(navApp, { start, end, orderedStops: phase.result.orderedStops })
    );
  }

  const optimized = phase.kind === "optimized" ? phase.result : null;
  const loading = phase.kind === "optimizing";
  const error = phase.kind === "editing" ? phase.error : undefined;
  const goUnlocked = optimized !== null;
  const showSummary = optimized !== null && stage === "go";
  const stageMapDvh = mapDvhForStage(stage);
  const filledStopCount = waypoints.filter((stop) => stop.trim()).length;
  const mobileStopIndex = Math.min(activeStopIndex, Math.max(waypoints.length - 1, 0));
  const canOptimize = canOptimizeInputs({ start, end, stops: waypoints });
  const selectedRouteIndex = optimized?.selectedRouteIndex ?? 0;

  const summaryProps = optimized
    ? {
        start,
        end,
        optimized,
        riderNames,
        ridePlan,
        routePreferences,
        onEdit: () => {
          setStage("build");
          setBuildSub("trip");
        },
        onSave: handleSave,
        saveLabel: activeSavedRouteId ? "Update saved plan" : "Save plan",
        onSelectRoute: (index: number) => dispatch({ type: "select_route", index }),
        navApp,
        onNavAppChange: chooseNavApp,
        onOpenNav: openNav,
        onCopyLink: handleCopyLink,
        onStartDrive: () => setDriveOpen(true),
      }
    : null;

  // Ordered drop-offs (rider + address + coord) for Drive mode's live proximity tracking.
  let driveStops: { rider: string | null; address: string; coord: Coord | null }[] = [];
  if (optimized) {
    const assignments = collectStopAssignments(
      waypoints,
      ensureRidersAlignment(waypoints, riderNames),
      ensureCoordAlignment(waypoints, waypointCoords)
    );
    const orderedRiders = matchAssignmentsInOrder(optimized.orderedStops, assignments).map(
      (a) => a.riderName
    );
    driveStops = optimized.orderedStops.map((address, i) => ({
      rider: orderedRiders[i] ?? null,
      address,
      coord: optimized.stopCoords?.[i] ?? null,
    }));
  }

  const tripFieldProps = {
    start,
    end,
    startCoord,
    endSameAsStart,
    apiKey,
    disabled: loading,
    onStartChange: handleStartChange,
    onStartPreview: handleStartPreview,
    onStartPick: handleStartPick,
    onEndChange: handleEndChange,
    onEndPreview: handleEndPreview,
    onEndPick: handleEndPick,
    onToggleRoundTrip: handleToggleRoundTrip,
    onSwap: handleSwapEnds,
    onUseLocation: handleUseLocation,
    onLocationError: handleLocationError,
  };

  const tuneProps = {
    routePreferences,
    onRoutePreferencesChange: (next: RoutePreferences) => {
      setRoutePreferences(next);
      dispatch({ type: "edit_changed" });
    },
    ridePlan,
    onRidePlanChange: (next: RidePlan) => {
      setRidePlan(next);
      dispatch({ type: "edit_changed" });
    },
    disabled: loading,
  };

  const mapProps = {
    apiKey,
    start,
    end,
    stops: waypoints,
    riderNames,
    ridePlan,
    polyline: optimized?.polyline,
    stopCoords: optimized?.stopCoords,
    draftMarkers,
    routeOptions: optimized?.routeOptions,
    selectedRouteIndex: optimized?.selectedRouteIndex,
    etaSeconds: optimized?.etaSeconds,
    distanceMeters: optimized?.distanceMeters,
    onLoadError: () => setMapsLoadFailed(true),
  };

  // --- Desktop form (the same shared sub-panels the mobile cockpit uses) ---
  const desktopForm = (
    <div className="space-y-4">
      <TripFields density="default" {...tripFieldProps} />
      <StopsEditor
        density="default"
        waypoints={waypoints}
        riderNames={riderNames}
        showRiderNames={showRiderNames}
        onToggleRiderNames={setShowRiderNames}
        disabled={loading}
        apiKey={apiKey}
        onChangeStop={handleChangeStop}
        onPickStop={handlePickStop}
        onChangeRider={handleChangeRider}
        onAddStop={handleAddStop}
        onRemoveStop={handleRemoveStop}
        onRestoreStop={handleRestoreStop}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onDuplicate={handleDuplicate}
        onPickSuggestion={(index, suggestion) => handlePickStop(index, suggestion.coord)}
      />
      <TuneControls compact={false} {...tuneProps} />
      {error && (
        <ErrorAlert message={error} onDismiss={() => dispatch({ type: "edit_changed" })} />
      )}
      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading || !canOptimize}
          onClick={handleOptimize}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {loading ? "Planning…" : "Plan drop-off order"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={handleSaveDraft} disabled={loading}>
            {activeSavedRouteId ? "Update draft" : "Save draft"}
          </Button>
          <Button variant="ghost" size="sm" fullWidth onClick={handleReset}>
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Clear / new route
          </Button>
        </div>
      </div>
    </div>
  );

  // --- Mobile cockpit pieces ---
  const buildSubNav = (
    <div className="grid grid-cols-2 gap-1.5">
      <MobileSubTab active={buildSub === "trip"} onClick={() => setBuildSub("trip")}>
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Trip
      </MobileSubTab>
      <MobileSubTab active={buildSub === "stops"} onClick={() => setBuildSub("stops")}>
        <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> Stops · {filledStopCount}
      </MobileSubTab>
    </div>
  );

  let stageBody: ReactNode;
  if (stage === "build") {
    stageBody =
      buildSub === "trip" ? (
        <TripFields density="compact" {...tripFieldProps} />
      ) : (
        <StopsEditor
          density="compact"
          waypoints={waypoints}
          riderNames={riderNames}
          showRiderNames={showRiderNames}
          onToggleRiderNames={setShowRiderNames}
          disabled={loading}
          apiKey={apiKey}
          activeIndex={mobileStopIndex}
          onActiveIndexChange={setActiveStopIndex}
          onChangeStop={handleChangeStop}
          onPickStop={handlePickStop}
          onChangeRider={handleChangeRider}
          onAddStop={handleStepperAddStop}
          onRemoveStop={handleRemoveStop}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDuplicate={handleDuplicate}
          onRestoreStop={handleRestoreStop}
        />
      );
  } else if (stage === "tune") {
    stageBody = (
      <TuneControls compact {...tuneProps} />
    );
  } else {
    stageBody = summaryProps ? (
      <RouteSummary chromeless {...summaryProps} />
    ) : (
      <EmptyState
        icon={<Navigation className="h-6 w-6" aria-hidden="true" />}
        title="No route planned yet"
        body="Plan a drop-off order to unlock the drive view."
        action={
          <Button variant="secondary" size="sm" onClick={() => setStage("tune")}>
            Back to planning
          </Button>
        }
      />
    );
  }

  const mobileTopOverlay = (
    <>
      <div className="pointer-events-auto">
        <SavedRoutesMenu onLoad={handleLoad} />
      </div>
      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/85 px-1.5 py-1 shadow-lg backdrop-blur">
          <ProfileMenu
            start={start}
            stops={waypoints}
            riderNames={riderNames}
            ridePlan={ridePlan}
            routePreferences={routePreferences}
            onUseHome={handleUseHome}
            onLoadGroup={handleLoadGroup}
            onApplyTripDefaults={handleApplyTripDefaults}
          />
          <SettingsMenu onApiKeySaved={refreshApiKey} />
        </div>
      </div>
    </>
  );

  return (
    <>
    <main className="h-[100dvh] overflow-hidden md:grid md:grid-cols-[28rem_1fr]">
      {/* Desktop side panel (md+) */}
      <aside className="relative hidden h-full min-h-0 flex-col border-r border-white/10 bg-slate-900/80 backdrop-blur-xl md:flex">
        {isDesktop && (
          <div className="flex h-full min-h-0 flex-col p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-slate-100">Carpool Optimizer</h1>
                <p className="truncate text-[11px] text-slate-400">Plan · optimize · drive</p>
              </div>
              <div className="flex items-center gap-2">
                <ProfileMenu
                  start={start}
                  stops={waypoints}
                  riderNames={riderNames}
                  ridePlan={ridePlan}
                  routePreferences={routePreferences}
                  onUseHome={handleUseHome}
                  onLoadGroup={handleLoadGroup}
                  onApplyTripDefaults={handleApplyTripDefaults}
                />
                <SettingsMenu onApiKeySaved={refreshApiKey} />
              </div>
            </div>
            <div className="mt-4">
              <StageRail stage={stage} goUnlocked={goUnlocked} onJump={handleStageJump} />
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              {showSummary && summaryProps ? <RouteSummary {...summaryProps} /> : desktopForm}
            </div>
          </div>
        )}
      </aside>

      {/* Right column: full-bleed map on desktop, full cockpit on mobile. */}
      <div className="relative h-full min-h-0 overflow-hidden">
        {isDesktop ? (
          <>
            <div className="absolute inset-0">
              <MapView {...mapProps} />
            </div>
            <div className="pointer-events-none absolute inset-0 z-[1002]">
              <div className="pointer-events-auto">
                <SavedRoutesMenu onLoad={handleLoad} />
              </div>
            </div>
          </>
        ) : (
          <ConsoleShell
            mapDvh={stageMapDvh}
            map={
              <MapView
                {...mapProps}
                activeStopIndex={
                  stage === "build" && buildSub === "stops" ? mobileStopIndex : undefined
                }
              />
            }
            topOverlay={mobileTopOverlay}
            status={
              <StatusStrip
                start={start}
                end={end}
                stops={waypoints}
                riderNames={riderNames}
                ridePlan={ridePlan}
                etaSeconds={optimized?.etaSeconds}
                distanceMeters={optimized?.distanceMeters}
                routeLabel={optimized?.routeOptions?.[selectedRouteIndex]?.label}
                routeOptionCount={optimized?.routeOptions?.length}
              />
            }
            subNav={stage === "build" ? buildSubNav : undefined}
            body={stageBody}
            rail={<StageRail stage={stage} goUnlocked={goUnlocked} onJump={handleStageJump} />}
            commandBar={
              <CommandBar
                mode={stage === "go" ? "go" : "plan"}
                loading={loading}
                canOptimize={canOptimize}
                saveLabel={
                  stage === "go"
                    ? activeSavedRouteId
                      ? "Update plan"
                      : "Save plan"
                    : activeSavedRouteId
                      ? "Update draft"
                      : "Save draft"
                }
                navApp={navApp}
                onOptimize={handleOptimize}
                onSave={stage === "go" ? handleSave : handleSaveDraft}
                onClear={handleReset}
                onOpenNav={openNav}
                onCopyLink={handleCopyLink}
                onEdit={() => {
                  setStage("build");
                  setBuildSub("trip");
                }}
              />
            }
          />
        )}
      </div>
    </main>
      {driveOpen && optimized && (
        <DriveMode stops={driveStops} end={end} onClose={() => setDriveOpen(false)} />
      )}
    </>
  );
}

function MobileSubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition " +
        (active
          ? "bg-cyan-300/20 text-cyan-50 ring-1 ring-cyan-200/30"
          : "bg-slate-950/35 text-slate-300 ring-1 ring-white/10 hover:bg-slate-800/70")
      }
    >
      {children}
    </button>
  );
}

function pickPreferredRouteIndex(
  options: RouteOption[],
  preferences: RoutePreferences
): number {
  if (options.length === 0) return 0;
  if (preferences.intent === "fastest") return 0;
  if (preferences.intent === "alternate") return Math.min(1, options.length - 1);

  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  options.forEach((option, index) => {
    const minutes = option.etaSeconds / 60;
    const miles = option.distanceMeters / 1609.344;
    const varietyPenalty = index === 0 ? 0 : -1.5;
    const preferencePenalty =
      (preferences.avoidTolls ? 1.2 : 0) +
      (preferences.avoidHighways ? 1.7 : 0) +
      (preferences.avoidFerries ? 0.8 : 0) +
      (preferences.avoidReportedHazards ? 1.4 : 0);
    const score = minutes + miles * 0.35 + varietyPenalty + index * preferencePenalty;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
