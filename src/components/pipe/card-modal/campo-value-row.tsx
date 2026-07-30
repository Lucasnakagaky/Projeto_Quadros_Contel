"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
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
import { cn, iniciais } from "@/lib/utils";

type Anexo = { nome: string; url: string };

const TIPOS_TEXTO = new Set(["texto_curto", "conteudo_dinamico", "email", "telefone", "numerico", "moeda", "tempo"]);

export function CampoValueRow({
  campo,
  cardId,
  pipeId,
  valor,
  etiquetas,
  usuarios,
  onSave,
  onEtiquetaCriada,
}: {
  campo: Campo;
  cardId: string;
  pipeId: string;
  valor: unknown;
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  onSave: (valor: unknown) => void;
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rascunho, setRascunho] = useState<string>(typeof valor === "string" ? valor : "");
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [nomeEtiqueta, setNomeEtiqueta] = useState("");
  const [corEtiqueta, setCorEtiqueta] = useState(CORES_ETIQUETA[0]);
  const [enviando, setEnviando] = useState(false);

  function iniciarEdicao() {
    setRascunho(typeof valor === "string" ? valor : "");
    setEditing(true);
  }

  function salvar() {
    onSave(rascunho.trim() || null);
    setEditing(false);
  }

  function cancelar() {
    setEditing(false);
  }

  const vazio = valor === undefined || valor === null || valor === "";

  async function criarEtiqueta() {
    if (!nomeEtiqueta.trim()) return;
    try {
      const etiqueta = await api.post<Etiqueta>(`/api/pipes/${pipeId}/etiquetas`, {
        nome: nomeEtiqueta.trim(),
        cor: corEtiqueta,
      });
      onEtiquetaCriada(etiqueta);
      const atuais = stringArray(valor);
      onSave([...atuais, etiqueta.id]);
      setNomeEtiqueta("");
      setCriandoEtiqueta(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etiqueta");
    }
  }

  async function upload(file: File) {
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const anexo = await api.post<{ nome: string; url: string }>(
        `/api/cards/${cardId}/attachments`,
        formData
      );
      onSave({ nome: anexo.nome, url: anexo.url } satisfies Anexo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    } finally {
      setEnviando(false);
    }
  }

  const linha = (conteudo: React.ReactNode) => (
    <div id={`campo-${campo.id}`} className="flex items-start gap-2 py-1.5 scroll-mt-4 transition-colors">
      <div className="mt-1">
        <CampoIcon tipo={campo.tipo} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-slate-500">{campo.titulo}</span>
        {conteudo}
      </div>
    </div>
  );

  // ID: somente leitura
  if (campo.tipo === "id") {
    return linha(<span className="text-sm text-slate-700">{cardId}</span>);
  }

  // Checkbox: alterna direto
  if (campo.tipo === "checkbox") {
    return linha(
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox checked={Boolean(valor)} onCheckedChange={(v) => onSave(Boolean(v))} />
        <span className="text-sm text-slate-700">{valor ? "Sim" : "Não"}</span>
      </label>
    );
  }

  // Responsável: multi-seleção de usuários
  if (campo.tipo === "responsavel") {
    const ids = stringArray(valor);
    return linha(
      <div className="flex flex-col gap-1">
        {usuarios.length === 0 && <p className="text-sm text-slate-400">Nenhum usuário</p>}
        {usuarios.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={ids.includes(u.id)}
              onCheckedChange={() =>
                onSave(ids.includes(u.id) ? ids.filter((id) => id !== u.id) : [...ids, u.id])
              }
            />
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: u.corAvatar }}
            >
              {iniciais(u.nome)}
            </span>
            <span className="text-sm text-slate-700">{u.nome}</span>
          </label>
        ))}
      </div>
    );
  }

  // Etiquetas: multi-seleção + criar nova
  if (campo.tipo === "etiquetas") {
    const ids = stringArray(valor);
    return linha(
      <div className="flex flex-col gap-1">
        {etiquetas.map((e) => (
          <label key={e.id} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={ids.includes(e.id)}
              onCheckedChange={() =>
                onSave(ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id])
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
                  className={cn(
                    "h-6 w-6 rounded-full",
                    corEtiqueta === c && "ring-2 ring-slate-900 ring-offset-1"
                  )}
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
          <button
            onClick={() => setCriandoEtiqueta(true)}
            className="self-start text-xs text-blue-600 hover:underline"
          >
            + Criar nova etiqueta
          </button>
        )}
      </div>
    );
  }

  // Seleção de lista (múltipla)
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
                onSave(
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

  // Seleção única
  if (campo.tipo === "selecao_unica") {
    const opcoes = campo.config.opcoes ?? [];
    return linha(
      <Select value={typeof valor === "string" ? valor : undefined} onValueChange={(v) => onSave(v)}>
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

  // Anexo / Documentos
  if (campo.tipo === "anexo" || campo.tipo === "documentos") {
    const anexo = valor as Anexo | undefined | null;
    return linha(
      anexo ? (
        <div className="flex items-center gap-2 text-sm">
          <Paperclip size={13} className="text-slate-400" />
          <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 hover:underline">
            {anexo.nome}
          </a>
          <button onClick={() => onSave(null)} className="text-slate-400 hover:text-red-600" aria-label="Remover">
            <X size={13} />
          </button>
        </div>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-blue-600 hover:underline">
          {enviando ? "Enviando..." : "Clique aqui para adicionar"}
          <input
            type="file"
            className="hidden"
            disabled={enviando}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
      )
    );
  }

  // Conexão com database: placeholder inerte
  if (campo.tipo === "conexao_database") {
    return linha(
      <span className="text-sm italic text-slate-400">Conexão com banco de dados externo — não configurada</span>
    );
  }

  // Data / Data e hora / Data de vencimento
  if (campo.tipo === "data" || campo.tipo === "data_hora" || campo.tipo === "data_vencimento") {
    const inputType = campo.tipo === "data_hora" ? "datetime-local" : "date";
    if (!editing) {
      return linha(
        vazio ? (
          <button onClick={iniciarEdicao} className="text-sm text-slate-400 hover:text-slate-600">
            Clique aqui para adicionar
          </button>
        ) : (
          <button onClick={iniciarEdicao} className="text-sm text-slate-700 hover:underline">
            {campo.tipo === "data_hora"
              ? new Date(valor as string).toLocaleString("pt-BR")
              : new Date(valor as string).toLocaleDateString("pt-BR")}
          </button>
        )
      );
    }
    return linha(
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          type={inputType}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          className="h-8 w-auto text-sm"
        />
        <Button size="sm" onClick={salvar}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    );
  }

  // Texto longo
  if (campo.tipo === "texto_longo") {
    if (!editing) {
      return linha(
        <button
          onClick={iniciarEdicao}
          className="w-full text-left text-sm text-slate-700 hover:bg-slate-50 rounded px-1 -mx-1"
        >
          {vazio ? <span className="text-slate-400">Clique aqui para adicionar</span> : (valor as string)}
        </button>
      );
    }
    return linha(
      <div className="flex flex-col gap-2">
        <Textarea autoFocus rows={3} value={rascunho} onChange={(e) => setRascunho(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={salvar}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelar}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Tipos de texto curto (padrão): texto_curto, conteudo_dinamico, email, telefone, numerico, moeda, tempo
  if (TIPOS_TEXTO.has(campo.tipo)) {
    if (!editing) {
      return linha(
        <button onClick={iniciarEdicao} className="text-sm text-slate-700 hover:underline">
          {vazio ? <span className="text-slate-400">Clique aqui para adicionar</span> : String(valor)}
        </button>
      );
    }
    return linha(
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          type={campo.tipo === "numerico" || campo.tipo === "moeda" ? "number" : "text"}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
          className="h-8 max-w-xs text-sm"
        />
        <Button size="sm" onClick={salvar}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    );
  }

  return null;
}
