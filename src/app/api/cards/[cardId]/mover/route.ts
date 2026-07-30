import { NextResponse } from "next/server";
import { moveCard } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<{ faseId: string; index: number }>(req);
    const card = await moveCard(cardId, body.faseId, body.index);
    return NextResponse.json(card);
  } catch (err) {
    return handleError(err);
  }
}
