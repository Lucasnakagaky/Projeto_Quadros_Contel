import { NextResponse } from "next/server";
import { moveCard } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<{ listId: string; index: number }>(req);
    await moveCard(cardId, body.listId, body.index);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
