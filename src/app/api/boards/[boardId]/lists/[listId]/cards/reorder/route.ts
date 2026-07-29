import { NextResponse } from "next/server";
import { reorderCardsWithinList } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string; listId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { listId } = await params;
    const body = await readJson<{ orderedIds: string[] }>(req);
    await reorderCardsWithinList(listId, body.orderedIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
