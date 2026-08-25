"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pipe } from "@/lib/types";

export function EditarPipeModal({
  open,
  onOpenChange,
  pipe,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipe: Pipe | null;
  onSubmit: (values: { nome: string }) => void;
}) {
  const [nome, setNome] = useState(pipe?.nome ?? "");

  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) setNome(pipe?.nome ?? "");
  }

  function submit() {
    if (!nome.trim()) return;
    onSubmit({ nome: nome.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Editar Pipe</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-pipe-editar">Nome</Label>
            <Input
              id="nome-pipe-editar"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
