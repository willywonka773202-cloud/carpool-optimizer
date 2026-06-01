import { NextResponse, type NextRequest } from "next/server";
import type { Coord } from "@/lib/orsTypes";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const METERS_PER_MILE = 1609.344;

type RouteRequest = {
  start?: Coord;
  end?: Coord;
  stops?: Coord[];
};

type OsrmRoute = {
  duration?: number;
  distance?: number;
  geometry?: { coordinates?: [number, number][] };
};

type OsrmResponse = {
  routes?: OsrmRoute[];
};

function isCoord(value: unknown): value is Coord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Coord).lat === "number" &&
    typeof (value as Coord).lng === "number" &&
    Number.isFinite((value as Coord).lat) &&
    Number.isFinite((value as Coord).lng)
  );
}

function optionLabel(index: number, durationSeconds: number, distanceMeters: number): string {
  if (index === 0) return "Primary route";
  if (index === 1) return "Alternate 1";
  const minutes = Math.round(durationSeconds / 60);
  const miles = distanceMeters / METERS_PER_MILE;
  return `Alternate ${index} · ${minutes} min / ${miles.toFixed(1)} mi`;
}

export async function POST(req: NextRequest) {
  let body: RouteRequest;
  try {
    body = (await req.json()) as RouteRequest;
  } catch {
    return NextResponse.json({ options: [] }, { status: 400 });
  }

  if (!isCoord(body.start) || !isCoord(body.end)) {
    return NextResponse.json({ options: [] }, { status: 200 });
  }

  const stops = Array.isArray(body.stops) ? body.stops.filter(isCoord) : [];
  const coords = [body.start, ...stops, body.end];
  if (coords.length < 2) {
    return NextResponse.json({ options: [] }, { status: 200 });
  }

  const coordPath = coords.map((coord) => `${coord.lng},${coord.lat}`).join(";");
  const url = new URL(`${OSRM_BASE}/${coordPath}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("alternatives", "3");
  url.searchParams.set("steps", "false");

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "carpool-optimizer/0.1 route options",
      },
      next: { revalidate: 60 * 15 },
    });
    if (!res.ok) return NextResponse.json({ options: [] }, { status: 200 });

    const data = (await res.json()) as OsrmResponse;
    const options =
      data.routes?.flatMap((route, index) => {
        const coordinates = route.geometry?.coordinates ?? [];
        if (
          typeof route.duration !== "number" ||
          typeof route.distance !== "number" ||
          coordinates.length < 2
        ) {
          return [];
        }
        return [
          {
            id: `route-${index}`,
            label: optionLabel(index, route.duration, route.distance),
            etaSeconds: Math.round(route.duration),
            distanceMeters: route.distance,
            polyline: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
          },
        ];
      }) ?? [];

    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ options: [] }, { status: 200 });
  }
}
