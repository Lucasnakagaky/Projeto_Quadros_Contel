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
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Campo, Card, Etiqueta, Fase, Pipe, Usuario } from "@/lib/types";
import { api } from "@/lib/api-client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PipeHeader } from "./pipe-header";
import { ViewTabs, VIEWS, ViewValue } from "./view-tabs";
import { FaseColumn } from "./fase-column";
import { CardChip } from "./card-chip";
import { NovaFaseModal, NovaFaseValues } from "./nova-fase-modal";
import { EmBrevePanel } from "./em-breve-panel";
import { FormBuilder } from "./form-builder/form-builder";
import { CardDetailModal } from "./card-modal/card-detail-modal";
import { TableView } from "./list-view/table-view";
import { FlowCanvas } from "./flow-view/flow-canvas";

type ColumnsMap = Record<string, string[]>;

function buildColumns(fases: Fase[], cards: Card[]): ColumnsMap {
  const map: ColumnsMap = {};
  fases.forEach((f) => {
    map[f.id] = cards
      .filter((c) => c.faseId === f.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => c.id);
  });
  return map;
}

export function PipeBoard({
  pipeInicial,
  fasesIniciais,
  cardsIniciais,
  camposIniciais,
  etiquetasIniciais,
  usuariosIniciais,
  contagemFilhosIniciais,
  cardsFilhosIniciais,
}: {
  pipeInicial: Pipe;
  fasesIniciais: Fase[];
  cardsIniciais: Card[];
  camposIniciais: Campo[];
  etiquetasIniciais: Etiqueta[];
  usuariosIniciais: Usuario[];
  contagemFilhosIniciais: Record<string, number>;
  cardsFilhosIniciais: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cardIdParam = searchParams.get("cardId");

  // cardId é estado local (não deriva direto do useSearchParams) para que abrir/trocar de
  // card dentro do modal seja instantâneo, sem depender do ciclo de navegação do Next.js —
  // que, ao trocar o cardId enquanto o modal já está aberto, podia remontar a árvore e
  // causar o efeito de "abre e fecha". A URL continua sincronizada (compartilhamento/voltar).
  const [cardId, setCardId] = useState(cardIdParam);
  const [cardIdParamAnterior, setCardIdParamAnterior] = useState(cardIdParam);
  if (cardIdParam !== cardIdParamAnterior) {
    setCardIdParamAnterior(cardIdParam);
    setCardId(cardIdParam);
  }

  const [pipe] = useState(pipeInicial);
  const [fases, setFases] = useState(fasesIniciais);
  const [cardsById, setCardsById] = useState<Record<string, Card>>(() =>
    Object.fromEntries(cardsIniciais.map((c) => [c.id, c]))
  );
  const [columns, setColumns] = useState<ColumnsMap>(() =>
    buildColumns(fasesIniciais, cardsIniciais)
  );
  const [campos, setCampos] = useState(camposIniciais);
  const [etiquetas, setEtiquetas] = useState(etiquetasIniciais);
  const [usuarios] = useState(usuariosIniciais);
  const [contagemFilhos, setContagemFilhos] = useState<Record<string, number>>(
    () => ({ ...contagemFilhosIniciais })
  );
  const [cardsFilhos, setCardsFilhos] = useState<Set<string>>(() => new Set(cardsFilhosIniciais));
  const [view, setView] = useState<ViewValue>("kanban");
  const [novaFaseAberta, setNovaFaseAberta] = useState(false);
  const [camposAberto, setCamposAberto] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeFase, setActiveFase] = useState<Fase | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const faseIds = useMemo(() => fases.map((f) => `fase-${f.id}`), [fases]);

  function findContainer(id: string): string | undefined {
    if (id in columns) return id;
    return Object.keys(columns).find((key) => columns[key].includes(id));
  }

  function openCard(id: string) {
    setCardId(id);
    router.push(`${pathname}?cardId=${id}`, { scroll: false });
  }

  function closeCard() {
    setCardId(null);
    router.push(pathname, { scroll: false });
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === "fase") {
      const faseId = String(active.id).replace("fase-", "");
      setActiveFase(fases.find((f) => f.id === faseId) ?? null);
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
    setActiveFase(null);
    if (!over) return;

    if (active.data.current?.type === "fase") {
      const activeFaseId = String(active.id).replace("fase-", "");
      const overFaseId = String(over.id).replace("fase-", "");
      if (activeFaseId === overFaseId) return;
      const oldIndex = fases.findIndex((f) => f.id === activeFaseId);
      const newIndex = fases.findIndex((f) => f.id === overFaseId);
      if (oldIndex === -1 || newIndex === -1) return;
      await handleReorderFases(arrayMove(fases, oldIndex, newIndex));
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
      const movedToOtherFase = card && card.faseId !== container;
      const finalIndex = finalItems.indexOf(activeId);

      if (movedToOtherFase) {
        setCardsById((prev) => ({
          ...prev,
          [activeId]: { ...prev[activeId], faseId: container },
        }));
        try {
          await api.post(`/api/cards/${activeId}/mover`, { faseId: container, index: finalIndex });
          const fase = fases.find((f) => f.id === container);
          toast.success(`Card movido com sucesso para ${fase?.nome ?? ""}`);
        } catch {
          toast.error("Erro ao mover card");
        }
      } else {
        try {
          await api.post(`/api/pipes/${pipe.id}/fases/${container}/cards/reorder`, {
            orderedIds: finalItems,
          });
        } catch {
          toast.error("Erro ao reordenar cards");
        }
      }
    }
  }

  async function handleReorderFases(reordered: Fase[]) {
    setFases(reordered);
    try {
      await api.post(`/api/pipes/${pipe.id}/fases/reorder`, {
        orderedIds: reordered.map((f) => f.id),
      });
    } catch {
      toast.error("Erro ao reordenar fases");
    }
  }

  async function handleAddFase(values: NovaFaseValues) {
    try {
      const fase = await api.post<Fase>(`/api/pipes/${pipe.id}/fases`, values);
      setFases((prev) => [...prev, fase]);
      setColumns((prev) => ({ ...prev, [fase.id]: [] }));
      toast.success("Fase criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar fase");
    }
  }

  async function handleUpdateFase(
    faseId: string,
    patch: Partial<
      Pick<Fase, "nome" | "cor" | "ehFinal" | "permiteCriarCards" | "descricao" | "responsavelIds">
    >
  ) {
    try {
      const fase = await api.patch<Fase>(`/api/pipes/${pipe.id}/fases/${faseId}`, patch);
      setFases((prev) => prev.map((f) => (f.id === faseId ? fase : f)));
      toast.success("Configurações atualizadas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar fase");
    }
  }

  async function handleDeleteFase(faseId: string) {
    if (!confirm("Excluir esta fase e todos os seus cards?")) return;
    try {
      await api.delete(`/api/pipes/${pipe.id}/fases/${faseId}`);
      setFases((prev) => prev.filter((f) => f.id !== faseId));
      setColumns((prev) => {
        const next = { ...prev };
        delete next[faseId];
        return next;
      });
      setCardsById((prev) => {
        const next = { ...prev };
        Object.values(next)
          .filter((c) => c.faseId === faseId)
          .forEach((c) => delete next[c.id]);
        return next;
      });
      toast.success("Fase excluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir fase");
    }
  }

  async function handleCreateCard(faseId: string) {
    try {
      const card = await api.post<Card>(`/api/pipes/${pipe.id}/cards`, {
        faseId,
        titulo: "Novo card",
      });
      setCardsById((prev) => ({ ...prev, [card.id]: card }));
      setColumns((prev) => ({ ...prev, [faseId]: [...prev[faseId], card.id] }));
      toast.success("Card criado com sucesso");
      openCard(card.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar card");
    }
  }

  function handleCardUpdatedLocally(card: Card) {
    setCardsById((prev) => ({ ...prev, [card.id]: card }));
    setColumns((prev) => {
      if (prev[card.faseId]?.includes(card.id)) return prev;
      const next: ColumnsMap = {};
      Object.keys(prev).forEach((faseId) => {
        next[faseId] = prev[faseId].filter((id) => id !== card.id);
      });
      next[card.faseId] = [...(next[card.faseId] ?? []), card.id];
      return next;
    });
  }

  async function handleBulkMoverCards(cardIds: string[], faseId: string) {
    const atualizados = await Promise.all(
      cardIds.map((id) => api.post<Card>(`/api/cards/${id}/mover`, { faseId, index: 0 }))
    );
    atualizados.forEach(handleCardUpdatedLocally);
  }

  async function handleBulkExcluirCards(cardIds: string[]) {
    await Promise.all(cardIds.map((id) => api.post(`/api/cards/${id}/lixeira`)));
    cardIds.forEach(handleCardTrashedLocally);
  }

  async function handleBulkEditarCampo(cardIds: string[], campoId: string, valor: unknown) {
    const atualizados = await Promise.all(
      cardIds.map((id) =>
        api.patch<Card>(`/api/cards/${id}`, { valoresCampos: { [campoId]: valor } })
      )
    );
    atualizados.forEach(handleCardUpdatedLocally);
  }

  function handleCardTrashedLocally(id: string) {
    setCardsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setColumns((prev) => {
      const next: ColumnsMap = {};
      Object.keys(prev).forEach((faseId) => {
        next[faseId] = prev[faseId].filter((cardId) => cardId !== id);
      });
      return next;
    });
    closeCard();
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <PipeHeader pipe={pipe} onAbrirCampos={() => setCamposAberto(true)} />

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as ViewValue)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <ViewTabs />

        <TabsContent value="kanban" className="flex flex-1 flex-col overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-1 items-start gap-4 overflow-x-auto px-6 py-4">
              <SortableContext items={faseIds} strategy={horizontalListSortingStrategy}>
                {fases.map((fase) => (
                  <FaseColumn
                    key={fase.id}
                    fase={fase}
                    cards={(columns[fase.id] ?? []).map((id) => cardsById[id])}
                    campos={campos}
                    etiquetas={etiquetas}
                    usuarios={usuarios}
                    contagemFilhos={contagemFilhos}
                    cardsFilhos={cardsFilhos}
                    onOpenCard={openCard}
                    onCreateCard={handleCreateCard}
                    onAddFase={() => setNovaFaseAberta(true)}
                    onUpdateFase={handleUpdateFase}
                    onDeleteFase={handleDeleteFase}
                  />
                ))}
              </SortableContext>

              <button
                onClick={() => setNovaFaseAberta(true)}
                className="flex h-10 w-72 shrink-0 items-center gap-1.5 rounded-lg bg-slate-100/70 px-3 text-sm font-medium text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <Plus size={16} />
                Adicionar Fase
              </button>
            </div>

            <DragOverlay>
              {activeCard ? (
                <div className="w-72 rotate-2 opacity-90">
                  <CardChip card={activeCard} campos={campos} onOpen={() => {}} dragOverlay />
                </div>
              ) : null}
              {activeFase ? (
                <div className="w-72 rotate-1 rounded-lg border border-slate-200 bg-slate-100 p-3 opacity-90">
                  <span className="font-semibold text-slate-700">{activeFase.nome}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="lista" className="flex flex-1 flex-col overflow-hidden">
          <TableView
            pipeId={pipe.id}
            cards={Object.values(cardsById)}
            fases={fases}
            campos={campos}
            etiquetas={etiquetas}
            usuarios={usuarios}
            cardsFilhos={cardsFilhos}
            onOpenCard={openCard}
            onCreateCard={handleCreateCard}
            onMoverCards={handleBulkMoverCards}
            onExcluirCards={handleBulkExcluirCards}
            onEditarEmMassa={handleBulkEditarCampo}
          />
        </TabsContent>

        <TabsContent value="fluxo" className="flex flex-1 flex-col overflow-hidden">
          <FlowCanvas
            fases={fases}
            campos={campos}
            usuarios={usuarios}
            onReorderFases={handleReorderFases}
            onUpdateFase={handleUpdateFase}
            onAbrirCampos={() => setCamposAberto(true)}
          />
        </TabsContent>

        {VIEWS.filter((v) => v.value !== "kanban" && v.value !== "lista" && v.value !== "fluxo").map((v) => (
          <TabsContent key={v.value} value={v.value} className="flex flex-1 flex-col">
            <EmBrevePanel titulo={v.label} />
          </TabsContent>
        ))}
      </Tabs>

      <NovaFaseModal
        open={novaFaseAberta}
        onOpenChange={setNovaFaseAberta}
        mode="criar"
        onSubmit={handleAddFase}
      />

      <Dialog open={camposAberto} onOpenChange={setCamposAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Campos do formulário</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
            <FormBuilder pipeId={pipe.id} campos={campos} onCamposChanged={setCampos} />
          </div>
        </DialogContent>
      </Dialog>

      {cardId && (
        <CardDetailModal
          cardId={cardId}
          onClose={closeCard}
          onCardUpdated={handleCardUpdatedLocally}
          onCardTrashed={handleCardTrashedLocally}
          onEtiquetasChanged={setEtiquetas}
          onConexaoCriada={(cardPaiId, cardFilhoId) => {
            setContagemFilhos((prev) => ({ ...prev, [cardPaiId]: (prev[cardPaiId] ?? 0) + 1 }));
            setCardsFilhos((prev) => new Set(prev).add(cardFilhoId));
          }}
          onNavigateToCard={openCard}
        />
      )}
    </div>
  );
}
