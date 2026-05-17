"use client";

import { Clock, Copy, MapPin, Milestone, Navigation, Pencil, Save, User } from "lucide-react";
import { useState } from "react";
import type { OptimizedRoute } from "@/lib/types";
import { buildGoogleMapsUrl } from "@/lib/routeUrl";
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
  const url = buildGoogleMapsUrl({ start, end, orderedStops: optimized.orderedStops });

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
    <div className="space-y-4 animate-rise">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">Optimized route</h2>
        <Badge tone={optimized.source === "google" ? "live" : "demo"}>
          {optimized.source === "google" ? "Live" : "Demo"}
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

      <ol className="space-y-1.5">
        <StopRow tone="start" index="S" label="Start" address={start} />
        {optimized.orderedStops.map((s, i) => (
          <StopRow
            key={`${s}-${i}`}
            tone="stop"
            index={String(i + 1)}
            label={riderNames?.[i] ?? `Stop ${i + 1}`}
            address={s}
          />
        ))}
        <StopRow tone="end" index="E" label="End" address={end} />
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="contents"
        >
          <Button variant="success" size="lg" fullWidth>
            <Navigation className="h-4 w-4" aria-hidden="true" /> Open in Maps
          </Button>
        </a>
        <Button variant="secondary" size="lg" fullWidth onClick={copy}>
          <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Copied" : "Copy link"}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit stops
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={onSave}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save route
        </Button>
      </div>

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
          Demo mode — stop order is a deterministic placeholder. Add a Google Maps API key for live optimization.
        </div>
      )}
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
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>
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
}: {
  tone: "start" | "stop" | "end";
  index: string;
  label: string;
  address: string;
}) {
  const indexClass =
    tone === "start"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : tone === "end"
      ? "bg-red-500/15 text-red-300 ring-red-500/30"
      : "bg-blue-500/15 text-blue-300 ring-blue-500/30";
  const showRiderIcon = tone === "stop" && label !== `Stop ${index}`;
  return (
    <li className="flex items-center gap-2.5">
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
      </div>
    </li>
  );
}
