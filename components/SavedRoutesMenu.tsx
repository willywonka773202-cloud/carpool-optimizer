"use client";

import { Check, Menu as MenuIcon, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteRoute, listSavedRoutes, renameRoute } from "@/lib/storage";
import type { SavedRoute } from "@/lib/types";

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString();
}

export function SavedRoutesMenu({ onLoad }: { onLoad: (r: SavedRoute) => void }) {
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function refresh() {
    setRoutes(listSavedRoutes());
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  function startRename(r: SavedRoute) {
    setEditingId(r.id);
    setEditValue(r.label);
  }

  function commitRename() {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed.length > 0) {
      renameRoute(editingId, trimmed);
      refresh();
    }
    setEditingId(null);
    setEditValue("");
  }

  function cancelRename() {
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="absolute left-3 top-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open saved routes"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 text-slate-100 shadow-lg ring-1 ring-white/10 backdrop-blur transition hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl animate-rise"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Saved routes
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close saved routes"
              className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {routes.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-slate-300">No saved routes yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Optimize a route and tap Save to reuse it later.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {routes.map((r) => {
                const editing = editingId === r.id;
                const ts = r.updatedAt ?? r.createdAt;
                return (
                  <li key={r.id} className="flex items-start gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            aria-label="Route name"
                            className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                          />
                          <button
                            type="button"
                            onClick={commitRename}
                            aria-label="Save name"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-300 hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            aria-label="Cancel rename"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onLoad(r);
                            setOpen(false);
                          }}
                          className="block w-full rounded-md px-2 py-1 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-100">
                              {r.label}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              {r.stops.length} stop{r.stops.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-400">
                            {r.start} → {r.end}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            {formatRelative(ts)}
                          </div>
                        </button>
                      )}
                    </div>
                    {!editing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startRename(r)}
                          aria-label={`Rename ${r.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteRoute(r.id);
                            refresh();
                          }}
                          aria-label={`Delete ${r.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
