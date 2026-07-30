"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, Layers } from "lucide-react";
import { Fase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PhaseActionsList } from "./phase-actions-list";

export function PhaseCard({
  fase,
  onAbrir,
  onAdicionarCampos,
  onAtribuirMembros,
}: {
  fase: Fase;
  onAbrir: () => void;
  onAdicionarCampos: () => void;
  onAtribuirMembros: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `fase-${fase.id}`,
    data: { type: "fase" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = fase.ehFinal ? CheckCircle2 : Layers;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50"
      )}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: `${fase.cor}1f` }}
      >
        <Icon size={16} style={{ color: fase.cor }} />
        <span className="flex-1 truncate text-sm font-semibold" style={{ color: fase.cor }}>
          {fase.nome}
        </span>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-0.5 text-current opacity-50 hover:opacity-100 active:cursor-grabbing"
          style={{ color: fase.cor }}
          aria-label="Arrastar fase"
        >
          <GripVertical size={15} />
        </button>
      </div>

      <button onClick={onAbrir} className="px-4 pt-3 text-left">
        <p className="line-clamp-2 text-sm text-slate-500">
          {fase.descricao || "Sem descrição."}
        </p>
      </button>

      <div className="px-2 pb-2 pt-1">
        <PhaseActionsList onAdicionarCampos={onAdicionarCampos} onAtribuirMembros={onAtribuirMembros} />
      </div>
    </div>
  );
}
