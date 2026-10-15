"use client";

import { ExternalLink, MoreVertical } from "lucide-react";
import { FOCO } from "./estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChipOptionsMenu({ onAbrirCard }: { onAbrirCard: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`cursor-pointer rounded p-1 text-slate-400 transition-colors duration-(--duracao-rapida) hover:bg-indigo-50 hover:text-indigo-700 ${FOCO}`}
          aria-label="Mais opções"
        >
          <MoreVertical size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onAbrirCard}>
          <ExternalLink size={14} />
          Abrir card
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
