import { Plus } from "lucide-react";
import { EventoHistorico, Fase } from "@/lib/types";
import { dataCurta, duracaoEntre } from "@/lib/utils";
import { LINK_ACAO } from "./estilos";

export interface HistoricoItem {
  faseId: string;
  faseNome: string;
  faseCor: string;
  entrouEm: Date;
  saiuEm?: Date;
}

/** Deriva a linha do tempo de fases a partir de card.historico[], usando nome/cor atuais da fase quando disponíveis. */
export function derivarHistoricoItens(historico: EventoHistorico[], fases: Fase[]): HistoricoItem[] {
  const ordenado = [...historico].sort((a, b) => (a.entradaEm < b.entradaEm ? -1 : 1));
  return ordenado.map((evento, i) => {
    const fase = fases.find((f) => f.id === evento.faseId);
    const proximo = ordenado[i + 1];
    return {
      faseId: evento.faseId,
      faseNome: fase?.nome ?? evento.faseNome,
      faseCor: fase?.cor ?? "#64748b",
      entrouEm: new Date(evento.entradaEm),
      saiuEm: proximo ? new Date(proximo.entradaEm) : undefined,
    };
  });
}

export function PhaseHistory({
  historico,
  fases,
  onEditarVisualizacao,
}: {
  historico: EventoHistorico[];
  fases: Fase[];
  onEditarVisualizacao: () => void;
}) {
  const itens = derivarHistoricoItens(historico, fases);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-bold tracking-tight text-slate-900">Histórico</h3>

      {itens.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum histórico ainda.</p>
      ) : (
        <ul className="relative flex flex-col gap-3 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-linear-to-b before:from-slate-200 before:via-slate-300/80 before:to-slate-200">
          {itens.map((item, i) => (
            <li
              key={`${item.faseId}-${item.entrouEm.toISOString()}-${i}`}
              className="relative flex flex-col gap-1 pl-7"
            >
              {/* marcador na cor da fase (só visual) */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-white"
                style={{ backgroundColor: item.faseCor, boxShadow: `0 0 0 1px ${item.faseCor}55, 0 0 8px ${item.faseCor}66` }}
              />
              <span
                className="w-fit rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap"
                style={{
                  backgroundColor: `color-mix(in srgb, ${item.faseCor} 14%, white)`,
                  color: `color-mix(in srgb, ${item.faseCor} 66%, #0f172a)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${item.faseCor} 24%, transparent)`,
                }}
              >
                {item.faseNome}
              </span>
              <span className="text-xs text-slate-500">
                {duracaoEntre(item.entrouEm, item.saiuEm ?? new Date())}
              </span>
              <span className="text-xs text-slate-400">
                {dataCurta(item.entrouEm)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onEditarVisualizacao}
        className={`flex w-fit items-center gap-1 self-start ${LINK_ACAO}`}
      >
        <Plus size={12} />
        Editar visualização do card
      </button>
    </div>
  );
}
