"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Link, Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardLink, Fase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CardLinkResolvida } from "./types";
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

export function CardLinksField({
  campoId,
  nomeCampo,
  cardId,
  pipeId,
  cardinalidade,
  relacionadas,
  onLinksCriados,
  onLinkRemovido,
  onOpenCard,
}: {
  campoId: string;
  nomeCampo: string;
  cardId: string;
  pipeId: string;
  cardinalidade: "unico" | "varios";
  relacionadas: CardLinkResolvida[];
  onLinksCriados: (resolvidas: CardLinkResolvida[]) => void;
  onLinkRemovido: (linkId: string) => void;
  onOpenCard: (cardId: string) => void;
}) {
  const [pickerAberto, setPickerAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [cardsPipe, setCardsPipe] = useState<Card[]>([]);
  const [fasesPipe, setFasesPipe] = useState<Fase[]>([]);

  const atingiuLimite = cardinalidade === "unico" && relacionadas.length >= 1;

  async function abrirPicker() {
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

  const idsVinculados = new Set(relacionadas.map((r) => r.card?.id).filter(Boolean));
  const candidatos = cardsPipe.filter((c) => c.id !== cardId && !idsVinculados.has(c.id));

  async function confirmarVinculo(ids: string[]) {
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

  async function remover(linkId: string) {
    try {
      await api.delete(`/api/cards/${cardId}/links/${linkId}`);
      onLinkRemovido(linkId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover vínculo");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <Link size={13} />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{nomeCampo}</span>
      </div>

      {relacionadas.length > 0 && (
        <div className="flex flex-col gap-2">
          {relacionadas.map((r) => (
            <CardLinkRow
              key={r.link.id}
              titulo={r.card?.titulo ?? "Card removido"}
              faseNome={r.fase?.nome}
              faseCor={r.fase?.cor}
              quebrada={!r.card}
              onAbrir={() => r.card && onOpenCard(r.card.id)}
              onRemover={() => remover(r.link.id)}
            />
          ))}
        </div>
      )}

      {!atingiuLimite && (
        <button
          type="button"
          onClick={abrirPicker}
          className="flex items-center gap-1 self-start text-sm text-blue-600 hover:underline"
        >
          <Plus size={14} />
          Vincular card
        </button>
      )}

      <CardLinkPickerModal
        open={pickerAberto}
        onOpenChange={setPickerAberto}
        titulo={`Vincular card — ${nomeCampo}`}
        candidatos={candidatos}
        fases={fasesPipe}
        cardinalidade={cardinalidade}
        carregando={carregando}
        onConfirmar={confirmarVinculo}
      />
    </div>
  );
}
