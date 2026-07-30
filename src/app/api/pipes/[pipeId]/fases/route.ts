import { NextResponse } from "next/server";
import { createFase, listFasesByPipe } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const fases = await listFasesByPipe(pipeId);
    return NextResponse.json(fases);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const body = await readJson<{ nome?: string; ehFinal?: boolean; permiteCriarCards?: boolean }>(req);
    if (!body.nome || !body.nome.trim()) {
      const err = new Error("Nome da fase é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const fase = await createFase(pipeId, {
      nome: body.nome,
      ehFinal: body.ehFinal,
      permiteCriarCards: body.permiteCriarCards,
    });
    return NextResponse.json(fase, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
