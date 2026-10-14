import { Maximize2, Minus, Plus } from "lucide-react";

const BOTAO =
  "gdt-focus flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-(--duracao-rapida) hover:bg-white hover:text-indigo-700 cursor-pointer";

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
    <div className="gdt-barra pointer-events-auto absolute bottom-5 left-5 flex items-center gap-0.5 p-1">
      <button onClick={onZoomOut} className={BOTAO} aria-label="Diminuir zoom">
        <Minus size={15} />
      </button>
      <span className="w-11 text-center text-xs font-medium text-slate-500">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn} className={BOTAO} aria-label="Aumentar zoom">
        <Plus size={15} />
      </button>
      <div className="mx-1 h-5 w-px bg-slate-200" />
      <button onClick={onReset} className={BOTAO} aria-label="Ajustar à tela">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
