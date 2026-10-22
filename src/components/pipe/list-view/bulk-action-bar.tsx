"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Campo, Etiqueta, Fase, Usuario } from "@/lib/types";
import { BulkMovePopover } from "./bulk-move-popover";
import { BulkEditModal } from "./bulk-edit-modal";

export function BulkActionBar({
  quantidade,
  fases,
  campos,
  etiquetas,
  usuarios,
  onMover,
  onEditarEmMassa,
  onExcluir,
}: {
  quantidade: number;
  fases: Fase[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  onMover: (faseId: string) => void;
  onEditarEmMassa: (campoId: string, valor: unknown) => void;
  onExcluir: () => void;
}) {
  const [edicaoAberta, setEdicaoAberta] = useState(false);

  if (quantidade === 0) return null;

  const textoLixeira = `Mover ${quantidade} ${quantidade === 1 ? "card" : "cards"} para a lixeira`;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
        <div className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center overflow-x-auto divide-x divide-white/15 rounded-full bg-slate-900/95 px-1 text-white shadow-[0_16px_34px_-12px_rgb(76_81_191/0.6)]">
          <span className="px-4 py-2 text-sm font-medium whitespace-nowrap">
            {quantidade} {quantidade === 1 ? "card selecionado" : "cards selecionados"}
          </span>

          <BulkMovePopover fases={fases} quantidade={quantidade} onMover={onMover} />

          <button
            onClick={() => setEdicaoAberta(true)}
            aria-label="Edição em massa"
            title="Edição em massa"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Pencil size={14} />
            <span className="hidden sm:inline">Edição em massa</span>
          </button>

          <button
            onClick={onExcluir}
            aria-label={textoLixeira}
            title={textoLixeira}
            className="flex items-center gap-1.5 rounded-r-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">{textoLixeira}</span>
          </button>
        </div>
      </div>

      <BulkEditModal
        open={edicaoAberta}
        onOpenChange={setEdicaoAberta}
        campos={campos}
        etiquetas={etiquetas}
        usuarios={usuarios}
        quantidade={quantidade}
        onSalvar={onEditarEmMassa}
      />
    </>
  );
}
