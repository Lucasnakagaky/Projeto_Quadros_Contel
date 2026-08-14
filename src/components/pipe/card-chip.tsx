"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, CalendarClock, CornerDownRight, Link2 } from "lucide-react";
import { Campo, Card, CardRelacionado, Etiqueta, Usuario } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { cn, iniciais } from "@/lib/utils";

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

// Cinza padrão da borda do card (estilo Pipefy) — usado nos 3 lados finos e
// como fallback da borda esquerda quando o card não tem cor de fase.
const COR_BORDA_PADRAO = "#CCD1D7";

export function CardChip({
  card,
  campos,
  etiquetas = [],
  usuarios = [],
  filhos = [],
  pai,
  corFase,
  onOpen,
  onOpenCard,
  dragOverlay = false,
}: {
  card: Card;
  campos: Campo[];
  etiquetas?: Etiqueta[];
  usuarios?: Usuario[];
  filhos?: CardRelacionado[];
  pai?: CardRelacionado;
  /** Cor da fase/status do card — pinta a borda esquerda de 4px (assinatura visual do card no Pipefy). */
  corFase?: string;
  onOpen: () => void;
  onOpenCard?: (id: string) => void;
  dragOverlay?: boolean;
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
  };
  // Cor da borda esquerda: aplicada em ambos os casos (card normal e clone do drag overlay).
  const corBorda = { borderLeftColor: corFase || COR_BORDA_PADRAO };

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
      style={dragOverlay ? corBorda : { ...style, ...corBorda }}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={onOpen}
      onKeyDown={dragOverlay ? undefined : handleKeyDown}
      className={cn(
        "flex cursor-grab touch-none flex-col gap-1.5 rounded border-l-4 border-t-[0.667px] border-r-[0.667px] border-b-[0.667px] border-t-[#CCD1D7] border-r-[#CCD1D7] border-b-[#CCD1D7] bg-white py-3 pl-2 pr-3 shadow-[0_4px_8px_0_rgba(38,50,56,0.05)] transition-shadow duration-[125ms] ease-[cubic-bezier(0.2,0,0.38,0.9)] hover:shadow-[0_4px_6px_0_rgba(102,102,102,0.09),0_9px_14px_0_rgba(102,102,102,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 active:cursor-grabbing",
        isDragging && "cursor-grabbing opacity-40"
      )}
    >
      {pai && (
        <button
          onClick={(e) => abrirRelacionado(e, pai.id)}
          title={`Card pai: ${pai.titulo}`}
          className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 hover:bg-violet-100"
        >
          <CornerDownRight size={10} className="shrink-0" />
          <span className="truncate">Card Pai: {pai.titulo}</span>
        </button>
      )}

      {etiquetaIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {etiquetaIds.map((id) => {
            const etiqueta = etiquetas.find((e) => e.id === id);
            if (!etiqueta) return null;
            return (
              <span
                key={id}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4"
                style={{ backgroundColor: `${etiqueta.cor}1f`, color: etiqueta.cor }}
              >
                {etiqueta.nome}
              </span>
            );
          })}
        </div>
      )}

      <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{card.titulo}</p>

      {filhos.length > 0 && (
        <div className="flex flex-col items-start gap-1">
          {filhos.slice(0, 2).map((f) => (
            <button
              key={f.id}
              onClick={(e) => abrirRelacionado(e, f.id)}
              title={`Card filho: ${f.titulo}`}
              className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-100"
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

      {previasCompactas.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {previasCompactas.map(({ campo, valor }) => (
            <p key={campo.id} className="truncate text-[11px] text-slate-400">
              {campo.titulo}: <span className="text-slate-600">{formatarValorPreview(campo, valor)}</span>
            </p>
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
