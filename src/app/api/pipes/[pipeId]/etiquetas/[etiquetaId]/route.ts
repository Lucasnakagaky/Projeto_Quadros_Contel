import { NextResponse } from "next/server";
import { deleteLabel, updateLabel } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string; etiquetaId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { etiquetaId } = await params;
    const body = await readJson<{ nome?: string; cor?: string }>(req);
    if (body.nome !== undefined && !body.nome.trim()) {
      const err = new Error("Nome da etiqueta é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const etiqueta = await updateLabel(etiquetaId, body);
    return NextResponse.json(etiqueta);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { etiquetaId } = await params;
    await deleteLabel(etiquetaId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
