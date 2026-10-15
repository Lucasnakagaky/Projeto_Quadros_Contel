"use client";

import { AlertTriangle, Boxes, X } from "lucide-react";
import { cn, dataPorExtenso } from "@/lib/utils";
import { ChipOptionsMenu } from "./chip-options-menu";
import { CARD_SOLIDO, CARD_SOLIDO_HOVER, ICONE_REMOVER } from "./estilos";

export interface CardConexaoChipProps {
  cardId: string;
  titulo: string;
  pipeNome: string;
  criadoEm: string;
  faseNome: string;
  faseCor: string;
  quebrada?: boolean;
  onAbrirCard: () => void;
  onRemover?: () => void;
}

function CardConexaoChip({
  titulo,
  pipeNome,
  criadoEm,
  faseNome,
  faseCor,
  quebrada = false,
  onAbrirCard,
  onRemover,
}: CardConexaoChipProps) {
  return (
    <div
      onClick={() => !quebrada && onAbrirCard()}
      // --fase: hover com a borda tingida pela fase do card ligado (linguagem dos cards do Kanban)
      style={{ "--fase": faseCor } as React.CSSProperties}
      className={cn(
        "flex flex-col gap-2 p-3",
        quebrada
          ? "rounded-xl border border-red-200 bg-red-50/80"
          : `cursor-pointer ${CARD_SOLIDO} ${CARD_SOLIDO_HOVER}`
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-800">
          {quebrada && <AlertTriangle size={14} className="shrink-0 text-red-500" />}
          {titulo}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {onRemover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemover();
              }}
              className={`p-1 ${ICONE_REMOVER}`}
              aria-label="Remover conexão"
            >
              <X size={14} />
            </button>
          )}
          <ChipOptionsMenu onAbrirCard={onAbrirCard} />
        </div>
      </div>

      {quebrada ? (
        <span className="text-xs text-red-500">
          Conexão quebrada — card indisponível (movido para a lixeira ou excluído)
        </span>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-400">Pipe</span>
              <span className="flex w-fit items-center gap-1 rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                <Boxes size={11} />
                {pipeNome}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-400">Criado em</span>
              <span className="text-xs text-slate-700">{dataPorExtenso(criadoEm)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-slate-400">Fase</span>
            <span
              className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `color-mix(in srgb, ${faseCor} 14%, white)`, color: `color-mix(in srgb, ${faseCor} 66%, #0f172a)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${faseCor} 24%, transparent)` }}
            >
              {faseNome}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function ChildCardChip(props: CardConexaoChipProps) {
  return <CardConexaoChip {...props} />;
}

export function ParentCardChip(props: CardConexaoChipProps) {
  return <CardConexaoChip {...props} />;
}
