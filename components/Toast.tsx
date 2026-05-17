"use client";

import * as React from "react";
import { CheckCircle2, X, AlertCircle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  tone: ToastTone;
  durationMs: number;
};

type ShowInput = {
  title: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  show: (input: ShowInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 2400;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = React.useCallback(
    (input: ShowInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = {
        id,
        title: input.title,
        tone: input.tone ?? "info",
        durationMs: input.durationMs ?? DEFAULT_DURATION,
      };
      setItems((cur) => {
        const next = [item, ...cur];
        return next.slice(0, MAX_TOASTS);
      });
      const timer = setTimeout(() => dismiss(id), item.durationMs);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider/>");
  }
  return ctx;
}

const toneStyles: Record<ToastTone, string> = {
  success: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  error: "bg-red-500/15 text-red-200 ring-red-500/30",
  info: "bg-slate-800/90 text-slate-100 ring-white/10",
};

const toneIcon: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
  info: <Info className="h-4 w-4" aria-hidden="true" />,
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div
      // Bottom center on mobile, bottom-right on >=sm. Above safe-area.
      className={
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 " +
        "px-3 pb-safe sm:left-auto sm:right-4 sm:items-end"
      }
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "animate-rise pointer-events-auto flex w-full max-w-sm items-center gap-2 " +
            "rounded-xl px-3 py-2.5 text-sm shadow-card ring-1 backdrop-blur " +
            toneStyles[t.tone]
          }
        >
          {toneIcon[t.tone]}
          <span className="flex-1 min-w-0 truncate">{t.title}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
            className="rounded-md p-1 text-slate-300/80 hover:bg-white/5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
