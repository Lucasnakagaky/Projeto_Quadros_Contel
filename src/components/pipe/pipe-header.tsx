"use client";

import { AppLink as Link } from "@/components/ui/app-link";
import { ArrowLeft, LogOut, Settings2, Tag, Trash2 } from "lucide-react";
import { Pipe } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";

// Ações do cabeçalho: abaixo de `lg` só o ícone aparece (o texto some, mas o nome acessível
// continua via aria-label, que é o que os testes e leitores de tela usam).
const ACAO =
  "gdt-focus flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-[background-color,color,box-shadow] duration-(--duracao-rapida) hover:bg-white/80 hover:text-indigo-700 hover:shadow-(--gdt-sombra-1) cursor-pointer";

export function PipeHeader({
  pipe,
  onAbrirCampos,
  onAbrirEtiquetas,
}: {
  pipe: Pipe;
  onAbrirCampos: () => void;
  onAbrirEtiquetas: () => void;
}) {
  const { sair } = useAuth();
  return (
    <header className="gdt-barra mx-4 mt-3 flex shrink-0 items-center gap-1 px-4 py-2.5 sm:gap-2">
      <Link
        href="/pipes"
        className="gdt-focus mr-1 rounded-xl p-2 text-slate-400 transition-colors duration-(--duracao-rapida) hover:bg-white/80 hover:text-indigo-700"
        aria-label="Voltar aos pipes"
      >
        <ArrowLeft size={18} />
      </Link>

      <h1 className="mr-auto truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
        {pipe.nome}
      </h1>

      <button
        onClick={onAbrirCampos}
        className={ACAO}
        aria-label="Campos do formulário"
        title="Campos do formulário"
      >
        <Settings2 size={15} />
        <span className="hidden lg:inline">Campos do formulário</span>
      </button>

      <button
        onClick={onAbrirEtiquetas}
        className={ACAO}
        aria-label="Gerenciar etiquetas"
        title="Gerenciar etiquetas"
      >
        <Tag size={15} />
        <span className="hidden lg:inline">Gerenciar etiquetas</span>
      </button>

      <Link
        href={`/pipes/lixeira?id=${pipe.id}`}
        className={ACAO}
        aria-label="Lixeira"
        title="Lixeira"
      >
        <Trash2 size={15} />
        <span className="hidden lg:inline">Lixeira</span>
      </Link>

      <button onClick={sair} className={ACAO} aria-label="Sair" title="Sair">
        <LogOut size={15} />
        <span className="hidden lg:inline">Sair</span>
      </button>
    </header>
  );
}
