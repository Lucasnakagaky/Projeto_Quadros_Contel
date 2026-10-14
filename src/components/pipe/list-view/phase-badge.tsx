import { Fase } from "@/lib/types";

export function PhaseBadge({ fase }: { fase: Fase | undefined }) {
  if (!fase) return <span className="text-sm text-slate-400">Vazio</span>;
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      // Texto escurecido a partir da cor da fase (cores claras perdem contraste sobre a tinta).
      style={{
        backgroundColor: `${fase.cor}1f`,
        color: `color-mix(in srgb, ${fase.cor} 66%, #0f172a)`,
      }}
    >
      {/* Ponto com halo curto na cor da fase — único "neon" da linha. */}
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: fase.cor, boxShadow: `0 0 6px ${fase.cor}99` }}
      />
      {fase.nome}
    </span>
  );
}
