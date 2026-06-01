"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAddressSuggestions } from "@/lib/useAddressSuggestions";
import type { Suggestion } from "@/lib/orsAutocomplete";
import { AddressSuggestions } from "./AddressSuggestions";

export function LocationInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  iconTone = "slate",
  apiKey = null,
  onPreview,
  onPick,
  density = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPreview?: (coord: Suggestion["coord"] | null) => void;
  onPick?: (s: Suggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  iconTone?: "slate" | "emerald" | "red";
  apiKey?: string | null;
  density?: "default" | "compact";
}) {
  const iconClass =
    iconTone === "emerald"
      ? "text-emerald-400"
      : iconTone === "red"
      ? "text-red-400"
      : "text-slate-400";
  const hasValue = value.length > 0;
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { suggestions, loading } = useAddressSuggestions(value, apiKey);
  const onPreviewRef = useRef(onPreview);
  const lastPreviewKeyRef = useRef("");

  useEffect(() => {
    onPreviewRef.current = onPreview;
  }, [onPreview]);

  useEffect(() => {
    const coord = suggestions[0]?.coord ?? null;
    const key = coord ? `${coord.lat},${coord.lng}` : "none";
    if (lastPreviewKeyRef.current === key) return;
    lastPreviewKeyRef.current = key;
    onPreviewRef.current?.(coord);
  }, [suggestions]);

  return (
    <label className="block">
      <span
        className={
          "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 " +
          (density === "compact" ? "mb-1" : "mb-1.5")
        }
      >
        <MapPin className={`h-3.5 w-3.5 ${iconClass}`} aria-hidden="true" /> {label}
      </span>
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? label}
          onChange={(e) => {
            setDismissed(false);
            onChange(e.target.value);
          }}
          onFocus={() => {
            setDismissed(false);
            setFocused(true);
          }}
          onBlur={() =>
            setTimeout(() => {
              setFocused(false);
              setDismissed(true);
            }, 120)
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
          aria-label={label}
          autoComplete="off"
          className={
            "w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 text-sm text-slate-100 " +
            "placeholder:text-slate-500 outline-none transition " +
            "focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 " +
            "disabled:opacity-50 disabled:cursor-not-allowed " +
            (density === "compact" ? "h-10 py-0 " : "py-3 ") +
            (hasValue ? "pr-10" : "")
          }
        />
        {hasValue && !disabled && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        )}
        <AddressSuggestions
          open={!dismissed && (focused || loading || suggestions.length > 0)}
          loading={loading}
          suggestions={suggestions}
          onPick={(s) => {
            onChange(s.label);
            onPick?.(s);
            setDismissed(true);
            setFocused(false);
          }}
        />
      </div>
    </label>
  );
}
