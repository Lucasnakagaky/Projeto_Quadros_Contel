import { EventoHistorico, Fase } from "@/lib/types";
import { dataCurta, duracaoEntre } from "@/lib/utils";

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
}: {
  historico: EventoHistorico[];
  fases: Fase[];
}) {
  const itens = derivarHistoricoItens(historico, fases);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-bold text-slate-900">Histórico</h3>

      {itens.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum histórico ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((item, i) => (
            <li
              key={`${item.faseId}-${item.entrouEm.toISOString()}-${i}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-col items-start gap-1">
                <span
                  className="w-fit rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap"
                  style={{ backgroundColor: `${item.faseCor}1f`, color: item.faseCor }}
                >
                  {item.faseNome}
                </span>
                <span className="text-xs text-slate-400">
                  {duracaoEntre(item.entrouEm, item.saiuEm ?? new Date())}
                </span>
              </div>

              <span className="shrink-0 text-xs font-bold text-slate-600">
                {dataCurta(item.entrouEm)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
