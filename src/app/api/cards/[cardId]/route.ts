import { NextResponse } from "next/server";
import { deleteCard, getCard, updateCard, CardPatch } from "@/lib/store";
import { readDb } from "@/lib/db";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const card = await getCard(cardId);
    const db = await readDb();
    const checklists = db.checklists.filter((c) => c.cardId === cardId);
    const comentarios = db.comentarios
      .filter((c) => c.cardId === cardId)
      .sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1));
    const anexos = db.anexos.filter((a) => a.cardId === cardId);
    const etiquetas = db.etiquetas.filter((e) => e.boardId === card.boardId);
    const membros = db.usuarios.filter((u) => {
      const board = db.boards.find((b) => b.id === card.boardId);
      return board?.membroIds.includes(u.id);
    });
    const listas = db.listas
      .filter((l) => l.boardId === card.boardId)
      .sort((a, b) => a.ordem - b.ordem);
    const predecessores = db.cards.filter((c) => card.predecessorIds.includes(c.id));
    const candidatosPredecessores = db.cards.filter(
      (c) => c.boardId === card.boardId && c.id !== card.id
    );

    return NextResponse.json({
      card,
      checklists,
      comentarios,
      anexos,
      etiquetas,
      membros,
      listas,
      predecessores,
      candidatosPredecessores,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<CardPatch>(req);
    const card = await updateCard(cardId, body);
    return NextResponse.json(card);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    await deleteCard(cardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
