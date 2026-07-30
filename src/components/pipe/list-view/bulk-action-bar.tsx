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

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
        <div className="pointer-events-auto flex items-center divide-x divide-white/15 rounded-full bg-slate-900 px-1 text-white shadow-xl">
          <span className="px-4 py-2 text-sm font-medium whitespace-nowrap">
            {quantidade} {quantidade === 1 ? "card selecionado" : "cards selecionados"}
          </span>

          <BulkMovePopover fases={fases} quantidade={quantidade} onMover={onMover} />

          <button
            onClick={() => setEdicaoAberta(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium hover:bg-white/10"
          >
            <Pencil size={14} />
            Edição em massa
          </button>

          <button
            onClick={onExcluir}
            className="flex items-center gap-1.5 rounded-r-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-white/10"
          >
            <Trash2 size={14} />
            Mover {quantidade} {quantidade === 1 ? "card" : "cards"} para a lixeira
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
