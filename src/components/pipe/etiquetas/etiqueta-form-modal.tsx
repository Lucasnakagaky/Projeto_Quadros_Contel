"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CORES_ETIQUETA, Etiqueta } from "@/lib/types";
import { cn } from "@/lib/utils";

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;

/**
 * Modal de criar/editar uma etiqueta (nome + cor), reaproveitado tanto pelo popover de
 * toggle rápido (EtiquetasPopover) quanto pela tela de administração (EtiquetasManagerModal).
 * Nunca chama a API diretamente — quem monta decide se é POST (criar) ou PATCH (editar) no
 * próprio onSalvar, o mesmo contrato do CampoConfigModal (form-builder).
 */
export function EtiquetaFormModal({
  open,
  onOpenChange,
  etiqueta,
  nomeInicial,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = criar; preenchida = editar (modal pré-preenchido com nome/cor atuais) */
  etiqueta?: Etiqueta;
  /** só é lido em modo criação — usado pra pré-preencher o nome com o texto buscado quando a busca não encontra nenhuma etiqueta */
  nomeInicial?: string;
  onSalvar: (nome: string, cor: string) => void;
}) {
  const [nome, setNome] = useState(etiqueta?.nome ?? nomeInicial ?? "");
  const [cor, setCor] = useState(etiqueta?.cor ?? CORES_ETIQUETA[0]);

  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) {
      setNome(etiqueta?.nome ?? nomeInicial ?? "");
      setCor(etiqueta?.cor ?? CORES_ETIQUETA[0]);
    }
  }

  function submit() {
    if (!nome.trim()) return;
    if (!HEX_VALIDO.test(cor.trim())) {
      toast.error("Cor inválida — use um hexadecimal, ex.: #22c55e");
      return;
    }
    onSalvar(nome.trim(), cor.trim().toLowerCase());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {etiqueta ? "Editar etiqueta" : "Nova etiqueta"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-etiqueta">Nome da etiqueta</Label>
            <Input
              id="nome-etiqueta"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cor-etiqueta">Cor</Label>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded-md border border-slate-200"
                style={{ backgroundColor: cor }}
                aria-hidden="true"
              />
              <Input
                id="cor-etiqueta"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="#22c55e"
                className="font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  aria-label={`Usar cor ${c}`}
                  className={cn(
                    "h-6 w-6 rounded-full",
                    cor.toLowerCase() === c && "ring-2 ring-slate-900 ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
