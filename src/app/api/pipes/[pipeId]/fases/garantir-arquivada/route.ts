import { NextResponse } from "next/server";
import { ensureFaseArquivada } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const fase = await ensureFaseArquivada(pipeId);
    return NextResponse.json(fase);
  } catch (err) {
    return handleError(err);
  }
}
