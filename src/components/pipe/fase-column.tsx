"use client";

import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Inbox, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react";
import { Campo, Card, CardRelacionado, Etiqueta, Fase, Usuario } from "@/lib/types";
import { CardChip } from "./card-chip";
import { FaseHeaderPopover } from "./fase-header-popover";
import { NovaFaseModal, NovaFaseValues } from "./nova-fase-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1";

export function FaseColumn({
  fase,
  cards,
  campos,
  etiquetas,
  usuarios,
  filhosPorCard,
  paisPorCard,
  isDropTarget = false,
  onOpenCard,
  onCreateCard,
  onUpdateFase,
  onDeleteFase,
}: {
  fase: Fase;
  cards: Card[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  filhosPorCard: Record<string, CardRelacionado[]>;
  paisPorCard: Record<string, CardRelacionado[]>;
  isDropTarget?: boolean;
  onOpenCard: (id: string) => void;
  onCreateCard: (faseId: string) => void;
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
      className={cn("flex w-[280px] shrink-0 flex-col", isDragging && "opacity-50")}
    >
      <div className="h-1.5 shrink-0" style={{ backgroundColor: fase.cor }} />

      <div className="group flex h-10 shrink-0 items-center gap-1 border-y border-[rgb(220,223,229)] bg-white px-2">
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing",
            FOCUS_RING
          )}
          aria-label="Arrastar fase"
        >
          <GripVertical size={16} />
        </button>

        <FaseHeaderPopover
          fase={fase}
          onSave={(patch) => onUpdateFase(fase.id, patch)}
          onConfigurar={() => setConfigurando(true)}
        />

        <span className="ml-auto rounded bg-[rgb(237,239,243)] px-1 py-0.5 text-xs font-normal text-[rgb(16,24,32)]">
          {cards.length}
        </span>

        <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[rgb(75,88,99)] hover:bg-slate-100",
                  FOCUS_RING
                )}
                aria-label={`Mais opções da fase ${fase.nome}`}
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setConfigurando(true)}>
                <Settings2 size={14} />
                Configurar fase
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDeleteFase(fase.id)}
                className="text-red-600 data-[highlighted]:bg-red-50"
              >
                <Trash2 size={14} />
                Excluir fase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {fase.permiteCriarCards && (
            <button
              onClick={() => onCreateCard(fase.id)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[rgb(75,88,99)] hover:bg-slate-100",
                FOCUS_RING
              )}
              aria-label={`Criar novo card na fase ${fase.nome}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-b border border-t-0 border-[rgb(220,223,229)] bg-[rgb(242,242,242)] transition-colors",
          isDropTarget && "bg-blue-50 ring-2 ring-inset ring-blue-300"
        )}
      >
        <div
          ref={setDroppableRef}
          className="flex min-h-[8px] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2 pt-3"
        >
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <CardChip
                key={card.id}
                card={card}
                campos={campos}
                etiquetas={etiquetas}
                usuarios={usuarios}
                filhos={filhosPorCard[card.id] ?? []}
                pai={(paisPorCard[card.id] ?? [])[0]}
                onOpen={() => onOpenCard(card.id)}
                onOpenCard={onOpenCard}
              />
            ))}
          </SortableContext>

          {cards.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
              <Inbox size={20} className="text-slate-300" />
              <p className="text-[13px] text-slate-500">
                {fase.descricao || "Nenhum card nesta fase."}
              </p>
            </div>
          )}
        </div>

        {fase.permiteCriarCards && (
          <div className="px-3 pb-3">
            <button
              onClick={() => onCreateCard(fase.id)}
              className={cn(
                "flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[rgb(0,94,252)] px-4 text-sm font-medium text-white transition-colors hover:bg-[rgb(0,84,227)]",
                FOCUS_RING
              )}
            >
              <Plus size={16} />
              Criar novo card
            </button>
          </div>
        )}
      </div>

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
