"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ExcluirPipeModal({
  open,
  onOpenChange,
  pipeNome,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeNome: string;
  onConfirm: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);

  async function handleConfirm() {
    setEnviando(true);
    await onConfirm();
    setEnviando(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !enviando && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Excluir Pipe?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <DialogDescription className="text-sm text-slate-600">
            Tem certeza de que deseja excluir{" "}
            <span className="font-semibold text-slate-900">&quot;{pipeNome}&quot;</span>? Esta
            ação pode afetar os dados relacionados a este Pipe e não pode ser desfeita.
          </DialogDescription>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={enviando}>
              {enviando ? "Excluindo..." : "Excluir Pipe"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
