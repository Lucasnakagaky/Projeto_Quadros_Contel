import { NextResponse } from "next/server";
import {
  CardPatch,
  getCard,
  getPipe,
  listAttachmentsByCard,
  listCamposByPipe,
  listCardLinksByCard,
  listChecklistsByCard,
  listCommentsByCard,
  listConexoesFilhos,
  listConexoesPais,
  listFasesByPipe,
  listLabelsByPipe,
  listUsers,
  permanentDeleteCard,
  updateCard,
} from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const card = await getCard(cardId);

    const [
      pipe,
      fases,
      campos,
      etiquetas,
      usuarios,
      checklists,
      comentarios,
      anexos,
      conexoesFilhos,
      conexoesPais,
      cardLinks,
    ] = await Promise.all([
      getPipe(card.pipeId),
      listFasesByPipe(card.pipeId),
      listCamposByPipe(card.pipeId),
      listLabelsByPipe(card.pipeId),
      listUsers(),
      listChecklistsByCard(cardId),
      listCommentsByCard(cardId),
      listAttachmentsByCard(cardId),
      listConexoesFilhos(cardId),
      listConexoesPais(cardId),
      listCardLinksByCard(cardId),
    ]);

    return NextResponse.json({
      card,
      pipe,
      fases,
      campos,
      etiquetas,
      usuarios,
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
