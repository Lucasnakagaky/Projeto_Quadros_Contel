"use client";

import { AlertTriangle, Boxes, X } from "lucide-react";
import { cn, dataPorExtenso } from "@/lib/utils";
import { ChipOptionsMenu } from "./chip-options-menu";

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
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-white p-3 transition-colors",
        quebrada ? "border-red-200 bg-red-50" : "cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50"
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
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
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
              <span className="flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
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
              style={{ backgroundColor: `${faseCor}1f`, color: faseCor }}
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
