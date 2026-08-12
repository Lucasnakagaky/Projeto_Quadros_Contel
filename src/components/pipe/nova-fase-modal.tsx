"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface NovaFaseValues {
  nome: string;
  ehFinal: boolean;
  permiteCriarCards: boolean;
}

export function NovaFaseModal({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "criar" | "editar";
  initial?: NovaFaseValues;
  onSubmit: (values: NovaFaseValues) => void;
  onDelete?: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [ehFinal, setEhFinal] = useState(initial?.ehFinal ?? false);
  const [permiteCriarCards, setPermiteCriarCards] = useState(initial?.permiteCriarCards ?? true);

  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) {
      setNome(initial?.nome ?? "");
      setEhFinal(initial?.ehFinal ?? false);
      setPermiteCriarCards(initial?.permiteCriarCards ?? true);
    }
  }

  function submit() {
    if (!nome.trim()) return;
    onSubmit({ nome: nome.trim(), ehFinal, permiteCriarCards });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {mode === "criar" ? "Nova fase" : "Configurar fase"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-fase">Nome da fase</Label>
            <Input
              id="nome-fase"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={ehFinal} onCheckedChange={(v) => setEhFinal(Boolean(v))} />
            Definir como fase final de processo
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <Checkbox
              checked={permiteCriarCards}
              onCheckedChange={(v) => setPermiteCriarCards(Boolean(v))}
            />
            Permitir criar cards nesta fase
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            {mode === "editar" && onDelete ? (
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                <Trash2 size={14} />
                Excluir fase
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={submit}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
