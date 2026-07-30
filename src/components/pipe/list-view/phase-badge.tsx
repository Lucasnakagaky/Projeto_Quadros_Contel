import { Fase } from "@/lib/types";

export function PhaseBadge({ fase }: { fase: Fase | undefined }) {
  if (!fase) return <span className="text-sm text-slate-400">Vazio</span>;
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: `${fase.cor}1f`, color: fase.cor }}
    >
      {fase.nome}
    </span>
  );
}
