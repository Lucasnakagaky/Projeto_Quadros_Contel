"use client";

import { useEffect, useRef, useState } from "react";
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
import { ImageLightbox, ImagemAmpliada } from "./image-lightbox";
import { RichTextEditor } from "./rich-text-editor";
import { api } from "@/lib/api-client";
import { Campo, Usuario } from "@/lib/types";
import { stringArray } from "@/lib/campo-utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { iniciais } from "@/lib/utils";

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
  valor,
  usuarios,
  onSave,
}: {
  campo: Campo;
  cardId: string;
  valor: unknown;
  usuarios: Usuario[];
  onSave: (valor: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rascunho, setRascunho] = useState<string>(typeof valor === "string" ? valor : "");
  const [enviando, setEnviando] = useState(false);
  const [relacionandoDb, setRelacionandoDb] = useState(false);
  const [novaRelacaoDb, setNovaRelacaoDb] = useState("");
  const [imagemAmpliada, setImagemAmpliada] = useState<ImagemAmpliada>(null);
  const conteudoDescricaoRef = useRef<HTMLDivElement>(null);

  // Torna as imagens da descrição focáveis/anunciáveis por teclado (o conteúdo vem de
  // dangerouslySetInnerHTML, então não dá pra passar tabIndex/aria-label via JSX direto nelas).
  // No-op pra qualquer campo.tipo que não seja "texto_formatado" (a ref nunca é anexada).
  useEffect(() => {
    conteudoDescricaoRef.current?.querySelectorAll("img").forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", img.alt ? `Ampliar imagem: ${img.alt}` : "Ampliar imagem");
    });
  }, [valor]);

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

  // Texto formatado: editor com negrito/itálico/listas/imagem (armazena HTML sanitizado)
  if (campo.tipo === "texto_formatado") {
    const html = typeof valor === "string" ? valor : "";
    if (!editing) {
      // Clique/Enter/Espaço numa <img> abre o lightbox em vez de entrar em modo de edição —
      // intercepta antes do onClick do <button> (stopPropagation) só quando o alvo é a imagem;
      // clicar em qualquer outro ponto do texto continua abrindo a edição normalmente.
      function aoInteragirComImagem(e: React.SyntheticEvent) {
        const alvo = e.target as HTMLElement;
        if (alvo.tagName !== "IMG") return;
        e.preventDefault();
        e.stopPropagation();
        const img = alvo as HTMLImageElement;
        setImagemAmpliada({ src: img.src, alt: img.alt });
      }
      return linha(
        <>
          <button
            onClick={iniciarEdicao}
            className="w-full rounded px-1 -mx-1 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {htmlEstaVazio(html) ? (
              <span className="text-slate-400">Clique aqui para adicionar</span>
            ) : (
              <div
                ref={conteudoDescricaoRef}
                className="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded [&_img]:cursor-zoom-in"
                // Sanitiza também na renderização (defesa em profundidade): o valor pode ter
                // sido salvo por outro caminho que não passa pelo RichTextEditor (ex.: rascunho
                // de criação de card, que usa um Textarea simples).
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
                onClick={aoInteragirComImagem}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") aoInteragirComImagem(e);
                }}
              />
            )}
          </button>
          <ImageLightbox
            imagem={imagemAmpliada}
            onOpenChange={(open) => !open && setImagemAmpliada(null)}
          />
        </>
      );
    }
    return linha(
      <RichTextEditor
        cardId={cardId}
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

  // Texto longo (texto plano, sem formatação)
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
