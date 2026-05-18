"use client";

import {
  Car,
  ChevronRight,
  Clock,
  Copy,
  MapPin,
  Navigation,
  Pencil,
  Route,
  Save,
  User,
} from "lucide-react";
import { useState } from "react";
import type { OptimizedRoute, RouteLeg } from "@/lib/types";
import { buildOptimizedHandoffUrl } from "@/lib/handoffUrl";
import { formatDistance, formatEta } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function RouteSummary({
  start,
  end,
  optimized,
  riderNames,
  onEdit,
  onSave,
}: {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  riderNames?: (string | null)[];
  onEdit: () => void;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFallbackVisible, setCopyFallbackVisible] = useState(false);
  const url = buildOptimizedHandoffUrl(start, end, optimized);
  const legs: RouteLeg[] | undefined = optimized.legs;
  const totalStops = optimized.orderedStops.length;

  // Running sum of leg times — index i = cumulative seconds to arrive at stop i
  const cumulativeSecs: number[] = [];
  if (legs) {
    let sum = 0;
    for (const leg of legs) {
      sum += leg.etaSeconds;
      cumulativeSecs.push(sum);
    }
  }

  async function copy() {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFallbackVisible(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyFallbackVisible(true);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pb-3">

        {/* Header */}
        <div className="flex items-center justify-between animate-rise">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Route optimized
            </p>
            <h2 className="text-lg font-bold text-slate-100">Ready to drive</h2>
          </div>
          <Badge tone={optimized.source === "ors" ? "live" : "demo"}>
            {optimized.source === "ors" ? "Live" : "Demo"}
          </Badge>
        </div>

        {/* Hero time card */}
        <div
          className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-violet-600/15 p-4 animate-rise"
          style={{ animationDelay: "50ms" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
              <Car className="h-5 w-5 text-blue-300" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold tracking-tight text-slate-100">
                {formatEta(optimized.etaSeconds)}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Route className="h-3 w-3" aria-hidden="true" />
                  {formatDistance(optimized.distanceMeters)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {totalStops} drop-off{totalStops !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
        </div>

        {/* Timeline */}
        <ol className="space-y-0">
          <TimelineStop
            tone="start"
            index="S"
            label="Start"
            address={start}
            isLast={false}
            animDelay={100}
          />
          {optimized.orderedStops.map((stop, i) => (
            <TimelineStop
              key={`${stop}-${i}`}
              tone="stop"
              index={String(i + 1)}
              label={riderNames?.[i] ?? `Stop ${i + 1}`}
              address={stop}
              leg={legs?.[i]}
              cumulativeSecs={cumulativeSecs[i]}
              isLast={false}
              animDelay={100 + (i + 1) * 55}
            />
          ))}
          <TimelineStop
            tone="end"
            index="E"
            label="End"
            address={end}
            leg={legs?.[legs.length - 1]}
            cumulativeSecs={cumulativeSecs[cumulativeSecs.length - 1]}
            isLast
            animDelay={100 + (totalStops + 1) * 55}
          />
        </ol>

        {copyFallbackVisible && (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Copy blocked — select manually
            </p>
            <textarea
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-950/60 p-2 text-xs text-slate-200 outline-none focus:border-blue-400"
            />
          </div>
        )}

        {optimized.source === "mock" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
            Demo mode — add an OpenRouteService API key for a real optimized route.
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 -mx-1 mt-3 border-t border-white/10 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/70 px-1 pt-3 pb-1 backdrop-blur">
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <Button variant="success" size="lg" fullWidth aria-label="Open optimized route in Google Maps">
            <Navigation className="h-5 w-5" aria-hidden="true" />
            Open in Google Maps
          </Button>
        </a>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={copy}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button variant="secondary" size="sm" fullWidth onClick={onSave}>
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save
          </Button>
          <Button variant="ghost" size="sm" fullWidth onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function TimelineStop({
  tone,
  index,
  label,
  address,
  leg,
  cumulativeSecs,
  isLast,
  animDelay,
}: {
  tone: "start" | "stop" | "end";
  index: string;
  label: string;
  address: string;
  leg?: RouteLeg;
  cumulativeSecs?: number;
  isLast: boolean;
  animDelay: number;
}) {
  const hasRiderName = tone === "stop" && label !== `Stop ${index}`;

  const circleClass =
    tone === "start"
      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.45)]"
      : tone === "end"
      ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]"
      : "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.35)]";

  const cardClass =
    tone === "start"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "end"
      ? "border-red-500/20 bg-red-500/5"
      : "border-white/[0.07] bg-slate-800/30";

  const arrivalLabel =
    tone !== "start" && cumulativeSecs != null ? formatEta(cumulativeSecs) : null;

  return (
    <li
      className="relative flex gap-3 pb-3 animate-rise"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Vertical connector drawn from bottom of circle to bottom of li */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-slate-500/50 to-slate-700/10" />
      )}

      {/* Circle marker */}
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${circleClass}`}
      >
        {index}
      </div>

      {/* Content card */}
      <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 ${cardClass}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {hasRiderName && (
                <User className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span className="truncate text-xs font-semibold text-slate-200">{label}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] leading-4 text-slate-400">{address}</p>
          </div>
          {arrivalLabel && (
            <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300 ring-1 ring-violet-500/25">
              +{arrivalLabel}
            </span>
          )}
        </div>

        {leg && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-white/[0.06]">
              <Clock className="h-2.5 w-2.5 text-blue-400" aria-hidden="true" />
              {formatEta(leg.etaSeconds)} leg
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-white/[0.06]">
              <ChevronRight className="h-2.5 w-2.5 text-slate-400" aria-hidden="true" />
              {formatDistance(leg.distanceMeters)}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
