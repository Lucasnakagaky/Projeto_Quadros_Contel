"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Board, Card, Etiqueta, Lista, Usuario } from "@/lib/types";
import { api } from "@/lib/api-client";
import { BoardHeader } from "./board-header";
import { Column } from "./column";
import { CardItem } from "./card-item";
import { AddColumnForm } from "./add-column-form";
import { CardModal } from "./card-modal/card-modal";

type ColumnsMap = Record<string, string[]>;

function buildColumns(listas: Lista[], cards: Card[]): ColumnsMap {
  const map: ColumnsMap = {};
  listas.forEach((l) => {
    map[l.id] = cards
      .filter((c) => c.listId === l.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => c.id);
  });
  return map;
}

export function KanbanBoard({
  boardInicial,
  listasIniciais,
  cardsIniciais,
  etiquetasIniciais,
  membrosIniciais,
  currentUser,
}: {
  boardInicial: Board;
  listasIniciais: Lista[];
  cardsIniciais: Card[];
  etiquetasIniciais: Etiqueta[];
  membrosIniciais: Usuario[];
  currentUser: Usuario;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cardId = searchParams.get("cardId");

  const [board, setBoard] = useState(boardInicial);
  const [listas, setListas] = useState(listasIniciais);
  const [cardsById, setCardsById] = useState<Record<string, Card>>(() =>
    Object.fromEntries(cardsIniciais.map((c) => [c.id, c]))
  );
  const [columns, setColumns] = useState<ColumnsMap>(() =>
    buildColumns(listasIniciais, cardsIniciais)
  );
  const [etiquetas, setEtiquetas] = useState(etiquetasIniciais);
  const [membros, setMembros] = useState(membrosIniciais);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<Lista | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const columnIds = useMemo(() => listas.map((l) => `column-${l.id}`), [listas]);

  function findContainer(id: string): string | undefined {
    if (id in columns) return id;
    return Object.keys(columns).find((key) => columns[key].includes(id));
  }

  function openCard(id: string) {
    router.push(`${pathname}?cardId=${id}`, { scroll: false });
  }

  function closeCard() {
    router.push(pathname, { scroll: false });
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === "column") {
      const listId = String(active.id).replace("column-", "");
      setActiveColumn(listas.find((l) => l.id === listId) ?? null);
    } else if (type === "card") {
      setActiveCard(cardsById[String(active.id)] ?? null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.type !== "card") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setColumns((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const overIndex = overItems.indexOf(overId);

      const newIndex =
        overId in prev ? overItems.length : overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((id) => id !== activeId),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeId,
          ...overItems.slice(newIndex),
        ],
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumn(null);
    if (!over) return;

    if (active.data.current?.type === "column") {
      const activeListId = String(active.id).replace("column-", "");
      const overListId = String(over.id).replace("column-", "");
      if (activeListId === overListId) return;
      const oldIndex = listas.findIndex((l) => l.id === activeListId);
      const newIndex = listas.findIndex((l) => l.id === overListId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(listas, oldIndex, newIndex);
      setListas(reordered);
      try {
        await api.patch(`/api/boards/${board.id}/lists`, {
          orderedIds: reordered.map((l) => l.id),
        });
      } catch {
        toast.error("Erro ao reordenar listas");
      }
      return;
    }

    if (active.data.current?.type === "card") {
      const activeId = String(active.id);
      const overId = String(over.id);
      const container = findContainer(overId) ?? findContainer(activeId);
      if (!container) return;

      const items = columns[container];
      const oldIndex = items.indexOf(activeId);
      const newIndex = overId in columns ? items.length - 1 : items.indexOf(overId);

      let finalItems = items;
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        finalItems = arrayMove(items, oldIndex, newIndex);
        setColumns((prev) => ({ ...prev, [container]: finalItems }));
      }

      const card = cardsById[activeId];
      const movedToOtherList = card && card.listId !== container;
      const finalIndex = finalItems.indexOf(activeId);

      if (movedToOtherList) {
        setCardsById((prev) => ({
          ...prev,
          [activeId]: { ...prev[activeId], listId: container },
        }));
        try {
          await api.post(`/api/cards/${activeId}/move`, {
            listId: container,
            index: finalIndex,
          });
        } catch {
          toast.error("Erro ao mover card");
        }
      } else {
        try {
          await api.post(
            `/api/boards/${board.id}/lists/${container}/cards/reorder`,
            { orderedIds: finalItems }
          );
        } catch {
          toast.error("Erro ao reordenar cards");
        }
      }
    }
  }

  async function handleAddList(nome: string) {
    try {
      const lista = await api.post<Lista>(`/api/boards/${board.id}/lists`, { nome });
      setListas((prev) => [...prev, lista]);
      setColumns((prev) => ({ ...prev, [lista.id]: [] }));
      toast.success("Lista criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar lista");
    }
  }

  async function handleRenameList(listId: string, nome: string) {
    try {
      const lista = await api.patch<Lista>(`/api/boards/${board.id}/lists/${listId}`, {
        nome,
      });
      setListas((prev) => prev.map((l) => (l.id === listId ? lista : l)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renomear lista");
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm("Excluir esta lista e todos os seus cards?")) return;
    try {
      await api.delete(`/api/boards/${board.id}/lists/${listId}`);
      setListas((prev) => prev.filter((l) => l.id !== listId));
      setColumns((prev) => {
        const next = { ...prev };
        delete next[listId];
        return next;
      });
      setCardsById((prev) => {
        const next = { ...prev };
        Object.values(next)
          .filter((c) => c.listId === listId)
          .forEach((c) => delete next[c.id]);
        return next;
      });
      toast.success("Lista excluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir lista");
    }
  }

  async function handleAddCard(listId: string, titulo: string, descricao?: string) {
    try {
      const card = await api.post<Card>(
        `/api/boards/${board.id}/lists/${listId}/cards`,
        { titulo, descricao }
      );
      setCardsById((prev) => ({ ...prev, [card.id]: card }));
      setColumns((prev) => ({ ...prev, [listId]: [...prev[listId], card.id] }));
      toast.success("Card criado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar card");
    }
  }

  function handleCardUpdatedLocally(card: Card) {
    setCardsById((prev) => ({ ...prev, [card.id]: card }));
    setColumns((prev) => {
      if (prev[card.listId]?.includes(card.id)) return prev;
      const next: ColumnsMap = {};
      Object.keys(prev).forEach((listId) => {
        next[listId] = prev[listId].filter((id) => id !== card.id);
      });
      next[card.listId] = [...(next[card.listId] ?? []), card.id];
      return next;
    });
  }

  function handleCardDeletedLocally(id: string) {
    setCardsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setColumns((prev) => {
      const next: ColumnsMap = {};
      Object.keys(prev).forEach((listId) => {
        next[listId] = prev[listId].filter((cardId) => cardId !== id);
      });
      return next;
    });
    closeCard();
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <BoardHeader
        board={board}
        currentUser={currentUser}
        onBoardUpdated={setBoard}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 items-start gap-4 overflow-x-auto px-6 py-4">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {listas.map((lista) => (
              <Column
                key={lista.id}
                lista={lista}
                cards={(columns[lista.id] ?? []).map((id) => cardsById[id])}
                etiquetas={etiquetas}
                membros={membros}
                onOpenCard={openCard}
                onAddCard={handleAddCard}
                onRename={handleRenameList}
                onDelete={handleDeleteList}
              />
            ))}
          </SortableContext>

          <AddColumnForm onAdd={handleAddList} />
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-2 opacity-90">
              <CardItem card={activeCard} onOpen={() => {}} dragOverlay />
            </div>
          ) : null}
          {activeColumn ? (
            <div className="w-72 rotate-1 rounded-lg border border-slate-200 bg-slate-100 p-3 opacity-90">
              <span className="font-semibold text-slate-700">{activeColumn.nome}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {cardId && (
        <CardModal
          cardId={cardId}
          boardId={board.id}
          onClose={closeCard}
          onCardUpdated={handleCardUpdatedLocally}
          onCardDeleted={handleCardDeletedLocally}
          onLabelsChanged={setEtiquetas}
          knownEtiquetas={etiquetas}
          membros={membros}
        />
      )}
    </div>
  );
}

export type { ColumnsMap };
