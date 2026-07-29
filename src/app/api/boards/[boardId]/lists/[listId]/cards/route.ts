import { NextResponse } from "next/server";
import { createCard } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string; listId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { listId } = await params;
    const body = await readJson<{ titulo?: string; descricao?: string }>(req);
    if (!body.titulo || !body.titulo.trim()) {
      const err = new Error("Título do card é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const card = await createCard({
      listId,
      titulo: body.titulo,
      descricao: body.descricao,
    });
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
