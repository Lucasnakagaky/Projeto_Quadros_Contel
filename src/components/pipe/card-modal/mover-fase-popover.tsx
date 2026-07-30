"use client";

import { ArrowRight } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Fase } from "@/lib/types";

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

  return (
    <Popover
      align="end"
      trigger={({ toggle }) => (
        <Button onClick={toggle} className="w-full rounded-full">
          Mover para fase
        </Button>
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
              className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
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
