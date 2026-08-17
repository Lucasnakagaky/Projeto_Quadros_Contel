import { NextResponse } from "next/server";
import {
  CardPatch,
  getCard,
  listCardLinksByCard,
  listConexoesFilhos,
  listConexoesPais,
  permanentDeleteCard,
  updateCard,
} from "@/lib/store";
import { readDb } from "@/lib/db";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const card = await getCard(cardId);
    const db = await readDb();

    const pipe = db.pipes.find((p) => p.id === card.pipeId);
    const fases = db.fases.filter((f) => f.pipeId === card.pipeId).sort((a, b) => a.ordem - b.ordem);
    const campos = db.campos.filter((c) => c.pipeId === card.pipeId).sort((a, b) => a.ordem - b.ordem);
    const etiquetas = db.etiquetas.filter((e) => e.pipeId === card.pipeId);
    const checklists = db.checklists.filter((c) => c.cardId === cardId);
    const comentarios = db.comentarios
      .filter((c) => c.cardId === cardId)
      .sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1));
    const anexos = db.anexos.filter((a) => a.cardId === cardId);
    const conexoesFilhos = await listConexoesFilhos(cardId);
    const conexoesPais = await listConexoesPais(cardId);
    const cardLinks = await listCardLinksByCard(cardId);

    return NextResponse.json({
      card,
      pipe,
      fases,
      campos,
      etiquetas,
      usuarios: db.usuarios,
      checklists,
      comentarios,
      anexos,
      conexoesFilhos,
      conexoesPais,
      cardLinks,
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
    await permanentDeleteCard(cardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
