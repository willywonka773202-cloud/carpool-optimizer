"use client";

import { useEffect, useState } from "react";

/**
 * Branded first-paint splash: a route line draws itself with a dot riding it, the wordmark
 * fades up, then the whole thing dissolves — masking the map's hydration/first-tile flash.
 * ponytail: timed splash (min display); good enough to cover the flash without wiring a
 * real map-ready event. Reduced-motion users get an instant, near-static hide via globals.
 */
export function LoadingScreen() {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 950);
    const t2 = setTimeout(() => setGone(true), 1480);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className={
        "fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-[#05070f] " +
        (fading ? "animate-splash-fade" : "")
      }
    >
      <svg width="220" height="130" viewBox="0 0 220 130" fill="none" aria-hidden="true">
        <path
          d="M 20 80 C 70 40, 130 120, 200 50"
          stroke="url(#splashGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          className="splash-path"
        />
        <circle cx="20" cy="80" r="7" fill="#10b981" />
        <circle cx="200" cy="50" r="7" fill="#ef4444" />
        <circle r="5" fill="#ffffff" className="splash-dot" />
        <defs>
          <linearGradient id="splashGrad" x1="20" y1="80" x2="200" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399" />
            <stop offset="0.5" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <p className="animate-fade-up mt-1 text-xl font-bold tracking-tight text-slate-100">Carpool</p>
      <p className="animate-fade-up text-xs text-slate-500">finding the smartest route…</p>
    </div>
  );
}
