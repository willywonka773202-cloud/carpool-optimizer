import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type AlertTone = "error" | "warn" | "info";

const toneStyles: Record<AlertTone, string> = {
  error: "border-red-500/30 bg-red-500/10 text-red-100",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-100",
};

const toneIcon: Record<AlertTone, React.ReactNode> = {
  error: <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
  warn: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
  info: <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
};

export function ErrorAlert({
  message,
  tone = "error",
  onDismiss,
}: {
  message: string;
  tone?: AlertTone;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${toneStyles[tone]}`}
    >
      {toneIcon[tone]}
      <span className="flex-1 min-w-0">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-current/80 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
