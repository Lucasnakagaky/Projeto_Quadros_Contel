import { ListChecks, PlayCircle } from "lucide-react";

export function StartFormCard({
  quantidadeCampos,
  onAbrirCampos,
}: {
  quantidadeCampos: number;
  onAbrirCampos: () => void;
}) {
  return (
    <button
      onClick={onAbrirCampos}
      className="gdt-card gdt-focus flex w-64 shrink-0 cursor-pointer flex-col overflow-hidden text-left"
    >
      <div className="flex items-center gap-2 bg-violet-50 px-4 py-2.5">
        <PlayCircle size={16} className="text-violet-500" />
        <span className="text-sm font-semibold text-violet-700">Formulário inicial</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-slate-500">O fluxo de trabalho começa aqui.</p>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <ListChecks size={15} className="text-slate-400" />
          {quantidadeCampos} {quantidadeCampos === 1 ? "Campo" : "Campos"}
        </div>
      </div>
    </button>
  );
}
