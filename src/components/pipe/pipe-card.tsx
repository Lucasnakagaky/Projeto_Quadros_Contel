"use client";

import { AppLink as Link } from "@/components/ui/app-link";
import { Boxes, LayoutGrid, MoreVertical, Pencil, Trash2, Workflow } from "lucide-react";
import { Pipe, CORES_FASE } from "@/lib/types";
import { corDeterministica } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PipeCard({
  pipe,
  faseCount,
  cardCount,
  onEdit,
  onRequestDelete,
}: {
  pipe: Pipe;
  faseCount: number;
  cardCount: number;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  const cor = corDeterministica(pipe.id, CORES_FASE);

  return (
    <Link
      href={`/pipes/quadro?id=${pipe.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-1.5 shrink-0" style={{ backgroundColor: cor }} />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${cor}1f`, color: cor }}
          >
            <Boxes size={18} />
          </span>
          <h3 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{pipe.nome}</h3>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Ações do pipe ${pipe.nome}`}
              >
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil size={14} />
                Editar Pipe
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onRequestDelete}
                className="text-red-600 data-[highlighted]:bg-red-50"
              >
                <Trash2 size={14} />
                Excluir Pipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <Workflow size={13} className="text-slate-400" />
            {faseCount} {faseCount === 1 ? "fase" : "fases"}
          </span>
          <span className="flex items-center gap-1">
            <LayoutGrid size={13} className="text-slate-400" />
            {cardCount} {cardCount === 1 ? "card" : "cards"}
          </span>
        </div>
      </div>
    </Link>
  );
}
