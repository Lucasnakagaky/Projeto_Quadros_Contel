import { EventoHistorico } from "@/lib/types";
import { tempoRelativo } from "@/lib/utils";

export function HistoricoSection({ historico }: { historico: EventoHistorico[] }) {
  const ordenado = [...historico].sort((a, b) => (a.entradaEm < b.entradaEm ? 1 : -1));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-500">Histórico</span>
      <ul className="flex flex-col gap-2 border-l border-slate-200 pl-3">
        {ordenado.map((evento) => (
          <li key={evento.id} className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{evento.faseNome}</span>
            {" — "}
            <span className="text-slate-400">{tempoRelativo(evento.entradaEm)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
