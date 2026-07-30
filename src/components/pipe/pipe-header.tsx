"use client";

import Link from "next/link";
import { ArrowLeft, Settings2, Trash2 } from "lucide-react";
import { Pipe } from "@/lib/types";

export function PipeHeader({
  pipe,
  onAbrirCampos,
}: {
  pipe: Pipe;
  onAbrirCampos: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
      <Link
        href="/pipes"
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Voltar aos pipes"
      >
        <ArrowLeft size={18} />
      </Link>

      <h1 className="mr-auto truncate text-lg font-bold text-slate-900">{pipe.nome}</h1>

      <button
        onClick={onAbrirCampos}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        <Settings2 size={14} />
        Campos do formulário
      </button>

      <Link
        href={`/pipes/${pipe.id}/lixeira`}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        <Trash2 size={14} />
        Lixeira
      </Link>
    </header>
  );
}
