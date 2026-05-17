"use client";

import { MapPin } from "lucide-react";

/**
 * Designed "no live map" surface. Looks intentional, not broken.
 * Renders when no Google Maps API key is available, or when the map script fails to load.
 */
export function DemoMapPreview({
  title = "Demo route preview",
  body = "Add a Google Maps API key to see the live map. Route optimization still works in demo mode.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Layered background: deep gradient + soft glows + grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_55%),linear-gradient(135deg,#020617_0%,#0f172a_70%,#0b1220_100%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="dmp-grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="rgb(148 163 184)"
              strokeOpacity="0.35"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dmp-grid)" />
      </svg>

      {/* Route illustration */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dmp-route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="dmp-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft halo under the route */}
        <path
          d="M 90 140 C 220 200, 280 380, 420 360 S 660 280, 720 480"
          fill="none"
          stroke="url(#dmp-route)"
          strokeOpacity="0.25"
          strokeWidth="22"
          strokeLinecap="round"
        />
        {/* Crisp route line */}
        <path
          d="M 90 140 C 220 200, 280 380, 420 360 S 660 280, 720 480"
          fill="none"
          stroke="url(#dmp-route)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0 0"
          filter="url(#dmp-glow)"
        />

        {/* Start pin (S) */}
        <Pin cx={90} cy={140} kind="start" label="S" />
        {/* Intermediate stops */}
        <Pin cx={310} cy={300} kind="stop" label="1" />
        <Pin cx={520} cy={340} kind="stop" label="2" />
        <Pin cx={640} cy={400} kind="stop" label="3" />
        {/* End pin (E) */}
        <Pin cx={720} cy={480} kind="end" label="E" />
      </svg>

      {/* Floating info card */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-center shadow-card backdrop-blur-xl">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-400/30">
            <MapPin className="h-5 w-5 text-blue-300" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

function Pin({
  cx,
  cy,
  kind,
  label,
}: {
  cx: number;
  cy: number;
  kind: "start" | "stop" | "end";
  label: string;
}) {
  const fill =
    kind === "start" ? "#10b981" : kind === "end" ? "#ef4444" : "#3b82f6";
  const ring =
    kind === "start" ? "#34d39955" : kind === "end" ? "#ef444455" : "#3b82f655";
  return (
    <g>
      {/* outer halo */}
      <circle cx={cx} cy={cy} r="20" fill={ring} />
      {/* main pill */}
      <circle cx={cx} cy={cy} r="13" fill={fill} stroke="white" strokeOpacity="0.85" strokeWidth="1.5" />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
        fontSize="11"
        fontWeight="700"
        fill="white"
      >
        {label}
      </text>
    </g>
  );
}
