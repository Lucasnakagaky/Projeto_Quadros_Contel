"use client";

import { ArrowRight } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Fase } from "@/lib/types";

export function BulkMovePopover({
  fases,
  quantidade,
  onMover,
}: {
  fases: Fase[];
  quantidade: number;
  onMover: (faseId: string) => void;
}) {
  return (
    <Popover
      align="end"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          <ArrowRight size={14} />
          Mover cards
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-xs font-semibold text-slate-500">
            Mover {quantidade} {quantidade === 1 ? "card" : "cards"} para fase
          </span>
          {fases.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                onMover(f.id);
                close();
              }}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              <ArrowRight size={14} className="text-slate-400" />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} />
              {f.nome}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
