"use client";

import { Key } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearDevApiKey,
  DEV_KEY_STORAGE_KEY,
  writeDevApiKey,
} from "@/lib/googleMaps";
import { Button } from "@/components/ui/Button";

const DIALOG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === "true";

export function ApiKeyDialog({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasStoredKey(Boolean(window.localStorage.getItem(DEV_KEY_STORAGE_KEY)));
  }, []);

  if (!DIALOG_ENABLED) return null;

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    writeDevApiKey(trimmed);
    setHasStoredKey(true);
    setValue("");
    onSaved();
  }

  function handleClear() {
    clearDevApiKey();
    setHasStoredKey(false);
    setValue("");
    onSaved();
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
          <Key className="h-4 w-4" aria-hidden="true" />
          <span>Dev API key</span>
        </div>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 " +
            (hasStoredKey
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
              : "bg-slate-800/60 text-slate-300 ring-white/10")
          }
        >
          {hasStoredKey ? "Detected" : "Not set"}
        </span>
      </div>
      <p className="mb-3 text-xs leading-5 text-amber-100/80">
        Pasted keys are stored only in your browser at{" "}
        <code className="rounded bg-black/30 px-1">{DEV_KEY_STORAGE_KEY}</code> and are never written
        into saved routes. Use this for local testing only — production should use
        the{" "}
        <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable.
      </p>
      <div className="flex gap-2">
        <input
          aria-label="Google Maps API key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AIza..."
          className="h-10 min-w-0 flex-1 rounded-lg border border-amber-500/30 bg-slate-900/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-400/20"
        />
        <Button size="md" variant="primary" onClick={handleSave} disabled={!value.trim()}>
          Save
        </Button>
        <Button size="md" variant="ghost" onClick={handleClear} disabled={!hasStoredKey}>
          Clear
        </Button>
      </div>
    </div>
  );
}
