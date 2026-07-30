"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Campo, Etiqueta, Fase, Usuario } from "@/lib/types";
import { CampoDraftRow } from "./campo-draft-row";

export function ChildCardInlineForm({
  pipeDestinoId,
  pipeDestinoNome,
  fases,
  campos,
  etiquetas,
  usuarios,
  onEtiquetaCriada,
  onCriar,
  onFechar,
}: {
  pipeDestinoId: string;
  pipeDestinoNome: string;
  fases: Fase[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
  onCriar: (titulo: string, faseId: string, valoresCampos: Record<string, unknown>) => Promise<void>;
  onFechar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [faseId, setFaseId] = useState(fases.find((f) => f.permiteCriarCards)?.id ?? fases[0]?.id ?? "");
  const [rascunho, setRascunho] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  const sujo =
    titulo.trim() !== "" ||
    Object.values(rascunho).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""));

  function pedirFechar() {
    if (sujo) setConfirmandoFechar(true);
    else onFechar();
  }

  async function submeter() {
    if (!titulo.trim() || !faseId) return;
    setSalvando(true);
    try {
      await onCriar(titulo, faseId, rascunho);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 rounded-t-lg bg-slate-50 px-3 py-2">
        <Boxes size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">{pipeDestinoNome}</span>
      </div>

      <div className="flex flex-col gap-2 px-3">
        <Input
          autoFocus
          placeholder="Título do card"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="font-medium"
        />

        <Select value={faseId} onValueChange={setFaseId}>
          <SelectTrigger className="h-8 max-w-xs text-sm">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            {fases.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col divide-y divide-slate-100 px-3">
        {campos.map((campo) => (
          <CampoDraftRow
            key={campo.id}
            campo={campo}
            pipeDestinoId={pipeDestinoId}
            valor={rascunho[campo.id]}
            etiquetas={etiquetas}
            usuarios={usuarios}
            onChange={(valor) => setRascunho((prev) => ({ ...prev, [campo.id]: valor }))}
            onEtiquetaCriada={onEtiquetaCriada}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 pb-3">
        <Button onClick={submeter} disabled={salvando || !titulo.trim()} className="rounded-full">
          Criar novo card
        </Button>
        <Button variant="ghost" onClick={pedirFechar}>
          Cancelar
        </Button>
      </div>

      <Dialog open={confirmandoFechar} onOpenChange={setConfirmandoFechar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Deseja fechar o Formulário Inicial?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <p className="text-sm text-slate-600">
              Se você fechar agora, todos os dados preenchidos serão perdidos.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmandoFechar(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmandoFechar(false);
                  onFechar();
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
