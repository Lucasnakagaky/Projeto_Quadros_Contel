"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoIcon } from "./campo-icon";
import { api } from "@/lib/api-client";
import { Campo, CORES_ETIQUETA, Etiqueta, Usuario } from "@/lib/types";
import { stringArray } from "@/lib/campo-utils";
import { cn } from "@/lib/utils";

const TIPOS_INERTES = new Set(["id", "anexo", "documentos", "conexao_pipe", "conexao_database"]);

export function CampoDraftRow({
  campo,
  pipeDestinoId,
  valor,
  etiquetas,
  usuarios,
  onChange,
  onEtiquetaCriada,
}: {
  campo: Campo;
  pipeDestinoId: string;
  valor: unknown;
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  onChange: (valor: unknown) => void;
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
}) {
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [nomeEtiqueta, setNomeEtiqueta] = useState("");
  const [corEtiqueta, setCorEtiqueta] = useState(CORES_ETIQUETA[0]);

  async function criarEtiqueta() {
    if (!nomeEtiqueta.trim()) return;
    try {
      const etiqueta = await api.post<Etiqueta>(`/api/pipes/${pipeDestinoId}/etiquetas`, {
        nome: nomeEtiqueta.trim(),
        cor: corEtiqueta,
      });
      onEtiquetaCriada(etiqueta);
      onChange([...stringArray(valor), etiqueta.id]);
      setNomeEtiqueta("");
      setCriandoEtiqueta(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etiqueta");
    }
  }

  const linha = (conteudo: React.ReactNode) => (
    <div className="flex items-start gap-2 py-1.5">
      <div className="mt-1.5">
        <CampoIcon tipo={campo.tipo} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-medium text-slate-500">{campo.titulo}</span>
        {conteudo}
      </div>
    </div>
  );

  if (TIPOS_INERTES.has(campo.tipo)) {
    return linha(
      <span className="text-sm italic text-slate-400">Disponível após criar o card</span>
    );
  }

  if (campo.tipo === "checkbox") {
    return linha(
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox checked={Boolean(valor)} onCheckedChange={(v) => onChange(Boolean(v))} />
        <span className="text-sm text-slate-700">{valor ? "Sim" : "Não"}</span>
      </label>
    );
  }

  if (campo.tipo === "responsavel") {
    const ids = stringArray(valor);
    return linha(
      <div className="flex flex-col gap-1">
        {usuarios.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={ids.includes(u.id)}
              onCheckedChange={() =>
                onChange(ids.includes(u.id) ? ids.filter((id) => id !== u.id) : [...ids, u.id])
              }
            />
            <span className="text-sm text-slate-700">{u.nome}</span>
          </label>
        ))}
      </div>
    );
  }

  if (campo.tipo === "etiquetas") {
    const ids = stringArray(valor);
    return linha(
      <div className="flex flex-col gap-1">
        {etiquetas.map((e) => (
          <label key={e.id} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={ids.includes(e.id)}
              onCheckedChange={() =>
                onChange(ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id])
              }
            />
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: e.cor }} />
            <span className="text-sm text-slate-700">{e.nome}</span>
          </label>
        ))}

        {criandoEtiqueta ? (
          <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
            <Input
              autoFocus
              placeholder="Nome da etiqueta"
              value={nomeEtiqueta}
              onChange={(e) => setNomeEtiqueta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarEtiqueta()}
            />
            <div className="flex flex-wrap gap-1.5">
              {CORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCorEtiqueta(c)}
                  className={cn("h-6 w-6 rounded-full", corEtiqueta === c && "ring-2 ring-slate-900 ring-offset-1")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={criarEtiqueta}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCriandoEtiqueta(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCriandoEtiqueta(true)} className="self-start text-xs text-blue-600 hover:underline">
            + Criar nova etiqueta
          </button>
        )}
      </div>
    );
  }

  if (campo.tipo === "selecao_lista") {
    const opcoes = campo.config.opcoes ?? [];
    const selecionadas = stringArray(valor);
    return linha(
      <div className="flex flex-col gap-1">
        {opcoes.length === 0 && <p className="text-sm text-slate-400">Nenhuma opção configurada</p>}
        {opcoes.map((opcao) => (
          <label key={opcao} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={selecionadas.includes(opcao)}
              onCheckedChange={() =>
                onChange(
                  selecionadas.includes(opcao)
                    ? selecionadas.filter((o) => o !== opcao)
                    : [...selecionadas, opcao]
                )
              }
            />
            <span className="text-sm text-slate-700">{opcao}</span>
          </label>
        ))}
      </div>
    );
  }

  if (campo.tipo === "selecao_unica") {
    const opcoes = campo.config.opcoes ?? [];
    return linha(
      <Select value={typeof valor === "string" ? valor : undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 max-w-xs text-sm">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {opcao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (campo.tipo === "data" || campo.tipo === "data_hora" || campo.tipo === "data_vencimento") {
    return linha(
      <Input
        type={campo.tipo === "data_hora" ? "datetime-local" : "date"}
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 w-auto text-sm"
      />
    );
  }

  if (campo.tipo === "texto_longo") {
    return linha(
      <Textarea
        rows={2}
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return linha(
    <Input
      type={campo.tipo === "numerico" || campo.tipo === "moeda" ? "number" : "text"}
      value={typeof valor === "string" ? valor : ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-sm"
    />
  );
}
