"use client";

import { AlertTriangle } from "lucide-react";
import { tempoRelativo } from "@/lib/utils";
import { ConexaoResolvida } from "./types";

export function PaisSection({
  conexoesPais,
  onOpenCard,
}: {
  conexoesPais: ConexaoResolvida[];
  onOpenCard: (cardId: string) => void;
}) {
  if (conexoesPais.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      <span className="text-sm font-semibold text-slate-700">Este card está conectado a</span>
      <div className="flex flex-col gap-2">
        {conexoesPais.map((r) => {
          const quebrada = !r.card || r.card.excluido;
          return (
            <button
              key={r.conexao.id}
              onClick={() => r.card && !r.card.excluido && onOpenCard(r.card.id)}
              disabled={quebrada}
              className={`flex flex-col gap-1 rounded-md border px-3 py-2 text-left ${
                quebrada
                  ? "cursor-not-allowed border-red-200 bg-red-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {quebrada && <AlertTriangle size={14} className="text-red-500" />}
                <span className="truncate text-sm font-medium text-slate-800">
                  {r.card?.titulo ?? "Card removido"}
                </span>
              </div>
              {quebrada ? (
                <span className="text-[11px] text-red-500">
                  Conexão quebrada — card pai indisponível (movido para a lixeira ou excluído)
                </span>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                  <span>Pipe: {r.pipe?.nome ?? "—"}</span>
                  <span>Criado {tempoRelativo(r.card?.criadoEm)}</span>
                  {r.fase && (
                    <span
                      className="rounded-full px-1.5 py-0.5 font-medium"
                      style={{ backgroundColor: `${r.fase.cor}22`, color: r.fase.cor }}
                    >
                      {r.fase.nome}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
