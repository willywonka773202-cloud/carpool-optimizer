"use client";

import { Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiKeyDialog } from "./ApiKeyDialog";

const SETTINGS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === "true";

export function SettingsMenu({ onApiKeySaved }: { onApiKeySaved: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside the popover.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!SETTINGS_ENABLED) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl animate-rise">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Settings
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close settings"
              className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <ApiKeyDialog onSaved={onApiKeySaved} />
        </div>
      )}
    </div>
  );
}
