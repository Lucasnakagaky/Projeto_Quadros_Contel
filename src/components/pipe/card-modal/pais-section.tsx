"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CornerDownRight, Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardLink, Fase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CardLinkResolvida, ConexaoResolvida } from "./types";
import { ParentCardChip } from "./card-conexao-chip";
import { CardLinkPickerModal } from "./card-link-picker-modal";

function CardLinkRow({
  titulo,
  faseNome,
  faseCor,
  quebrada,
  onAbrir,
  onRemover,
}: {
  titulo: string;
  faseNome?: string;
  faseCor?: string;
  quebrada: boolean;
  onAbrir: () => void;
  onRemover: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
        quebrada
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <button
        type="button"
        onClick={onAbrir}
        disabled={quebrada}
        className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
      >
        {quebrada && <AlertTriangle size={13} className="shrink-0 text-red-500" />}
        <span className="truncate text-sm font-medium text-slate-800">{titulo}</span>
        {!quebrada && faseNome && (
          <span
            className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${faseCor}1f`, color: faseCor }}
          >
            {faseNome}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onRemover}
        aria-label={`Remover vínculo com ${titulo}`}
        className="shrink-0 text-slate-400 hover:text-red-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function PaisSection({
  conexoesPais,
  cardLinks,
  cardId,
  pipeId,
  campoId,
  cardinalidade,
  onOpenCard,
  onLinksCriados,
  onLinkRemovido,
}: {
  conexoesPais: ConexaoResolvida[];
  cardLinks: CardLinkResolvida[];
  cardId: string;
  pipeId: string;
  campoId?: string;
  cardinalidade: "unico" | "varios";
  onOpenCard: (cardId: string) => void;
  onLinksCriados: (resolvidas: CardLinkResolvida[]) => void;
  onLinkRemovido: (linkId: string) => void;
}) {
  const [pickerAberto, setPickerAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [cardsPipe, setCardsPipe] = useState<Card[]>([]);
  const [fasesPipe, setFasesPipe] = useState<Fase[]>([]);

  const atingiuLimite = cardinalidade === "unico" && cardLinks.length >= 1;

  async function abrirPicker() {
    if (!campoId) {
      toast.error("Conexão não configurada para este pipe");
      return;
    }
    setPickerAberto(true);
    if (carregado) return;
    setCarregando(true);
    try {
      const [cards, fases] = await Promise.all([
        api.get<Card[]>(`/api/pipes/${pipeId}/cards`),
        api.get<Fase[]>(`/api/pipes/${pipeId}/fases`),
      ]);
      setCardsPipe(cards);
      setFasesPipe(fases);
      setCarregado(true);
    } catch {
      toast.error("Erro ao carregar cards do pipe");
    } finally {
      setCarregando(false);
    }
  }

  const idsVinculados = new Set(cardLinks.map((r) => r.card?.id).filter(Boolean));
  const candidatos = cardsPipe.filter((c) => c.id !== cardId && !idsVinculados.has(c.id));

  async function confirmarVinculo(ids: string[]) {
    if (!campoId) return;
    try {
      const links = await api.post<CardLink[]>(`/api/cards/${cardId}/links`, {
        campoId,
        targetIds: ids,
      });
      const resolvidas: CardLinkResolvida[] = links.map((link) => {
        const alvo = cardsPipe.find((c) => c.id === link.cardDestinoId);
        const fase = alvo ? fasesPipe.find((f) => f.id === alvo.faseId) : undefined;
        return { link, card: alvo, fase, direcao: "origem" };
      });
      onLinksCriados(resolvidas);
      toast.success(resolvidas.length > 1 ? "Cards vinculados com sucesso" : "Card vinculado com sucesso");
      setPickerAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular card");
    }
  }

  async function removerLink(linkId: string) {
    try {
      await api.delete(`/api/cards/${cardId}/links/${linkId}`);
      onLinkRemovido(linkId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover vínculo");
    }
  }

  const semConexoes = conexoesPais.length === 0 && cardLinks.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Roxo (mesma cor do badge "Card Pai" na face do card no Kanban) para diferenciar
          visualmente de Subtarefas, que usa azul — evita confundir os dois conceitos, que têm
          direções/significados diferentes. Cards vinculados (sem hierarquia) entram aqui também,
          numa seção única de conexões. */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-600">
          <CornerDownRight size={13} />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">Este card está conectado a</span>
      </div>

      {semConexoes ? (
        <p className="text-sm text-slate-400">Nenhuma conexão</p>
      ) : (
        <div className="flex flex-col gap-2">
          {conexoesPais.map((r) => {
            const quebrada = !r.card || r.card.excluido;
            return (
              <ParentCardChip
                key={r.conexao.id}
                cardId={r.card?.id ?? r.conexao.cardPaiId}
                titulo={r.card?.titulo ?? "Card removido"}
                pipeNome={r.pipe?.nome ?? "—"}
                criadoEm={r.card?.criadoEm ?? ""}
                faseNome={r.fase?.nome ?? "—"}
                faseCor={r.fase?.cor ?? "#64748b"}
                quebrada={quebrada}
                onAbrirCard={() => r.card && !r.card.excluido && onOpenCard(r.card.id)}
              />
            );
          })}
          {cardLinks.map((r) => (
            <CardLinkRow
              key={r.link.id}
              titulo={r.card?.titulo ?? "Card removido"}
              faseNome={r.fase?.nome}
              faseCor={r.fase?.cor}
              quebrada={!r.card}
              onAbrir={() => r.card && onOpenCard(r.card.id)}
              onRemover={() => removerLink(r.link.id)}
            />
          ))}
        </div>
      )}

      {campoId && !atingiuLimite && (
        <button
          type="button"
          onClick={abrirPicker}
          className="flex w-fit items-center gap-1 self-start text-xs text-blue-600 hover:underline"
        >
          <Plus size={12} />
          Conectar card
        </button>
      )}

      <CardLinkPickerModal
        open={pickerAberto}
        onOpenChange={setPickerAberto}
        titulo="Conectar card"
        candidatos={candidatos}
        fases={fasesPipe}
        cardinalidade={cardinalidade}
        carregando={carregando}
        onConfirmar={confirmarVinculo}
      />
    </div>
  );
}
