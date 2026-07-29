import { NextResponse } from "next/server";
import { toggleCardLabel } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string; labelId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { cardId, labelId } = await params;
    const card = await toggleCardLabel(cardId, labelId);
    return NextResponse.json(card);
  } catch (err) {
    return handleError(err);
  }
}
