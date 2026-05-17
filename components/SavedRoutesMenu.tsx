"use client";

import { Menu as MenuIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteRoute, listSavedRoutes } from "@/lib/storage";
import type { SavedRoute } from "@/lib/types";

export function SavedRoutesMenu({ onLoad }: { onLoad: (r: SavedRoute) => void }) {
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  useEffect(() => {
    if (open) setRoutes(listSavedRoutes());
  }, [open]);

  return (
    <div className="absolute left-3 top-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open saved routes"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <MenuIcon className="h-5 w-5 text-slate-700" />
      </button>
      {open && (
        <div className="mt-2 w-72 max-h-72 overflow-y-auto rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
          {routes.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No saved routes yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {routes.map((r) => (
                <li key={r.id} className="flex items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLoad(r);
                      setOpen(false);
                    }}
                    className="flex-1 truncate text-left text-sm text-slate-800 hover:underline"
                  >
                    <span className="font-semibold">{r.label}</span>
                    <span className="ml-2 text-xs text-slate-500">{r.stops.length} stops</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${r.label}`}
                    onClick={() => {
                      deleteRoute(r.id);
                      setRoutes(listSavedRoutes());
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
