"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, CheckSquare } from "lucide-react";
import { Campo, Card, Etiqueta, Usuario } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { cn, iniciais } from "@/lib/utils";

export function CardChip({
  card,
  campos,
  etiquetas = [],
  usuarios = [],
  temFilhos = false,
  onOpen,
  dragOverlay = false,
}: {
  card: Card;
  campos: Campo[];
  etiquetas?: Etiqueta[];
  usuarios?: Usuario[];
  temFilhos?: boolean;
  onOpen: () => void;
  dragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { type: "card", faseId: card.faseId },
      disabled: dragOverlay,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const campoEtiquetas = campoPorTipo(campos, "etiquetas");
  const campoResponsavel = campoPorTipo(campos, "responsavel");
  const campoVencimento = campoPorTipo(campos, "data_vencimento");

  const etiquetaIds = campoEtiquetas ? stringArray(card.valoresCampos[campoEtiquetas.id]) : [];
  const responsavelIds = campoResponsavel ? stringArray(card.valoresCampos[campoResponsavel.id]) : [];
  const vencimento = campoVencimento ? (card.valoresCampos[campoVencimento.id] as string | undefined) : undefined;

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={dragOverlay ? undefined : style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={onOpen}
      className={cn(
        "relative cursor-pointer touch-none rounded-md border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      {temFilhos && (
        <span
          title="Possui cards conectados"
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600"
        >
          <ArrowRight size={12} />
        </span>
      )}

      <p className="pr-5 text-sm text-slate-800">{card.titulo}</p>

      {vencimento && (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-slate-400">
          <span>Entrega: {new Date(vencimento).toLocaleDateString("pt-BR")}</span>
        </div>
      )}

      {etiquetaIds.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {etiquetaIds.map((id) => {
            const etiqueta = etiquetas.find((e) => e.id === id);
            if (!etiqueta) return null;
            return (
              <span
                key={id}
                title={etiqueta.nome}
                className="h-2 w-8 rounded-full"
                style={{ backgroundColor: etiqueta.cor }}
              />
            );
          })}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <CheckSquare size={13} />
        </span>
        {responsavelIds.length > 0 && (
          <span className="ml-auto flex -space-x-1.5">
            {responsavelIds.slice(0, 3).map((id) => {
              const usuario = usuarios.find((m) => m.id === id);
              return (
                <span
                  key={id}
                  title={usuario?.nome}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold text-white"
                  style={{ backgroundColor: usuario?.corAvatar ?? "#94a3b8" }}
                >
                  {usuario ? iniciais(usuario.nome) : ""}
                </span>
              );
            })}
          </span>
        )}
      </div>
    </div>
  );
}
