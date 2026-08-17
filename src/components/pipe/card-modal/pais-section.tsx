"use client";

import { CornerDownRight, Plus } from "lucide-react";
import { ConexaoResolvida } from "./types";
import { ParentCardChip } from "./card-conexao-chip";

export function PaisSection({
  conexoesPais,
  onOpenCard,
}: {
  conexoesPais: ConexaoResolvida[];
  onOpenCard: (cardId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Roxo (mesma cor do badge "Card Pai" na face do card no Kanban) para diferenciar
          visualmente de Subtarefas e Cards Vinculados, que usam azul — evita confundir os
          três conceitos, que têm direções/significados diferentes. */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-600">
          <CornerDownRight size={13} />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">Este card está conectado a</span>
      </div>

      {conexoesPais.length > 0 ? (
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
        </div>
      ) : (
        <p className="text-sm text-slate-400">Nenhuma conexão</p>
      )}

      {/* Ação contextual apenas visual: não existe hoje nenhum fluxo para conectar este
          card como filho de outro (a criação de conexão só existe no sentido inverso, em
          "Subtarefas"/ChildCardsField) — mantém o elemento sem simular uma funcionalidade
          que ainda não existe, seguindo o mesmo padrão "em breve" já usado no card. */}
      <button
        type="button"
        disabled
        title="Conectar pipe — em breve"
        className="flex w-fit cursor-not-allowed items-center gap-1 text-xs text-slate-400"
      >
        <Plus size={12} />
        Conectar pipe
      </button>
    </div>
  );
}
