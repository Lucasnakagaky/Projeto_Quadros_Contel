import { NextResponse } from "next/server";
import { createList, reorderLists } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const body = await readJson<{ nome?: string }>(req);
    if (!body.nome || !body.nome.trim()) {
      const err = new Error("Nome da lista é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const lista = await createList(boardId, body.nome);
    return NextResponse.json(lista, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const body = await readJson<{ orderedIds: string[] }>(req);
    const listas = await reorderLists(boardId, body.orderedIds);
    return NextResponse.json(listas);
  } catch (err) {
    return handleError(err);
  }
}
