import Link from "next/link";
import { Plus } from "lucide-react";
import { readDb } from "@/lib/db";
import { PipeCard } from "@/components/pipe/pipe-card";
import { Button } from "@/components/ui/button";

export default async function PipesPage() {
  const db = await readDb();
  const pipes = [...db.pipes].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

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

      {pipes.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipes.map((pipe) => {
            const faseCount = db.fases.filter((f) => f.pipeId === pipe.id).length;
            return <PipeCard key={pipe.id} pipe={pipe} faseCount={faseCount} />;
          })}
        </div>
      )}
    </div>
  );
}
