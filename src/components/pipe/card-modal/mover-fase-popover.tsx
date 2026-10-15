"use client";

import { ArrowRight } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Fase } from "@/lib/types";
import { FOCO } from "./estilos";

export function MoverFasePopover({
  fases,
  faseAtualId,
  onMover,
}: {
  fases: Fase[];
  faseAtualId: string;
  onMover: (faseId: string) => void;
}) {
  const destinos = fases.filter((f) => f.id !== faseAtualId);
  const faseAtual = fases.find((f) => f.id === faseAtualId);

  return (
    <Popover
      align="end"
      className="rounded-xl border-white/80 bg-white/95 shadow-(--gdt-sombra-3)"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={`flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/90 bg-white/90 px-3 text-left shadow-(--gdt-sombra-1) transition-[border-color,background-color,box-shadow] duration-(--duracao-rapida) hover:border-indigo-200 hover:bg-white hover:shadow-(--gdt-sombra-2) ${FOCO}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {faseAtual && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: faseAtual.cor, boxShadow: `0 0 6px ${faseAtual.cor}` }}
              />
            )}
            <span className="truncate text-sm font-semibold text-slate-800">
              {faseAtual?.nome ?? "Mover para fase"}
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-slate-400" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-xs font-semibold text-slate-500">Mover card para fase</span>
          {destinos.length === 0 && (
            <p className="px-1 text-sm text-slate-400">Nenhuma outra fase disponível</p>
          )}
          {destinos.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                onMover(f.id);
                close();
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors duration-(--duracao-rapida) hover:bg-indigo-50 hover:text-indigo-700 ${FOCO}`}
            >
              <ArrowRight size={14} className="text-slate-400" />
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: f.cor }}
              />
              {f.nome}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
