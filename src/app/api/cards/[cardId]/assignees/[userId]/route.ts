import { NextResponse } from "next/server";
import { toggleCardAssignee } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string; userId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { cardId, userId } = await params;
    const card = await toggleCardAssignee(cardId, userId);
    return NextResponse.json(card);
  } catch (err) {
    return handleError(err);
  }
}
