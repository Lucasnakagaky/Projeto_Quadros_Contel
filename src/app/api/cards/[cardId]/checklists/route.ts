import { NextResponse } from "next/server";
import { createChecklist } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<{ titulo?: string }>(req);
    const checklist = await createChecklist(cardId, body.titulo ?? "Checklist");
    return NextResponse.json(checklist, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
