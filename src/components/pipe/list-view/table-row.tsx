"use client";

import { Campo, Card, Etiqueta, Fase, Usuario } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { duracao, formatarData, formatarDataHora, cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";
import { ColunaId } from "./colunas";
import { PhaseBadge } from "./phase-badge";

function Vazio() {
  return <span className="text-sm text-slate-400">Vazio</span>;
}

export function TableRow({
  card,
  colunasVisiveis,
  fases,
  campos,
  etiquetas,
  usuarios,
  selecionado,
  onToggleSelecao,
  onAbrir,
}: {
  card: Card;
  colunasVisiveis: ColunaId[];
  fases: Fase[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  selecionado: boolean;
  onToggleSelecao: () => void;
  onAbrir: () => void;
}) {
  const fase = fases.find((f) => f.id === card.faseId);

  const campoVencimento = campoPorTipo(campos, "data_vencimento");
  const vencimento = campoVencimento ? (card.valoresCampos[campoVencimento.id] as string | undefined) : undefined;

  const campoResponsavel = campoPorTipo(campos, "responsavel");
  const responsaveis = campoResponsavel
    ? stringArray(card.valoresCampos[campoResponsavel.id])
        .map((id) => usuarios.find((u) => u.id === id))
        .filter((u): u is Usuario => Boolean(u))
    : [];

  const campoEtiquetas = campoPorTipo(campos, "etiquetas");
  const etiquetasCard = campoEtiquetas
    ? stringArray(card.valoresCampos[campoEtiquetas.id])
        .map((id) => etiquetas.find((e) => e.id === id))
        .filter((e): e is Etiqueta => Boolean(e))
    : [];

  const ultimoHistorico = card.historico[card.historico.length - 1];

  function celula(id: ColunaId) {
    switch (id) {
      case "fase":
        return <PhaseBadge fase={fase} />;
      case "titulo":
        return <span className="font-medium text-slate-800">{card.titulo}</span>;
      case "vencimento":
        return vencimento ? <span className="text-slate-700">{formatarData(vencimento)}</span> : <Vazio />;
      case "responsaveis":
        return responsaveis.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {responsaveis.slice(0, 3).map((u) => (
                <Avatar key={u.id} nome={u.nome} cor={u.corAvatar} size={22} />
              ))}
            </div>
            {responsaveis.length === 1 && (
              <span className="truncate text-slate-700">{responsaveis[0].nome}</span>
            )}
          </div>
        ) : (
          <Vazio />
        );
      case "etiquetas":
        return etiquetasCard.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {etiquetasCard.map((e) => (
              <span
                key={e.id}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                style={{ backgroundColor: `${e.cor}1f`, color: e.cor }}
              >
                {e.nome}
              </span>
            ))}
          </div>
        ) : (
          <Vazio />
        );
      case "tempoFase":
        return <span className="text-slate-600">{duracao(ultimoHistorico?.entradaEm ?? card.criadoEm)}</span>;
      case "tempoPipe":
        return <span className="text-slate-600">{duracao(card.criadoEm)}</span>;
      case "atualizadoEm":
        return <span className="text-slate-600">{formatarDataHora(card.atualizadoEm)}</span>;
      default:
        return null;
    }
  }

  return (
    <tr
      onClick={onAbrir}
      className={cn(
        "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50",
        selecionado && "bg-blue-50/60 hover:bg-blue-50"
      )}
    >
      <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selecionado} onCheckedChange={onToggleSelecao} />
      </td>
      {colunasVisiveis.map((id) => (
        <td key={id} className="whitespace-nowrap px-3 py-2.5 text-sm">
          {celula(id)}
        </td>
      ))}
    </tr>
  );
}
