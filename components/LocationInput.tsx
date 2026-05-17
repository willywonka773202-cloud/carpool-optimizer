"use client";

import { MapPin, X } from "lucide-react";

export function LocationInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  iconTone = "slate",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  iconTone?: "slate" | "emerald" | "red";
}) {
  const iconClass =
    iconTone === "emerald"
      ? "text-emerald-400"
      : iconTone === "red"
      ? "text-red-400"
      : "text-slate-400";
  const hasValue = value.length > 0;
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
          aria-label={label}
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
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </label>
  );
}
