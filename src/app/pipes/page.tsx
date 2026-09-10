import Link from "next/link";
import { Plus } from "lucide-react";
import { listPipesComContagem } from "@/lib/store";
import { PipesList } from "@/components/pipe/pipes-list";
import { Button } from "@/components/ui/button";

export default async function PipesPage() {
  const pipesComContagem = await listPipesComContagem();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Pipes</h1>
          <p className="text-sm text-slate-500">Gerencie seus processos com pipes estilo Kanban</p>
        </div>
        <Link href="/pipes/new">
          <Button>
            <Plus size={16} />
            Novo Pipe
          </Button>
        </Link>
      </div>

      {pipesComContagem.length === 0 ? (
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
        <PipesList initialPipes={pipesComContagem} />
      )}
    </div>
  );
}
