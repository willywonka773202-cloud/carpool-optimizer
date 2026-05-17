"use client";

import { Key } from "lucide-react";
import { useState } from "react";
import { clearDevApiKey, writeDevApiKey } from "@/lib/googleMaps";

const DIALOG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === "true";

export function ApiKeyDialog({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("");
  if (!DIALOG_ENABLED) return null;

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Key className="h-4 w-4" /> Dev/preview Google Maps key
      </div>
      <p className="mb-2 text-xs">
        Pastes are stored only in this browser at <code>carpool.devApiKey</code>. Never used in production builds.
      </p>
      <div className="flex gap-2">
        <input
          aria-label="Google Maps API key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AIza..."
          className="h-9 min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={() => {
            writeDevApiKey(value.trim());
            onSaved();
          }}
          className="rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            clearDevApiKey();
            setValue("");
            onSaved();
          }}
          className="rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
