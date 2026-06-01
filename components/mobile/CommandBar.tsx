"use client";

import { Copy, Navigation, Pencil, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Region 4 of the mobile cockpit: a single pinned action row whose contents depend on the
 * stage. In Build/Tune it drives optimization; in Go it owns the navigation handoff
 * (RouteSummary renders chromeless so there's exactly one action bar).
 */
export function CommandBar({
  mode,
  loading,
  canOptimize,
  saveLabel,
  onOptimize,
  onSave,
  onClear,
  onOpenMaps,
  onCopyLink,
  onEdit,
}: {
  mode: "plan" | "go";
  loading: boolean;
  canOptimize: boolean;
  saveLabel: string;
  onOptimize: () => void;
  onSave: () => void;
  onClear: () => void;
  onOpenMaps: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
}) {
  if (mode === "go") {
    return (
      <div className="flex items-center gap-2">
        <Button variant="success" size="md" fullWidth onClick={onOpenMaps} className="flex-1">
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Open in Google Maps
        </Button>
        <IconAction label="Copy route link" onClick={onCopyLink}>
          <Copy className="h-4 w-4" aria-hidden="true" />
        </IconAction>
        <IconAction label={saveLabel} onClick={onSave}>
          <Save className="h-4 w-4" aria-hidden="true" />
        </IconAction>
        <IconAction label="Edit route" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </IconAction>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="primary"
        size="md"
        onClick={onOptimize}
        disabled={loading || !canOptimize}
        className="flex-1"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {loading ? "Planning…" : "Plan drop-off order"}
      </Button>
      <IconAction label={saveLabel} onClick={onSave} disabled={loading}>
        <Save className="h-4 w-4" aria-hidden="true" />
      </IconAction>
      <IconAction label="Clear route and start over" onClick={onClear}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </IconAction>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800/80 text-slate-100 transition hover:bg-slate-700/80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      {children}
    </button>
  );
}
