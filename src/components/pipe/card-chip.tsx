"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CalendarClock,
  CornerDownRight,
  Link2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Campo, Card, CardRelacionado, Etiqueta, Usuario } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { cn, iniciais } from "@/lib/utils";
import { CampoIcon } from "./card-modal/campo-icon";

const TIPOS_SEM_PREVIA_COMPACTA = new Set([
  "etiquetas",
  "responsavel",
  "data_vencimento",
  "conexao_pipe",
  "conexao_database",
  "anexo",
  "documentos",
  // Valor é HTML (editor com formatação) — não faz sentido como texto puro na face do card.
  "texto_formatado",
]);

// Além deste índice os cards entram todos juntos: escalonar uma coluna longa inteira
// deixaria os últimos itens aparecendo tarde demais.
const MAX_CARDS_ESCALONADOS = 8;
const PASSO_ESCALONAMENTO_MS = 30;

function formatarValorPreview(campo: Campo, valor: unknown): string {
  if (campo.tipo === "moeda") {
    const numero = typeof valor === "number" ? valor : parseFloat(String(valor));
    if (!Number.isNaN(numero)) {
      try {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: campo.config.moeda || "BRL",
        }).format(numero);
      } catch {
        // moeda inválida — cai no fallback abaixo
      }
    }
  }
  return String(valor);
}

function statusVencimento(iso?: string): "atrasado" | "proximo" | "normal" | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  const diffDias = Math.round((data.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return "atrasado";
  if (diffDias <= 2) return "proximo";
  return "normal";
}

export function CardChip({
  card,
  campos,
  etiquetas = [],
  usuarios = [],
  filhos = [],
  pai,
  onOpen,
  onOpenCard,
  onFiltrarEtiqueta,
  dragOverlay = false,
  animarEntrada = false,
  indice = 0,
}: {
  card: Card;
  campos: Campo[];
  etiquetas?: Etiqueta[];
  usuarios?: Usuario[];
  filhos?: CardRelacionado[];
  pai?: CardRelacionado;
  onOpen: () => void;
  onOpenCard?: (id: string) => void;
  /** Clique na etiqueta aplica o filtro do quadro por aquele nome (não abre o card). */
  onFiltrarEtiqueta?: (nome: string) => void;
  dragOverlay?: boolean;
  /** Só é true no primeiro render do quadro — ver `animarEntrada` no pipe-board. */
  animarEntrada?: boolean;
  /** Posição na coluna, usada só para escalonar a entrada. */
  indice?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { type: "card", faseId: card.faseId },
      disabled: dragOverlay,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(animarEntrada && !dragOverlay
      ? { animationDelay: `${Math.min(indice, MAX_CARDS_ESCALONADOS) * PASSO_ESCALONAMENTO_MS}ms` }
      : null),
  };

  const campoEtiquetas = campoPorTipo(campos, "etiquetas");
  const campoResponsavel = campoPorTipo(campos, "responsavel");
  const campoVencimento = campoPorTipo(campos, "data_vencimento");

  const etiquetaIds = campoEtiquetas ? stringArray(card.valoresCampos[campoEtiquetas.id]) : [];
  const responsavelIds = campoResponsavel ? stringArray(card.valoresCampos[campoResponsavel.id]) : [];
  const vencimento = campoVencimento ? (card.valoresCampos[campoVencimento.id] as string | undefined) : undefined;
  const status = statusVencimento(vencimento);

  const previasCompactas = campos
    .filter((c) => c.visualizacaoCompacta && !TIPOS_SEM_PREVIA_COMPACTA.has(c.tipo))
    .map((c) => ({ campo: c, valor: card.valoresCampos[c.id] }))
    .filter(({ valor }) => valor !== undefined && valor !== null && valor !== "")
    .slice(0, 2);

  const temRodape = Boolean(vencimento) || responsavelIds.length > 0;

  function abrirRelacionado(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onOpenCard?.(id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // só abre pelo teclado quando o foco está no próprio card, não em chips/botões internos
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={dragOverlay ? undefined : style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={onOpen}
      onKeyDown={dragOverlay ? undefined : handleKeyDown}
      className={cn(
        "group/card relative flex cursor-grab touch-none flex-col gap-1.5 rounded-md border border-borda bg-white p-3 shadow-[0_1px_2px_0_rgba(38,50,56,0.08)]",
        // transform entra na lista porque o hover agora levanta o card; antes só a sombra
        // transicionava e a cor da borda mudava de estalo.
        "transition-[box-shadow,border-color,transform] duration-(--duracao-rapida) ease-(--ease-entrada)",
        "hover:-translate-y-0.5 hover:border-borda-forte hover:shadow-[0_4px_12px_0_rgba(38,50,56,0.14)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 active:cursor-grabbing",
        animarEntrada && !dragOverlay && "anim-card-entra",
        // durante o arraste, o card de origem vira um fantasma tracejado no lugar de onde saiu
        isDragging && "cursor-grabbing border-dashed opacity-40 shadow-none"
      )}
    >
      {/* Afordância visual de abrir (padrão Pipefy). Puramente decorativa: o card inteiro
          já é clicável e acionável por Enter/Espaço, então um botão real aqui só criaria
          uma parada de tabulação duplicada para o mesmo destino. */}
      {!dragOverlay && (
        <SquareArrowOutUpRight
          size={12}
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-2.5 text-slate-300 opacity-0 transition-opacity duration-(--duracao-rapida) group-hover/card:opacity-100"
        />
      )}

      {pai && (
        <button
          onClick={(e) => abrirRelacionado(e, pai.id)}
          title={`Card pai: ${pai.titulo}`}
          className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 transition-colors duration-(--duracao-rapida) hover:bg-violet-100"
        >
          <CornerDownRight size={10} className="shrink-0" />
          <span className="truncate">Card Pai: {pai.titulo}</span>
        </button>
      )}

      {etiquetaIds.length > 0 && (
        <div className="flex flex-wrap gap-1 pr-4">
          {etiquetaIds.map((id) => {
            const etiqueta = etiquetas.find((e) => e.id === id);
            if (!etiqueta) return null;
            return (
              <button
                key={id}
                type="button"
                // stopPropagation impede que o clique chegue ao onClick da raiz e abra o card.
                // O pointerdown continua propagando de propósito, para o dnd-kit seguir
                // permitindo arrastar o card pegando pela etiqueta.
                onClick={(e) => {
                  e.stopPropagation();
                  onFiltrarEtiqueta?.(etiqueta.nome);
                }}
                title={`Filtrar por etiqueta ${etiqueta.nome}`}
                aria-label={`Filtrar por etiqueta ${etiqueta.nome}`}
                className="cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 transition-[opacity,transform] duration-(--duracao-rapida) hover:-translate-y-px hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                style={{ backgroundColor: `${etiqueta.cor}1f`, color: etiqueta.cor }}
              >
                {etiqueta.nome}
              </button>
            );
          })}
        </div>
      )}

      <p className="line-clamp-2 pr-4 text-sm font-semibold leading-5 text-titulo">{card.titulo}</p>

      {filhos.length > 0 && (
        <div className="flex flex-col items-start gap-1">
          {filhos.slice(0, 2).map((f) => (
            <button
              key={f.id}
              onClick={(e) => abrirRelacionado(e, f.id)}
              title={`Card filho: ${f.titulo}`}
              className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 transition-colors duration-(--duracao-rapida) hover:bg-blue-100"
            >
              <Link2 size={10} className="shrink-0" />
              <span className="truncate">Card Filho: {f.titulo}</span>
            </button>
          ))}
          {filhos.length > 2 && (
            <span className="text-[10px] font-medium text-slate-400">
              +{filhos.length - 2} card(s) filho(s)
            </span>
          )}
        </div>
      )}

      {/* Campos do formulário na face do card, no padrão Pipefy:
          ícone + LABEL em maiúsculo + valor logo abaixo. */}
      {previasCompactas.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-1.5">
          {previasCompactas.map(({ campo, valor }) => (
            <div key={campo.id} className="flex items-start gap-1.5">
              <span className="mt-0.5">
                <CampoIcon tipo={campo.tipo} size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {campo.titulo}
                </p>
                <p className="truncate text-[13px] leading-4 text-slate-700">
                  {formatarValorPreview(campo, valor)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {temRodape && (
        <div className="mt-0.5 flex items-center gap-1.5">
          {vencimento && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                status === "atrasado"
                  ? "bg-red-50 text-red-600"
                  : status === "proximo"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-slate-100 text-slate-500"
              )}
              title={status === "atrasado" ? "Vencimento atrasado" : status === "proximo" ? "Vencimento próximo" : undefined}
            >
              {status === "atrasado" ? <AlertCircle size={11} /> : <CalendarClock size={11} />}
              {new Date(vencimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}

          {responsavelIds.length > 0 && (
            <span className="ml-auto flex -space-x-1.5">
              {responsavelIds.slice(0, 3).map((id) => {
                const usuario = usuarios.find((m) => m.id === id);
                return (
                  <span
                    key={id}
                    title={usuario?.nome}
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold text-white"
                    style={{ backgroundColor: usuario?.corAvatar ?? "#94a3b8" }}
                  >
                    {usuario ? iniciais(usuario.nome) : ""}
                  </span>
                );
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
