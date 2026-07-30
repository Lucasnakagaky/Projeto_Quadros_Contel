import { NextResponse } from "next/server";
import { reorderCardsWithinFase } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string; faseId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { faseId } = await params;
    const body = await readJson<{ orderedIds: string[] }>(req);
    await reorderCardsWithinFase(faseId, body.orderedIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
