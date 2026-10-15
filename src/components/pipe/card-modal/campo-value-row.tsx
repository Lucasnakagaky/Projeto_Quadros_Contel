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
import { HtmlFormatadoView } from "./html-formatado-view";
import { RichTextEditor } from "./rich-text-editor";
import { api } from "@/lib/api-client";
import { Anexo as AnexoReal, Campo, Usuario } from "@/lib/types";
import { stringArray } from "@/lib/campo-utils";
import { htmlEstaVazio, sanitizeHtml } from "@/lib/sanitize-html";
import { cn, formatarVencimento, iniciais, parseDataSolta } from "@/lib/utils";
import {
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  BTN_VALOR,
  BTN_VALOR_VAZIO,
  CHECK_MODAL,
  FOCO,
  ICONE_REMOVER,
  INPUT_MODAL,
  LINK_ACAO,
} from "./estilos";

type Anexo = { nome: string; url: string };
type RelacaoExterna = { id: string; rotulo: string };

const TIPOS_TEXTO = new Set(["texto_curto", "email", "telefone", "numerico", "tempo"]);

// Formato legado de data_vencimento/data_hora (de quando o campo era <input type="date">),
// sem componente de horário — usado só pra normalizar o rascunho ao entrar em edição.
const REGEX_DATA_PURA_LOCAL = /^\d{4}-\d{2}-\d{2}$/;

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
  onAnexoCriado,
}: {
  campo: Campo;
  cardId: string;
  valor: unknown;
  usuarios: Usuario[];
  onSave: (valor: unknown) => void;
  /** Repassado ao RichTextEditor do campo "texto_formatado" — notifica o pai de um anexo criado
   * a partir de uma imagem colada/enviada na descrição, pra atualizar a aba "Anexos" ao vivo. */
  onAnexoCriado?: (anexo: AnexoReal) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rascunho, setRascunho] = useState<string>(typeof valor === "string" ? valor : "");
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
      <div
        id={`campo-${campo.id}`}
        className="-mx-1.5 flex items-start gap-2 rounded-lg px-1.5 py-1.5 scroll-mt-4 transition-[background-color,box-shadow] duration-(--duracao-rapida) hover:bg-slate-50/70"
      >
        <div className="mt-1">
          <CampoIcon tipo={campo.tipo} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {opts?.htmlForLabel ? (
              <label htmlFor={opts.htmlForLabel} className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {rotulo}
              </label>
            ) : (
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{rotulo}</span>
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
        <Checkbox className={CHECK_MODAL} checked={Boolean(valor)} onCheckedChange={(v) => onSave(Boolean(v))} />
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
            <Checkbox className={CHECK_MODAL}
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
            <Checkbox className={CHECK_MODAL}
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
        <SelectTrigger className={`h-8 max-w-xs text-sm ${INPUT_MODAL}`}>
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
          <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="truncate text-indigo-600 hover:text-indigo-800 hover:underline">
            {anexo.nome}
          </a>
          <button onClick={() => onSave(null)} className={ICONE_REMOVER} aria-label="Remover">
            <X size={13} />
          </button>
        </div>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:underline">
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
            <Button size="sm" className={BTN_PRIMARIO} onClick={adicionarRelacaoDb}>
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" className={BTN_SECUNDARIO} onClick={() => setRelacionandoDb(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setRelacionandoDb(true)}
            className={`self-start ${LINK_ACAO}`}
          >
            {relacoes.length === 0 ? "Nenhum registro relacionado — " : ""}+ Relacionar registro externo
          </button>
        )}
      </div>
    );
  }

  // Data / Data e hora / Data de vencimento
  if (campo.tipo === "data" || campo.tipo === "data_hora" || campo.tipo === "data_vencimento") {
    // data_vencimento usa o mesmo datetime-local que data_hora já usava — dá pra editar
    // data e hora juntos ou só um dos dois, com o mesmo widget nativo (nenhum componente novo).
    const inputType = campo.tipo === "data" ? "date" : "datetime-local";

    function iniciarEdicaoData() {
      const bruto = typeof valor === "string" ? valor : "";
      // Cards antigos guardam só "YYYY-MM-DD" (de quando o campo era <input type="date">).
      // Isso não é um valor válido pra <input type="datetime-local">: sem normalizar, o
      // navegador mostraria o campo vazio ao editar. Só ajusta o rascunho em memória — o
      // valor salvo no banco não muda até o usuário salvar de novo.
      const normalizado =
        inputType === "datetime-local" && REGEX_DATA_PURA_LOCAL.test(bruto) ? `${bruto}T00:00` : bruto;
      setRascunho(normalizado);
      setEditing(true);
    }

    if (!editing) {
      return linha(
        vazio ? (
          <button onClick={iniciarEdicaoData} className={BTN_VALOR_VAZIO}>
            Clique aqui para adicionar
          </button>
        ) : (
          <button onClick={iniciarEdicaoData} className={BTN_VALOR}>
            {campo.tipo === "data_vencimento"
              ? formatarVencimento(valor as string)
              : campo.tipo === "data_hora"
                ? parseDataSolta(valor as string).toLocaleString("pt-BR")
                : parseDataSolta(valor as string).toLocaleDateString("pt-BR")}
          </button>
        )
      );
    }
    return linha(
      // flex-wrap: se o vencimento estiver no grid apertado ao lado de "Criação do card"
      // (campo-value-list.tsx) e não couber tudo numa linha só, Salvar/Cancelar quebram
      // pra uma segunda linha em vez de estourar o layout.
      <div className="flex flex-wrap items-center gap-2">
        <Input
          autoFocus
          type={inputType}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          // Largura fixa (não w-auto): um <input type="date"/"datetime-local"> nativo com
          // largura automática muda de tamanho entre fechado e focado (o navegador reserva
          // espaço extra pro ícone/segmentos), e isso empurrava o Salvar/Cancelar pro lado.
          className={cn(
            "h-8 shrink-0 text-sm",
            INPUT_MODAL,
            inputType === "datetime-local" ? "w-52" : "w-36"
          )}
        />
        <Button size="sm" className={`shrink-0 ${BTN_PRIMARIO}`} onClick={salvar}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" className={`shrink-0 ${BTN_SECUNDARIO}`} onClick={cancelar}>
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
        <button onClick={iniciarEdicao} className={BTN_VALOR}>
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
          className={`h-8 max-w-xs text-sm ${INPUT_MODAL}`}
        />
        <Button size="sm" className={BTN_PRIMARIO} onClick={salvar}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" className={BTN_SECUNDARIO} onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    );
  }

  // Texto formatado: editor com negrito/itálico/listas/imagem (armazena HTML sanitizado)
  if (campo.tipo === "texto_formatado") {
    const html = typeof valor === "string" ? valor : "";
    if (!editing) {
      return linha(
        // Clique/Enter/Espaço numa <img> abre o lightbox (tratado dentro de HtmlFormatadoView,
        // que faz stopPropagation) em vez de entrar em modo de edição; clicar em qualquer outro
        // ponto do texto continua abrindo a edição normalmente.
        <button
          onClick={iniciarEdicao}
          className={`-mx-2 w-full rounded-lg px-2 py-1 text-left text-sm leading-relaxed text-slate-700 transition-colors duration-(--duracao-rapida) hover:bg-indigo-50/40 ${FOCO}`}
        >
          {htmlEstaVazio(html) ? (
            <span className="text-slate-400">Clique aqui para adicionar</span>
          ) : (
            <HtmlFormatadoView html={html} />
          )}
        </button>
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
        onAnexoCriado={onAnexoCriado}
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
          className={`-mx-2 w-full rounded-lg px-2 py-1 text-left text-sm text-slate-700 transition-colors duration-(--duracao-rapida) hover:bg-indigo-50/40 ${FOCO}`}
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
              className={LINK_ACAO}
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
          className={`resize-y ${INPUT_MODAL}`}
        />
        <div className="flex gap-2">
          <Button size="sm" className={BTN_PRIMARIO} onClick={salvar}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" className={BTN_SECUNDARIO} onClick={cancelar}>
            Cancelar
          </Button>
        </div>
      </div>,
      { htmlForLabel: textareaId }
    );
  }

  // Tipos de texto curto (padrão): texto_curto, email, telefone, numerico, tempo
  if (TIPOS_TEXTO.has(campo.tipo)) {
    if (!editing) {
      return linha(
        <button onClick={iniciarEdicao} className={BTN_VALOR}>
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
          className={`h-8 max-w-xs text-sm ${INPUT_MODAL}`}
        />
        <Button size="sm" className={BTN_PRIMARIO} onClick={salvar}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" className={BTN_SECUNDARIO} onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    );
  }

  return null;
}
