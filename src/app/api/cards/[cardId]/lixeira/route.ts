import { NextResponse } from "next/server";
import { trashCard } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const card = await trashCard(cardId);
    return NextResponse.json(card);
  } catch (err) {
    return handleError(err);
  }
}
