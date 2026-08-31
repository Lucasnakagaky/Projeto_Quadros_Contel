"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de pesquisa do quadro (Kanban) e da Lista — filtra os cards por título ou nome de etiqueta.
 * É controlado por quem monta (pipe-board), porque o mesmo estado também é
 * alimentado pelo clique numa etiqueta do card.
 */
export function CardsFiltro({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-56 md:w-64">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <Input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        aria-label="Pesquisar cards ou etiquetas"
        placeholder="Pesquisar cards ou etiquetas..."
        className={cn("pl-8", valor && "pr-9")}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar filtro"
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
