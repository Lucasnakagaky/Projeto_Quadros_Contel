"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, CornerDownRight, Link2 } from "lucide-react";
import { Campo, Card, Etiqueta, Usuario } from "@/lib/types";
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
]);

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
  contagemFilhos = 0,
  ehFilho = false,
  onOpen,
  dragOverlay = false,
}: {
  card: Card;
  campos: Campo[];
  etiquetas?: Etiqueta[];
  usuarios?: Usuario[];
  contagemFilhos?: number;
  ehFilho?: boolean;
  onOpen: () => void;
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

  const temRodape = Boolean(vencimento) || contagemFilhos > 0 || responsavelIds.length > 0;

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={dragOverlay ? undefined : style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={onOpen}
      className={cn(
        "flex cursor-pointer touch-none flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      {ehFilho && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
          <CornerDownRight size={10} />
          Card filho
        </span>
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

      <p className="line-clamp-2 text-sm font-medium text-slate-800">{card.titulo}</p>

      {previasCompactas.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {previasCompactas.map(({ campo, valor }) => (
            <p key={campo.id} className="truncate text-[11px] text-slate-400">
              {campo.titulo}: <span className="text-slate-600">{String(valor)}</span>
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
            >
              <CalendarClock size={11} />
              {new Date(vencimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}

          {contagemFilhos > 0 && (
            <span
              title="Cards conectados"
              className="flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"
            >
              <Link2 size={11} />
              {contagemFilhos}
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
