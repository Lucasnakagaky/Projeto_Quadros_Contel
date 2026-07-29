import Link from "next/link";
import { Board } from "@/lib/types";

export function BoardCard({
  board,
  listCount,
}: {
  board: Board;
  listCount: number;
}) {
  return (
    <Link
      href={`/boards/${board.id}`}
      className="group flex h-40 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className="flex h-16 shrink-0 items-center px-4"
        style={{ backgroundColor: board.cor }}
      >
        <h3 className="truncate font-semibold text-white">{board.nome}</h3>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <p className="line-clamp-2 text-sm text-slate-500">
          {board.descricao || "Sem descrição"}
        </p>
        <span className="text-xs font-medium text-slate-400">
          {listCount} {listCount === 1 ? "lista" : "listas"}
        </span>
      </div>
    </Link>
  );
}
