import { NextResponse } from "next/server";
import { createLabel, listLabelsByPipe } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";
import { CORES_ETIQUETA } from "@/lib/types";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const etiquetas = await listLabelsByPipe(pipeId);
    return NextResponse.json(etiquetas);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const body = await readJson<{ nome?: string; cor?: string }>(req);
    if (!body.nome || !body.nome.trim()) {
      const err = new Error("Nome da etiqueta é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const etiqueta = await createLabel(pipeId, body.nome, body.cor ?? CORES_ETIQUETA[0]);
    return NextResponse.json(etiqueta, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
