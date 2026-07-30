"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Boxes, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { Campo, Etiqueta, Usuario } from "@/lib/types";
import { stringArray } from "@/lib/campo-utils";
import { cn, dataPorExtenso, formatarData, formatarDataHora, tempoRelativo } from "@/lib/utils";
import { CardDetail } from "./types";
import { ChipOptionsMenu } from "./chip-options-menu";

function formatarValorPreview(
  campo: Campo,
  valor: unknown,
  etiquetas: Etiqueta[],
  usuarios: Usuario[]
): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  switch (campo.tipo) {
    case "checkbox":
      return valor ? "Sim" : "Não";
    case "responsavel": {
      const nomes = stringArray(valor)
        .map((id) => usuarios.find((u) => u.id === id)?.nome)
        .filter((n): n is string => Boolean(n));
      return nomes.length ? nomes.join(", ") : null;
    }
    case "etiquetas": {
      const nomes = stringArray(valor)
        .map((id) => etiquetas.find((e) => e.id === id)?.nome)
        .filter((n): n is string => Boolean(n));
      return nomes.length ? nomes.join(", ") : null;
    }
    case "selecao_lista": {
      const arr = stringArray(valor);
      return arr.length ? arr.join(", ") : null;
    }
    case "data":
    case "data_vencimento":
      return formatarData(valor as string);
    case "data_hora":
      return formatarDataHora(valor as string);
    case "anexo":
    case "documentos":
      return (valor as { nome?: string })?.nome ?? null;
    default:
      return String(valor);
  }
}

export interface CardConexaoChipProps {
  cardId: string;
  titulo: string;
  pipeNome: string;
  criadoEm: string;
  faseNome: string;
  faseCor: string;
  quebrada?: boolean;
  onAbrirCard: () => void;
  onRemover?: () => void;
}

function CardConexaoChip({
  cardId,
  titulo,
  pipeNome,
  criadoEm,
  faseNome,
  faseCor,
  quebrada = false,
  onAbrirCard,
  onRemover,
}: CardConexaoChipProps) {
  const [expandido, setExpandido] = useState(false);
  const [detalhe, setDetalhe] = useState<CardDetail | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function alternarExpandido() {
    if (quebrada) return;
    if (!expandido && !detalhe) {
      setCarregando(true);
      try {
        const data = await api.get<CardDetail>(`/api/cards/${cardId}`);
        setDetalhe(data);
      } catch {
        toast.error("Erro ao carregar pré-visualização do card");
      } finally {
        setCarregando(false);
      }
    }
    setExpandido((v) => !v);
  }

  const criador = detalhe?.usuarios.find((u) => u.id === detalhe.card.criadoPorId);
  const camposPreenchidos = detalhe
    ? detalhe.campos
        .filter((c) => c.tipo !== "conexao_pipe" && c.tipo !== "conexao_database")
        .map((c) => ({
          campo: c,
          valor: formatarValorPreview(c, detalhe.card.valoresCampos[c.id], detalhe.etiquetas, detalhe.usuarios),
        }))
        .filter((x): x is { campo: Campo; valor: string } => x.valor !== null)
    : [];

  return (
    <div
      className={cn(
        "rounded-lg border bg-white transition-colors",
        quebrada ? "border-red-200 bg-red-50" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <div onClick={alternarExpandido} className={cn("flex flex-col gap-2 p-3", !quebrada && "cursor-pointer")}>
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-800">
            {quebrada && <AlertTriangle size={14} className="shrink-0 text-red-500" />}
            {titulo}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            {onRemover && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemover();
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                aria-label="Remover conexão"
              >
                <X size={14} />
              </button>
            )}
            <ChipOptionsMenu onAbrirCard={onAbrirCard} />
          </div>
        </div>

        {quebrada ? (
          <span className="text-xs text-red-500">
            Conexão quebrada — card indisponível (movido para a lixeira ou excluído)
          </span>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-400">Pipe</span>
                <span className="flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  <Boxes size={11} />
                  {pipeNome}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-400">Criado em</span>
                <span className="text-xs text-slate-700">{dataPorExtenso(criadoEm)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-400">Fase</span>
              <span
                className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: `${faseCor}1f`, color: faseCor }}
              >
                {faseNome}
              </span>
            </div>
          </>
        )}
      </div>

      {expandido && !quebrada && (
        <div className="border-t border-slate-100 p-3">
          {carregando ? (
            <span className="text-xs text-slate-400">Carregando...</span>
          ) : (
            detalhe && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400">
                  Formulário Inicial — Criado por{" "}
                  <span className="font-medium text-slate-600">{criador?.nome ?? "—"}</span> •{" "}
                  {tempoRelativo(detalhe.card.criadoEm)}
                </span>
                {camposPreenchidos.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum campo preenchido.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {camposPreenchidos.map(({ campo, valor }) => (
                      <div key={campo.id} className="text-xs">
                        <span className="text-slate-400">{campo.titulo}: </span>
                        <span className="text-slate-700">{valor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function ChildCardChip(props: CardConexaoChipProps) {
  return <CardConexaoChip {...props} />;
}

export function ParentCardChip(props: CardConexaoChipProps) {
  return <CardConexaoChip {...props} />;
}
