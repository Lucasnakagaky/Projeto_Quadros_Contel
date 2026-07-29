import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const db = await readDb();
    const board = db.boards.find((b) => b.id === boardId);
    if (!board) {
      return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 });
    }
    const listas = db.listas
      .filter((l) => l.boardId === boardId)
      .sort((a, b) => a.ordem - b.ordem);
    const cards = db.cards
      .filter((c) => c.boardId === boardId)
      .sort((a, b) => a.ordem - b.ordem);
    const etiquetas = db.etiquetas.filter((e) => e.boardId === boardId);
    const membros = db.usuarios.filter((u) => board.membroIds.includes(u.id));

    return NextResponse.json({ board, listas, cards, etiquetas, membros });
  } catch (err) {
    return handleError(err);
  }
}
