"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Fase, Usuario } from "@/lib/types";

export function AtribuirMembrosModal({
  open,
  onOpenChange,
  fase,
  usuarios,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fase: Fase | null;
  usuarios: Usuario[];
  onSalvar: (responsavelIds: string[]) => void;
}) {
  const [selecionados, setSelecionados] = useState<string[]>(fase?.responsavelIds ?? []);

  const [abertoAnterior, setAbertoAnterior] = useState(open);
  if (open !== abertoAnterior) {
    setAbertoAnterior(open);
    if (open) setSelecionados(fase?.responsavelIds ?? []);
  }

  function alternar(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Atribuir membros {fase ? `· ${fase.nome}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1">
            {usuarios.length === 0 && <p className="text-sm text-slate-400">Nenhum usuário</p>}
            {usuarios.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-slate-50"
              >
                <Checkbox checked={selecionados.includes(u.id)} onCheckedChange={() => alternar(u.id)} />
                <Avatar nome={u.nome} cor={u.corAvatar} size={22} />
                <span className="text-sm text-slate-700">{u.nome}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSalvar(selecionados);
                onOpenChange(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
