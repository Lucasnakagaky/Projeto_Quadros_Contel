"use client";

import { ConexaoResolvida } from "./types";
import { ParentCardChip } from "./card-conexao-chip";

export function PaisSection({
  conexoesPais,
  onOpenCard,
}: {
  conexoesPais: ConexaoResolvida[];
  onOpenCard: (cardId: string) => void;
}) {
  if (conexoesPais.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-800">Este card está conectado a</span>
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
    </div>
  );
}
