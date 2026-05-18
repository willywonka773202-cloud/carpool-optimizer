import { type NextRequest, NextResponse } from "next/server";

const ORS_BASE = "https://api.openrouteservice.org";

type Params = Promise<{ path: string[] }>;

async function proxy(req: NextRequest, method: "GET" | "POST", path: string[]) {
  const orsUrl = `${ORS_BASE}/${path.join("/")}${req.nextUrl.search}`;

  const fwdHeaders: Record<string, string> = {
    "content-type": "application/json",
  };
  // Forward Authorization header (used by optimization + directions)
  const auth = req.headers.get("authorization");
  if (auth) fwdHeaders["authorization"] = auth;

  const init: RequestInit = { method, headers: fwdHeaders };
  if (method === "POST") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(orsUrl, init);
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  return proxy(req, "GET", path);
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  return proxy(req, "POST", path);
}
