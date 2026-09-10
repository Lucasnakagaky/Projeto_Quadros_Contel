"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listPipesComContagem } from "@/lib/store";
import { PipesList } from "@/components/pipe/pipes-list";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

type ItemPipe = Awaited<ReturnType<typeof listPipesComContagem>>[number];

export default function PipesPage() {
  const { session, sair } = useAuth();
  const [pipes, setPipes] = useState<ItemPipe[] | null>(null);

  useEffect(() => {
    if (!session) return;
    listPipesComContagem().then(setPipes);
  }, [session]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Pipes</h1>
          <p className="text-sm text-slate-500">Gerencie seus processos com pipes estilo Kanban</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pipes/new">
            <Button>
              <Plus size={16} />
              Novo Pipe
            </Button>
          </Link>
          <Button variant="ghost" onClick={sair}>
            Sair
          </Button>
        </div>
      </div>

      {pipes === null ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : pipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="text-slate-500">Você ainda não tem nenhum pipe.</p>
          <Link href="/pipes/new" className="mt-4">
            <Button>
              <Plus size={16} />
              Criar meu primeiro pipe
            </Button>
          </Link>
        </div>
      ) : (
        <PipesList initialPipes={pipes} />
      )}
    </div>
  );
}
