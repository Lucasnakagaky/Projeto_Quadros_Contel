"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare } from "lucide-react";
import { Card, Etiqueta, Usuario } from "@/lib/types";
import { cn, iniciais } from "@/lib/utils";

export function CardItem({
  card,
  onOpen,
  etiquetas = [],
  membros = [],
  dragOverlay = false,
}: {
  card: Card;
  onOpen: () => void;
  etiquetas?: Etiqueta[];
  membros?: Usuario[];
  dragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { type: "card", listId: card.listId },
      disabled: dragOverlay,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={dragOverlay ? undefined : style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={onOpen}
      className={cn(
        "cursor-pointer touch-none rounded-md border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      <p
        className={cn(
          "text-sm text-slate-800",
          card.concluido && "text-slate-400 line-through"
        )}
      >
        {card.titulo}
      </p>
      {(card.dataEntregaPrevista || card.predecessorIds.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-slate-400">
          {card.dataEntregaPrevista && (
            <span>
              Entrega: {new Date(card.dataEntregaPrevista).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      )}
      {card.etiquetaIds.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {card.etiquetaIds.map((id) => {
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
        {card.responsavelIds.length > 0 && (
          <span className="ml-auto flex -space-x-1.5">
            {card.responsavelIds.slice(0, 3).map((id) => {
              const usuario = membros.find((m) => m.id === id);
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
