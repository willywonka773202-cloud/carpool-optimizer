import { NextResponse, type NextRequest } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type NominatimPlace = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text")?.trim() ?? "";
  const size = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("size") ?? "5") || 5, 1),
    8
  );

  if (text.length < 3) {
    return NextResponse.json({ features: [] });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(size));
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", text);

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "carpool-optimizer/0.1 address suggestions",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) {
      return NextResponse.json({ features: [] }, { status: 200 });
    }

    const places = (await res.json()) as NominatimPlace[];
    const features = places
      .map((place) => {
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        if (!place.display_name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }
        return {
          properties: { label: place.display_name },
          geometry: { coordinates: [lon, lat] },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ features });
  } catch {
    return NextResponse.json({ features: [] }, { status: 200 });
  }
}
