import Link from "next/link";
import { Plus, Archive } from "lucide-react";
import { readDb } from "@/lib/db";
import { BoardCard } from "@/components/boards/board-card";
import { Button } from "@/components/ui/button";

export default async function BoardsPage() {
  const db = await readDb();
  const boards = db.boards
    .filter((b) => !b.arquivado)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Quadros</h1>
          <p className="text-sm text-slate-500">
            Gerencie seus projetos e tarefas com quadros Kanban
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/boards/archived">
            <Button variant="outline">
              <Archive size={16} />
              Ver Arquivados
            </Button>
          </Link>
          <Link href="/boards/new">
            <Button>
              <Plus size={16} />
              Novo Quadro
            </Button>
          </Link>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="text-slate-500">Você ainda não tem nenhum quadro.</p>
          <Link href="/boards/new" className="mt-4">
            <Button>
              <Plus size={16} />
              Criar meu primeiro quadro
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const listCount = db.listas.filter((l) => l.boardId === board.id).length;
            return <BoardCard key={board.id} board={board} listCount={listCount} />;
          })}
        </div>
      )}
    </div>
  );
}
