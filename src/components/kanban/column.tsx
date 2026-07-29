"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { Card, Etiqueta, Lista, Usuario } from "@/lib/types";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CardItem } from "./card-item";
import { AddCardForm } from "./add-card-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Column({
  lista,
  cards,
  etiquetas,
  membros,
  onOpenCard,
  onAddCard,
  onRename,
  onDelete,
}: {
  lista: Lista;
  cards: Card[];
  etiquetas: Etiqueta[];
  membros: Usuario[];
  onOpenCard: (id: string) => void;
  onAddCard: (listId: string, titulo: string, descricao?: string) => void;
  onRename: (listId: string, nome: string) => void;
  onDelete: (listId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nome, setNome] = useState(lista.nome);
  const [addingCard, setAddingCard] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `column-${lista.id}`, data: { type: "column" } });

  const { setNodeRef: setDroppableRef } = useDroppable({ id: lista.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function submitRename() {
    setRenaming(false);
    if (nome.trim() && nome.trim() !== lista.nome) {
      onRename(lista.id, nome.trim());
    } else {
      setNome(lista.nome);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg bg-slate-100",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-1.5 px-2 pt-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-200 active:cursor-grabbing"
          aria-label="Arrastar lista"
        >
          <GripVertical size={16} />
        </button>

        {renaming ? (
          <Input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") {
                setNome(lista.nome);
                setRenaming(false);
              }
            }}
            className="h-7 flex-1 px-2 text-sm font-semibold"
          />
        ) : (
          <h3
            className="flex-1 cursor-text truncate text-sm font-semibold text-slate-700"
            onClick={() => setRenaming(true)}
          >
            {lista.nome}
          </h3>
        )}

        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
          {cards.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-200"
              aria-label="Menu da lista"
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAddingCard(true)}>
              Adicionar Card
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 data-[highlighted]:bg-red-50"
              onSelect={() => onDelete(lista.id)}
            >
              Excluir Lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setDroppableRef}
        className="flex min-h-[8px] flex-1 flex-col gap-2 overflow-y-auto px-2 py-2"
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              etiquetas={etiquetas}
              membros={membros}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </SortableContext>
      </div>

      <div className="px-2 pb-2">
        {addingCard ? (
          <AddCardForm
            onSubmit={(titulo, descricao) => {
              onAddCard(lista.id, titulo, descricao);
              setAddingCard(false);
            }}
            onCancel={() => setAddingCard(false)}
          />
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <Plus size={16} />
            Adicionar card
          </button>
        )}
      </div>
    </div>
  );
}
