import { NextResponse } from "next/server";
import { toggleCardPredecessor } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string; predecessorId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { cardId, predecessorId } = await params;
    const card = await toggleCardPredecessor(cardId, predecessorId);
    return NextResponse.json(card);
  } catch (err) {
    return handleError(err);
  }
}
