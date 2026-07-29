import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { readDb } from "@/lib/db";
import { ArchivedBoardCard } from "@/components/boards/archived-board-card";

export default async function ArchivedBoardsPage() {
  const db = await readDb();
  const boards = db.boards
    .filter((b) => b.arquivado)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8">
        <Link
          href="/boards"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Voltar aos meus quadros
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Quadros Arquivados</h1>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="text-slate-500">Nenhum quadro arquivado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const listCount = db.listas.filter((l) => l.boardId === board.id).length;
            return (
              <ArchivedBoardCard key={board.id} board={board} listCount={listCount} />
            );
          })}
        </div>
      )}
    </div>
  );
}
