"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Campo, Etiqueta, Usuario } from "@/lib/types";

const TIPOS_NAO_EDITAVEIS_EM_MASSA = new Set([
  "anexo",
  "documentos",
  "conexao_pipe",
  "conexao_database",
  "id",
]);

export function BulkEditModal({
  open,
  onOpenChange,
  campos,
  etiquetas,
  usuarios,
  quantidade,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  quantidade: number;
  onSalvar: (campoId: string, valor: unknown) => void;
}) {
  const campoEditaveis = campos.filter((c) => !TIPOS_NAO_EDITAVEIS_EM_MASSA.has(c.tipo));
  const [campoId, setCampoId] = useState(campoEditaveis[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [checkboxValor, setCheckboxValor] = useState(false);
  const [multiValor, setMultiValor] = useState<string[]>([]);

  const campo = campos.find((c) => c.id === campoId);

  function resetValores() {
    setTexto("");
    setCheckboxValor(false);
    setMultiValor([]);
  }

  function submit() {
    if (!campo) return;
    let valor: unknown = texto.trim() || null;
    if (campo.tipo === "checkbox") valor = checkboxValor;
    if (campo.tipo === "responsavel" || campo.tipo === "etiquetas" || campo.tipo === "selecao_lista") {
      valor = multiValor;
    }
    if (campo.tipo === "numerico" || campo.tipo === "moeda") {
      valor = texto.trim() ? Number(texto) : null;
    }
    onSalvar(campo.id, valor);
    onOpenChange(false);
    resetValores();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Edição em massa · {quantidade} {quantidade === 1 ? "card" : "cards"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label>Campo</Label>
            <Select
              value={campoId}
              onValueChange={(v) => {
                setCampoId(v);
                resetValores();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um campo" />
              </SelectTrigger>
              <SelectContent>
                {campoEditaveis.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {campo && (
            <div className="flex flex-col gap-1.5">
              <Label>Novo valor</Label>

              {campo.tipo === "checkbox" && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={checkboxValor} onCheckedChange={(v) => setCheckboxValor(Boolean(v))} />
                  {checkboxValor ? "Sim" : "Não"}
                </label>
              )}

              {campo.tipo === "texto_longo" && (
                <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
              )}

              {(campo.tipo === "data" || campo.tipo === "data_vencimento") && (
                <Input type="date" value={texto} onChange={(e) => setTexto(e.target.value)} />
              )}

              {campo.tipo === "data_hora" && (
                <Input type="datetime-local" value={texto} onChange={(e) => setTexto(e.target.value)} />
              )}

              {campo.tipo === "selecao_unica" && (
                <Select value={texto} onValueChange={setTexto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(campo.config.opcoes ?? []).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {campo.tipo === "selecao_lista" && (
                <div className="flex flex-col gap-1">
                  {(campo.config.opcoes ?? []).map((o) => (
                    <label key={o} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={multiValor.includes(o)}
                        onCheckedChange={() =>
                          setMultiValor((prev) =>
                            prev.includes(o) ? prev.filter((v) => v !== o) : [...prev, o]
                          )
                        }
                      />
                      {o}
                    </label>
                  ))}
                </div>
              )}

              {campo.tipo === "responsavel" && (
                <div className="flex flex-col gap-1">
                  {usuarios.map((u) => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={multiValor.includes(u.id)}
                        onCheckedChange={() =>
                          setMultiValor((prev) =>
                            prev.includes(u.id) ? prev.filter((v) => v !== u.id) : [...prev, u.id]
                          )
                        }
                      />
                      {u.nome}
                    </label>
                  ))}
                </div>
              )}

              {campo.tipo === "etiquetas" && (
                <div className="flex flex-col gap-1">
                  {etiquetas.map((e) => (
                    <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={multiValor.includes(e.id)}
                        onCheckedChange={() =>
                          setMultiValor((prev) =>
                            prev.includes(e.id) ? prev.filter((v) => v !== e.id) : [...prev, e.id]
                          )
                        }
                      />
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: e.cor }} />
                      {e.nome}
                    </label>
                  ))}
                </div>
              )}

              {![
                "checkbox",
                "texto_longo",
                "data",
                "data_hora",
                "data_vencimento",
                "selecao_unica",
                "selecao_lista",
                "responsavel",
                "etiquetas",
              ].includes(campo.tipo) && (
                <Input
                  type={campo.tipo === "numerico" || campo.tipo === "moeda" ? "number" : "text"}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!campo}>
              Aplicar a {quantidade} {quantidade === 1 ? "card" : "cards"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
