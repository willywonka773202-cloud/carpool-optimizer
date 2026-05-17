"use client";

import { MapPin, X } from "lucide-react";
import { useState } from "react";
import { useAddressSuggestions } from "@/lib/useAddressSuggestions";
import { AddressSuggestions } from "./AddressSuggestions";

export function LocationInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  iconTone = "slate",
  apiKey = null,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  iconTone?: "slate" | "emerald" | "red";
  apiKey?: string | null;
}) {
  const iconClass =
    iconTone === "emerald"
      ? "text-emerald-400"
      : iconTone === "red"
      ? "text-red-400"
      : "text-slate-400";
  const hasValue = value.length > 0;
  const [focused, setFocused] = useState(false);
  const { suggestions, loading } = useAddressSuggestions(value, apiKey);

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <MapPin className={`h-3.5 w-3.5 ${iconClass}`} aria-hidden="true" /> {label}
      </span>
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? label}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
          aria-label={label}
          autoComplete="off"
          className={
            "w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-3 text-sm text-slate-100 " +
            "placeholder:text-slate-500 outline-none transition " +
            "focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 " +
            "disabled:opacity-50 disabled:cursor-not-allowed " +
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
          open={focused && apiKey !== null}
          loading={loading}
          suggestions={suggestions}
          onPick={(s) => {
            onChange(s.label);
            setFocused(false);
          }}
        />
      </div>
    </label>
  );
}
