import { NextResponse } from "next/server";
import { CampoPatch, deleteCampo, updateCampo } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string; campoId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { campoId } = await params;
    const body = await readJson<CampoPatch>(req);
    const campo = await updateCampo(campoId, body);
    return NextResponse.json(campo);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { campoId } = await params;
    await deleteCampo(campoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
