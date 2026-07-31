"use client";

import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { Campo, Card, Etiqueta, Fase, Usuario } from "@/lib/types";
import { CardChip } from "./card-chip";
import { FaseHeaderPopover } from "./fase-header-popover";
import { NovaFaseModal, NovaFaseValues } from "./nova-fase-modal";
import { cn } from "@/lib/utils";

export function FaseColumn({
  fase,
  cards,
  campos,
  etiquetas,
  usuarios,
  contagemFilhos,
  cardsFilhos,
  onOpenCard,
  onCreateCard,
  onAddFase,
  onUpdateFase,
  onDeleteFase,
}: {
  fase: Fase;
  cards: Card[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  contagemFilhos: Record<string, number>;
  cardsFilhos: Set<string>;
  onOpenCard: (id: string) => void;
  onCreateCard: (faseId: string) => void;
  onAddFase: () => void;
  onUpdateFase: (faseId: string, patch: Partial<NovaFaseValues> & { cor?: string }) => void;
  onDeleteFase: (faseId: string) => void;
}) {
  const [configurando, setConfigurando] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `fase-${fase.id}`,
    data: { type: "fase" },
  });
  const { setNodeRef: setDroppableRef } = useDroppable({ id: fase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-72 shrink-0 flex-col overflow-hidden rounded-lg bg-slate-100",
        isDragging && "opacity-50"
      )}
    >
      <div className="h-1.5 shrink-0" style={{ backgroundColor: fase.cor }} />

      <div className="flex items-center gap-1.5 px-2 pt-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-200 active:cursor-grabbing"
          aria-label="Arrastar fase"
        >
          <GripVertical size={16} />
        </button>

        <FaseHeaderPopover
          fase={fase}
          onSave={(patch) => onUpdateFase(fase.id, patch)}
          onConfigurar={() => setConfigurando(true)}
        />

        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${fase.cor}22`, color: fase.cor }}
        >
          {cards.length}
        </span>

        <button
          onClick={onAddFase}
          className="rounded p-1 text-slate-400 hover:bg-slate-200"
          aria-label="Adicionar fase"
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        ref={setDroppableRef}
        className="flex min-h-[8px] flex-1 flex-col gap-2 overflow-y-auto px-2 py-2"
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardChip
              key={card.id}
              card={card}
              campos={campos}
              etiquetas={etiquetas}
              usuarios={usuarios}
              contagemFilhos={contagemFilhos[card.id] ?? 0}
              ehFilho={cardsFilhos.has(card.id)}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </SortableContext>
      </div>

      {fase.permiteCriarCards && (
        <div className="px-2 pb-2">
          <button
            onClick={() => onCreateCard(fase.id)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Criar novo card
          </button>
        </div>
      )}

      <NovaFaseModal
        open={configurando}
        onOpenChange={setConfigurando}
        mode="editar"
        initial={{ nome: fase.nome, ehFinal: fase.ehFinal, permiteCriarCards: fase.permiteCriarCards }}
        onSubmit={(values) => onUpdateFase(fase.id, values)}
        onDelete={() => onDeleteFase(fase.id)}
      />
    </div>
  );
}
