import { Maximize2, Minus, Plus } from "lucide-react";

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
      <button
        onClick={onZoomOut}
        className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
        aria-label="Diminuir zoom"
      >
        <Minus size={15} />
      </button>
      <span className="w-11 text-center text-xs font-medium text-slate-500">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
        aria-label="Aumentar zoom"
      >
        <Plus size={15} />
      </button>
      <div className="mx-1 h-5 w-px bg-slate-200" />
      <button
        onClick={onReset}
        className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
        aria-label="Ajustar à tela"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
