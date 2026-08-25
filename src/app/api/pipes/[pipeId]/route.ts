import { NextResponse } from "next/server";
import { deletePipe, PipePatch, updatePipe } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const body = await readJson<PipePatch>(req);
    const pipe = await updatePipe(pipeId, body);
    return NextResponse.json(pipe);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    await deletePipe(pipeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
