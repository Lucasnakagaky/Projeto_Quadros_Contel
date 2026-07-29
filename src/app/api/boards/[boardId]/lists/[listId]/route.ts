import { NextResponse } from "next/server";
import { deleteList, renameList } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string; listId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { listId } = await params;
    const body = await readJson<{ nome?: string }>(req);
    if (!body.nome || !body.nome.trim()) {
      const err = new Error("Nome da lista é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const lista = await renameList(listId, body.nome);
    return NextResponse.json(lista);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { listId } = await params;
    await deleteList(listId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
