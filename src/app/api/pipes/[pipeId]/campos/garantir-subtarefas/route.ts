import { NextResponse } from "next/server";
import { ensureConexaoPipeCampo } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const campo = await ensureConexaoPipeCampo(pipeId);
    return NextResponse.json(campo);
  } catch (err) {
    return handleError(err);
  }
}
