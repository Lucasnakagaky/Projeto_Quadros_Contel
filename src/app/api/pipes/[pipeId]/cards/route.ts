import { NextResponse } from "next/server";
import { createCard, listCardsByPipe } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const cards = await listCardsByPipe(pipeId);
    return NextResponse.json(cards);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const body = await readJson<{ faseId?: string; titulo?: string }>(req);
    if (!body.faseId) {
      const err = new Error("Fase é obrigatória");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const card = await createCard({
      pipeId,
      faseId: body.faseId,
      titulo: body.titulo ?? "Novo card",
    });
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
