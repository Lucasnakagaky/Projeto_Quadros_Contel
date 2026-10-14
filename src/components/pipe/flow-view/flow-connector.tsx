/**
 * Linha entre duas fases. `de`/`para` (cores das fases ligadas) só tingem a linha com um
 * gradiente sutil; sem elas, usa o cinza neutro de antes. Continua sendo um <div>, sem SVG.
 */
export function FlowConnector({ de, para }: { de?: string; para?: string }) {
  const fundo =
    de && para
      ? `linear-gradient(90deg, color-mix(in srgb, ${de} 60%, white), color-mix(in srgb, ${para} 60%, white))`
      : undefined;
  return (
    <div className="flex w-10 shrink-0 items-center self-center">
      <div
        className="h-0.5 w-full rounded-full bg-slate-300"
        style={
          fundo
            ? {
                background: fundo,
                // glow mínimo na cor da fase de destino
                boxShadow: `0 0 8px -1px color-mix(in srgb, ${para} calc(50% * var(--gdt-glow)), transparent)`,
              }
            : undefined
        }
      />
    </div>
  );
}
