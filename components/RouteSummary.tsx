"use client";

import {
  Clock,
  Copy,
  MapPin,
  Milestone,
  Navigation,
  Pencil,
  Save,
  ShieldCheck,
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

  async function copy() {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
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
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pb-3 animate-rise">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              Route optimized
            </p>
            <h2 className="text-lg font-bold text-slate-100">Ready to drive</h2>
          </div>
          <Badge
            tone={
              optimized.source === "mock" || optimized.isEstimated ? "demo" : "live"
            }
          >
            {optimized.source === "mock"
              ? "Demo route"
              : optimized.isEstimated
              ? "Estimated route"
              : "Live route"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}
            label="ETA"
            value={formatEta(optimized.etaSeconds)}
          />
          <Metric
            icon={<Milestone className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Distance"
            value={formatDistance(optimized.distanceMeters)}
          />
          <Metric
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Stops"
            value={String(optimized.orderedStops.length)}
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Google Maps will open with this exact optimized stop order.</span>
        </div>

        <ol className="space-y-1.5">
          <StopRow tone="start" index="S" label="Start" address={start} />
          {optimized.orderedStops.map((s, i) => (
            <StopRow
              key={`${s}-${i}`}
              tone="stop"
              index={String(i + 1)}
              label={riderNames?.[i] ?? `Stop ${i + 1}`}
              address={s}
              leg={legs?.[i]}
            />
          ))}
          <StopRow tone="end" index="E" label="End" address={end} leg={legs?.[legs.length - 1]} />
        </ol>

        {copyFallbackVisible && (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Copy blocked — select and copy manually
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
            Demo mode — this is not real route optimization. Add an OpenRouteService API key for a live route.
          </div>
        )}

        {optimized.source === "ors" && optimized.isEstimated && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
            Estimated preview — the stop order is real, but the on-map polyline and ETA fell back to a straight-line estimate because the routing provider didn&apos;t return geometry. The Google Maps handoff still opens with the optimized order.
          </div>
        )}
      </div>

      {/* Sticky CTA bar — always visible at bottom of scroll container */}
      <div className="sticky bottom-0 -mx-1 mt-3 border-t border-white/10 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/70 px-1 pt-3 pb-1 backdrop-blur">
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <Button variant="success" size="lg" fullWidth aria-label="Open optimized route in Google Maps">
            <Navigation className="h-5 w-5" aria-hidden="true" />
            Open Optimized Route in Google Maps
          </Button>
        </a>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={copy}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? "Copied" : "Copy link"}
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
      <div className="mb-0.5 flex items-center gap-1 text-slate-400">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-bold text-slate-100">{value}</div>
    </div>
  );
}

function StopRow({
  tone,
  index,
  label,
  address,
  leg,
}: {
  tone: "start" | "stop" | "end";
  index: string;
  label: string;
  address: string;
  leg?: { etaSeconds: number; distanceMeters: number };
}) {
  const indexClass =
    tone === "start"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : tone === "end"
      ? "bg-red-500/15 text-red-300 ring-red-500/30"
      : "bg-blue-500/15 text-blue-300 ring-blue-500/30";
  const showRiderIcon = tone === "stop" && label !== `Stop ${index}`;
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className={
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 " +
          indexClass
        }
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-xs font-semibold text-slate-300">
          {showRiderIcon && (
            <User className="h-3 w-3 text-slate-500" aria-hidden="true" />
          )}
          {label}
        </div>
        <div className="truncate text-xs text-slate-400">{address}</div>
        {leg && (
          <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" /> {formatEta(leg.etaSeconds)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDistance(leg.distanceMeters)}</span>
          </div>
        )}
      </div>
    </li>
  );
}
