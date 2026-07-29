import { NextResponse } from "next/server";
import { addComment, listCommentsByCard } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const comentarios = await listCommentsByCard(cardId);
    return NextResponse.json(comentarios);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<{ texto?: string }>(req);
    if (!body.texto || !body.texto.trim()) {
      const err = new Error("Comentário vazio");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const comentario = await addComment(cardId, body.texto);
    return NextResponse.json(comentario, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
