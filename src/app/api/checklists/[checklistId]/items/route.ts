import { NextResponse } from "next/server";
import { addChecklistItem } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ checklistId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { checklistId } = await params;
    const body = await readJson<{ texto?: string }>(req);
    if (!body.texto || !body.texto.trim()) {
      const err = new Error("Texto do item é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const checklist = await addChecklistItem(checklistId, body.texto);
    return NextResponse.json(checklist, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
