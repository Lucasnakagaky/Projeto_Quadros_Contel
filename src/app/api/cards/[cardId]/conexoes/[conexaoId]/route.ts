import { NextResponse } from "next/server";
import { removeConexao } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string; conexaoId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { conexaoId } = await params;
    await removeConexao(conexaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
