import { Minus, Plus } from "lucide-react";

export function WaypointList({
  waypoints,
  onAdd,
  onRemove,
  onChange,
  disabled,
}: {
  waypoints: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drop-off stops</p>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add stop
        </button>
      </div>
      <div className="space-y-2">
        {waypoints.map((wp, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
              {i + 1}
            </span>
            <input
              type="text"
              aria-label={`Stop ${i + 1} address`}
              value={wp}
              disabled={disabled}
              placeholder={`Stop ${i + 1}`}
              onChange={(e) => onChange(i, e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <button
              type="button"
              aria-label={`Remove stop ${i + 1}`}
              onClick={() => onRemove(i)}
              disabled={disabled}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
