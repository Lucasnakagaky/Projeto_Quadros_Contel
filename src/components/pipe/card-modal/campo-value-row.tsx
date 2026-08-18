"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Paperclip, Pencil, Trash2, X } from "lucide-react";
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
import { RichTextEditor } from "./rich-text-editor";
import { api } from "@/lib/api-client";
import { Campo, CORES_ETIQUETA, Etiqueta, Usuario } from "@/lib/types";
import { stringArray } from "@/lib/campo-utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { cn, iniciais } from "@/lib/utils";

type Anexo = { nome: string; url: string };
type RelacaoExterna = { id: string; rotulo: string };

const TIPOS_TEXTO = new Set(["texto_curto", "conteudo_dinamico", "email", "telefone", "numerico", "tempo"]);

function htmlEstaVazio(html: unknown): boolean {
  if (typeof html !== "string") return true;
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

function formatarMoeda(valor: unknown, codigoMoeda: string): string {
  const numero = typeof valor === "number" ? valor : parseFloat(String(valor));
  if (Number.isNaN(numero)) return String(valor);
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: codigoMoeda }).format(numero);
  } catch {
    return String(valor);
  }
}

export function CampoValueRow({
  campo,
  cardId,
  pipeId,
  valor,
  etiquetas,
  usuarios,
  onSave,
  onEtiquetaCriada,
  onEtiquetaAtualizada,
  onEtiquetaExcluida,
}: {
  campo: Campo;
  cardId: string;
  pipeId: string;
  valor: unknown;
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  onSave: (valor: unknown) => void;
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
  onEtiquetaAtualizada: (etiqueta: Etiqueta) => void;
  onEtiquetaExcluida: (etiquetaId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rascunho, setRascunho] = useState<string>(typeof valor === "string" ? valor : "");
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [nomeEtiqueta, setNomeEtiqueta] = useState("");
  const [corEtiqueta, setCorEtiqueta] = useState(CORES_ETIQUETA[0]);
  const [editandoEtiquetaId, setEditandoEtiquetaId] = useState<string | null>(null);
  const [nomeEdicaoEtiqueta, setNomeEdicaoEtiqueta] = useState("");
  const [corEdicaoEtiqueta, setCorEdicaoEtiqueta] = useState(CORES_ETIQUETA[0]);
  const [enviando, setEnviando] = useState(false);
  const [relacionandoDb, setRelacionandoDb] = useState(false);
  const [novaRelacaoDb, setNovaRelacaoDb] = useState("");

  function iniciarEdicao() {
    setRascunho(typeof valor === "string" ? valor : "");
    setEditing(true);
  }

  function salvar() {
    const valorTrimado = rascunho.trim();
    if (campo.obrigatorio && !valorTrimado) {
      toast.error(`"${campo.titulo}" é obrigatório`);
      return;
    }
    if (valorTrimado && campo.validacaoCustomizada) {
      try {
        if (!new RegExp(campo.validacaoCustomizada).test(valorTrimado)) {
          toast.error(`"${campo.titulo}" não passou na validação customizada`);
          return;
        }
      } catch {
        // regex inválida salva no campo — ignora e deixa passar
      }
    }
    onSave(valorTrimado || null);
    setEditing(false);
  }

  function cancelar() {
    setEditing(false);
  }

  function adicionarRelacaoDb() {
    if (!novaRelacaoDb.trim()) return;
    const atuais: RelacaoExterna[] = Array.isArray(valor) ? (valor as RelacaoExterna[]) : [];
    onSave([
      ...atuais,
      { id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, rotulo: novaRelacaoDb.trim() },
    ]);
    setNovaRelacaoDb("");
    setRelacionandoDb(false);
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

  function iniciarEdicaoEtiqueta(etiqueta: Etiqueta) {
    setCriandoEtiqueta(false);
    setEditandoEtiquetaId(etiqueta.id);
    setNomeEdicaoEtiqueta(etiqueta.nome);
    setCorEdicaoEtiqueta(etiqueta.cor);
  }

  async function salvarEdicaoEtiqueta() {
    if (!editandoEtiquetaId || !nomeEdicaoEtiqueta.trim()) return;
    try {
      const atualizada = await api.patch<Etiqueta>(
        `/api/pipes/${pipeId}/etiquetas/${editandoEtiquetaId}`,
        { nome: nomeEdicaoEtiqueta.trim(), cor: corEdicaoEtiqueta }
      );
      onEtiquetaAtualizada(atualizada);
      setEditandoEtiquetaId(null);
      toast.success("Etiqueta atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar etiqueta");
    }
  }

  async function excluirEtiqueta(etiquetaId: string) {
    if (!confirm("Excluir esta etiqueta? Ela será removida de todos os cards.")) return;
    try {
      await api.delete(`/api/pipes/${pipeId}/etiquetas/${etiquetaId}`);
      onEtiquetaExcluida(etiquetaId);
      const atuais = stringArray(valor);
      if (atuais.includes(etiquetaId)) {
        onSave(atuais.filter((id) => id !== etiquetaId));
      }
      if (editandoEtiquetaId === etiquetaId) setEditandoEtiquetaId(null);
      toast.success("Etiqueta excluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir etiqueta");
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

  function linha(
    conteudo: React.ReactNode,
    opts?: { acao?: React.ReactNode; htmlForLabel?: string }
  ) {
    const rotulo = (
      <>
        {campo.titulo}
        {campo.obrigatorio && (
          <span className="ml-0.5 text-red-500" aria-label="obrigatório">
            *
          </span>
        )}
      </>
    );
    return (
      <div id={`campo-${campo.id}`} className="flex items-start gap-2 py-1 scroll-mt-4 transition-colors">
        <div className="mt-1">
          <CampoIcon tipo={campo.tipo} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {opts?.htmlForLabel ? (
              <label htmlFor={opts.htmlForLabel} className="block text-xs font-medium text-slate-500">
                {rotulo}
              </label>
            ) : (
              <span className="block text-xs font-medium text-slate-500">{rotulo}</span>
            )}
            {opts?.acao}
          </div>
          {conteudo}
        </div>
      </div>
    );
  }

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

  // Etiquetas: multi-seleção + criar/editar/excluir
  if (campo.tipo === "etiquetas") {
    const ids = stringArray(valor);
    return linha(
      <div className="flex flex-col gap-1">
        {etiquetas.map((e) =>
          editandoEtiquetaId === e.id ? (
            <div key={e.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
              <Input
                autoFocus
                value={nomeEdicaoEtiqueta}
                onChange={(ev) => setNomeEdicaoEtiqueta(ev.target.value)}
                onKeyDown={(ev) => ev.key === "Enter" && salvarEdicaoEtiqueta()}
              />
              <div className="flex flex-wrap gap-1.5">
                {CORES_ETIQUETA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCorEdicaoEtiqueta(c)}
                    className={cn(
                      "h-6 w-6 rounded-full",
                      corEdicaoEtiqueta === c && "ring-2 ring-slate-900 ring-offset-1"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={salvarEdicaoEtiqueta}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditandoEtiquetaId(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div key={e.id} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50">
              <label className="flex flex-1 cursor-pointer items-center gap-2 min-w-0">
                <Checkbox
                  checked={ids.includes(e.id)}
                  onCheckedChange={() =>
                    onSave(ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id])
                  }
                />
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
                <span className="truncate text-sm text-slate-700">{e.nome}</span>
              </label>
              <button
                type="button"
                onClick={() => iniciarEdicaoEtiqueta(e)}
                className="shrink-0 text-slate-400 opacity-0 hover:text-slate-700 group-hover:opacity-100"
                aria-label="Editar etiqueta"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => excluirEtiqueta(e.id)}
                className="shrink-0 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                aria-label="Excluir etiqueta"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        )}

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

  // Conexão com database externo: relaciona registros externos (não é um valor simples)
  if (campo.tipo === "conexao_database") {
    const relacoes: RelacaoExterna[] = Array.isArray(valor) ? (valor as RelacaoExterna[]) : [];
    return linha(
      <div className="flex flex-col gap-1.5">
        {campo.config.identificadorDatabase && (
          <span className="text-xs text-slate-400">
            Conectado a: <span className="text-slate-600">{campo.config.identificadorDatabase}</span>
          </span>
        )}

        {relacoes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {relacoes.map((r) => (
              <span
                key={r.id}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {r.rotulo}
                <button
                  onClick={() => onSave(relacoes.filter((x) => x.id !== r.id))}
                  aria-label={`Remover relação com ${r.rotulo}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {relacionandoDb ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="Identificador ou nome do registro externo"
              value={novaRelacaoDb}
              onChange={(e) => setNovaRelacaoDb(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionarRelacaoDb()}
            />
            <Button size="sm" onClick={adicionarRelacaoDb}>
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRelacionandoDb(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setRelacionandoDb(true)}
            className="self-start text-xs text-blue-600 hover:underline"
          >
            {relacoes.length === 0 ? "Nenhum registro relacionado — " : ""}+ Relacionar registro externo
          </button>
        )}
      </div>
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

  // Moeda: formata exibição com o código configurado (padrão BRL)
  if (campo.tipo === "moeda") {
    const codigoMoeda = campo.config.moeda || "BRL";
    if (!editing) {
      return linha(
        <button onClick={iniciarEdicao} className="text-sm text-slate-700 hover:underline">
          {vazio ? (
            <span className="text-slate-400">Clique aqui para adicionar</span>
          ) : (
            formatarMoeda(valor, codigoMoeda)
          )}
        </button>
      );
    }
    return linha(
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">{codigoMoeda}</span>
        <Input
          autoFocus
          type="number"
          step="0.01"
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

  // Texto formatado: editor com negrito/itálico/listas (armazena HTML sanitizado)
  if (campo.tipo === "texto_formatado") {
    const html = typeof valor === "string" ? valor : "";
    if (!editing) {
      return linha(
        <button
          onClick={iniciarEdicao}
          className="w-full rounded px-1 -mx-1 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          {htmlEstaVazio(html) ? (
            <span className="text-slate-400">Clique aqui para adicionar</span>
          ) : (
            <div
              className="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              // Sanitiza também na renderização (defesa em profundidade): o valor pode ter
              // sido salvo por outro caminho que não passa pelo RichTextEditor (ex.: rascunho
              // de criação de card, que usa um Textarea simples).
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
            />
          )}
        </button>
      );
    }
    return linha(
      <RichTextEditor
        valorInicial={sanitizeHtml(html)}
        onSalvar={(novoHtml) => {
          const vazio = htmlEstaVazio(novoHtml);
          if (campo.obrigatorio && vazio) {
            toast.error(`"${campo.titulo}" é obrigatório`);
            return;
          }
          onSave(vazio ? null : novoHtml);
          setEditing(false);
        }}
        onCancelar={cancelar}
      />
    );
  }

  // Texto longo (texto plano, sem formatação — ex.: "Descrição da Demanda")
  if (campo.tipo === "texto_longo") {
    const textareaId = `campo-textarea-${campo.id}`;
    if (!editing) {
      return linha(
        <button
          onClick={iniciarEdicao}
          className="w-full text-left text-sm text-slate-700 hover:bg-slate-50 rounded px-1 -mx-1"
        >
          {vazio ? (
            <span className="text-slate-400">Clique aqui para adicionar</span>
          ) : (
            <span className="whitespace-pre-wrap">{valor as string}</span>
          )}
        </button>,
        {
          acao: !vazio && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                iniciarEdicao();
              }}
              aria-label={`Editar ${campo.titulo}`}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Editar
            </button>
          ),
        }
      );
    }
    return linha(
      <div className="flex flex-col gap-2">
        <Textarea
          id={textareaId}
          autoFocus
          rows={3}
          placeholder="Digite aqui..."
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          className="resize-y"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={salvar}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelar}>
            Cancelar
          </Button>
        </div>
      </div>,
      { htmlForLabel: textareaId }
    );
  }

  // Tipos de texto curto (padrão): texto_curto, conteudo_dinamico, email, telefone, numerico, tempo
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
          type={campo.tipo === "numerico" ? "number" : "text"}
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
