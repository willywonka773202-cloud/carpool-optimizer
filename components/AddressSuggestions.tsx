"use client";

import { Loader2, MapPin } from "lucide-react";
import type { Suggestion } from "@/lib/orsAutocomplete";

type Props = {
  open: boolean;
  loading: boolean;
  suggestions: Suggestion[];
  onPick: (s: Suggestion) => void;
};

/**
 * Pure dropdown panel. Positioning is the parent's job — wrap your input in a
 * `relative` container and render this as a sibling.
 */
export function AddressSuggestions({ open, loading, suggestions, onPick }: Props) {
  if (!open) return null;
  if (!loading && suggestions.length === 0) return null;
  return (
    <div
      role="listbox"
      className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl"
    >
      {loading && suggestions.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Searching…
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                // onMouseDown fires before the input's onBlur, so the pick registers
                // even when the input loses focus to the click target.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(s);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/5"
              >
                <MapPin className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
