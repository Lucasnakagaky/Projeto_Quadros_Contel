import { NextResponse } from "next/server";
import { deleteFase, FasePatch, updateFase } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string; faseId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { faseId } = await params;
    const body = await readJson<FasePatch>(req);
    const fase = await updateFase(faseId, body);
    return NextResponse.json(fase);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { faseId } = await params;
    await deleteFase(faseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
