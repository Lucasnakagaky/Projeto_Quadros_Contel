"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Campo, Card, Etiqueta, Fase, Usuario } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { COLUNAS, ColunaCtx, ColunaId } from "./colunas";
import { ColumnHeader } from "./column-header";
import { ColumnVisibilityPopover } from "./column-visibility-popover";
import { TableRow } from "./table-row";
import { BulkActionBar } from "./bulk-action-bar";

const TODAS_AS_COLUNAS: ColunaId[] = COLUNAS.map((c) => c.id);

function carregarColunasVisiveis(pipeId: string): ColunaId[] {
  if (typeof window === "undefined") return TODAS_AS_COLUNAS;
  try {
    const raw = window.localStorage.getItem(`pipe-lista-colunas-${pipeId}`);
    if (!raw) return TODAS_AS_COLUNAS;
    const salvas = JSON.parse(raw) as ColunaId[];
    return TODAS_AS_COLUNAS.filter((id) => salvas.includes(id));
  } catch {
    return TODAS_AS_COLUNAS;
  }
}

export function TableView({
  pipeId,
  cards,
  fases,
  campos,
  etiquetas,
  usuarios,
  cardsFilhos,
  onOpenCard,
  onCreateCard,
  onMoverCards,
  onExcluirCards,
  onEditarEmMassa,
}: {
  pipeId: string;
  cards: Card[];
  fases: Fase[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  cardsFilhos: Set<string>;
  onOpenCard: (cardId: string) => void;
  onCreateCard: (faseId: string) => void;
  onMoverCards: (cardIds: string[], faseId: string) => Promise<void>;
  onExcluirCards: (cardIds: string[]) => Promise<void>;
  onEditarEmMassa: (cardIds: string[], campoId: string, valor: unknown) => Promise<void>;
}) {
  const [sortColuna, setSortColuna] = useState<ColunaId | null>(null);
  const [sortDirecao, setSortDirecao] = useState<"asc" | "desc">("asc");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [colunasVisiveis, setColunasVisiveis] = useState<ColunaId[]>(() =>
    carregarColunasVisiveis(pipeId)
  );

  const cardsOrdenados = useMemo(() => {
    if (!sortColuna) return cards;
    const coluna = COLUNAS.find((c) => c.id === sortColuna);
    if (!coluna) return cards;
    const ctx: ColunaCtx = { fases, campos, etiquetas, usuarios };
    const copia = [...cards];
    copia.sort((a, b) => {
      const va = coluna.sortValue(a, ctx);
      const vb = coluna.sortValue(b, ctx);
      if (va < vb) return sortDirecao === "asc" ? -1 : 1;
      if (va > vb) return sortDirecao === "asc" ? 1 : -1;
      return 0;
    });
    return copia;
  }, [cards, sortColuna, sortDirecao, fases, campos, etiquetas, usuarios]);

  const colunasDefs = COLUNAS.filter((c) => colunasVisiveis.includes(c.id));
  const faseDestino = fases.find((f) => f.permiteCriarCards) ?? fases[0];

  function handleSort(id: ColunaId) {
    if (sortColuna === id) {
      setSortDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColuna(id);
      setSortDirecao("asc");
    }
  }

  function toggleColuna(id: ColunaId) {
    setColunasVisiveis((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      const ordenada = TODAS_AS_COLUNAS.filter((c) => next.includes(c));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`pipe-lista-colunas-${pipeId}`, JSON.stringify(ordenada));
      }
      return ordenada;
    });
  }

  function toggleCard(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSelecionados((prev) =>
      prev.size === cardsOrdenados.length ? new Set() : new Set(cardsOrdenados.map((c) => c.id))
    );
  }

  async function handleMover(faseId: string) {
    const ids = Array.from(selecionados);
    try {
      await onMoverCards(ids, faseId);
      const fase = fases.find((f) => f.id === faseId);
      toast.success(`${ids.length} card(s) movido(s) com sucesso para ${fase?.nome ?? ""}`);
    } catch {
      toast.error("Erro ao mover cards");
    } finally {
      setSelecionados(new Set());
    }
  }

  async function handleExcluir() {
    const ids = Array.from(selecionados);
    if (!confirm(`Mover ${ids.length} card(s) para a lixeira?`)) return;
    try {
      await onExcluirCards(ids);
      toast.success(`${ids.length} card(s) movido(s) para a lixeira`);
    } catch {
      toast.error("Erro ao mover cards para a lixeira");
    } finally {
      setSelecionados(new Set());
    }
  }

  async function handleEditarEmMassa(campoId: string, valor: unknown) {
    const ids = Array.from(selecionados);
    try {
      await onEditarEmMassa(ids, campoId, valor);
      toast.success("Configurações atualizadas");
    } catch {
      toast.error("Erro na edição em massa");
    } finally {
      setSelecionados(new Set());
    }
  }

  const estadoSelecaoTodos: boolean | "indeterminate" =
    selecionados.size === 0
      ? false
      : selecionados.size === cardsOrdenados.length
        ? true
        : "indeterminate";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-sm text-slate-500">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
        <ColumnVisibilityPopover colunasVisiveis={colunasVisiveis} onToggle={toggleColuna} />
      </div>

      <div className="flex-1 overflow-auto px-6 pb-4">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 text-center text-slate-500">
            Nenhum card neste pipe ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1200px] border-collapse bg-white">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox checked={estadoSelecaoTodos} onCheckedChange={toggleTodos} />
                  </th>
                  {colunasDefs.map((coluna) => (
                    <ColumnHeader
                      key={coluna.id}
                      label={coluna.label}
                      icon={coluna.icon}
                      ativo={sortColuna === coluna.id}
                      direcao={sortDirecao}
                      onClick={() => handleSort(coluna.id)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {cardsOrdenados.map((card) => (
                  <TableRow
                    key={card.id}
                    card={card}
                    colunasVisiveis={colunasVisiveis}
                    fases={fases}
                    campos={campos}
                    etiquetas={etiquetas}
                    usuarios={usuarios}
                    ehFilho={cardsFilhos.has(card.id)}
                    selecionado={selecionados.has(card.id)}
                    onToggleSelecao={() => toggleCard(card.id)}
                    onAbrir={() => onOpenCard(card.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {faseDestino && (
        <div className="px-6 pb-6">
          <button
            onClick={() => onCreateCard(faseDestino.id)}
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Criar novo card
          </button>
        </div>
      )}

      <BulkActionBar
        quantidade={selecionados.size}
        fases={fases}
        campos={campos}
        etiquetas={etiquetas}
        usuarios={usuarios}
        onMover={handleMover}
        onEditarEmMassa={handleEditarEmMassa}
        onExcluir={handleExcluir}
      />
    </div>
  );
}
