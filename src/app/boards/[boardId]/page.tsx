import { notFound } from "next/navigation";
import { Suspense } from "react";
import { readDb, CURRENT_USER_ID } from "@/lib/db";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const db = await readDb();
  const board = db.boards.find((b) => b.id === boardId);
  if (!board) notFound();

  const listas = db.listas
    .filter((l) => l.boardId === boardId)
    .sort((a, b) => a.ordem - b.ordem);
  const cards = db.cards
    .filter((c) => c.boardId === boardId)
    .sort((a, b) => a.ordem - b.ordem);
  const etiquetas = db.etiquetas.filter((e) => e.boardId === boardId);
  const membros = db.usuarios.filter((u) => board.membroIds.includes(u.id));
  const currentUser =
    db.usuarios.find((u) => u.id === CURRENT_USER_ID) ?? db.usuarios[0];

  return (
    <Suspense fallback={null}>
      <KanbanBoard
        boardInicial={board}
        listasIniciais={listas}
        cardsIniciais={cards}
        etiquetasIniciais={etiquetas}
        membrosIniciais={membros}
        currentUser={currentUser}
      />
    </Suspense>
  );
}
