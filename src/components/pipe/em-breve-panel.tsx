import { Sparkles } from "lucide-react";

export function EmBrevePanel({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="gdt-painel gdt-painel-luz flex flex-col items-center gap-3 px-12 py-10 text-slate-500">
        {/* Halo suave atrás do ícone (decorativo). */}
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-violet-100 text-(--gdt-acento-2) shadow-[0_10px_24px_-12px_var(--gdt-acento-glow),inset_0_1px_0_rgb(255_255_255/0.8),0_0_0_1px_rgb(165_180_252/0.4)]">
          <Sparkles size={26} />
        </span>
        <p className="text-sm font-semibold text-slate-600">{titulo} — em breve</p>
      </div>
    </div>
  );
}
