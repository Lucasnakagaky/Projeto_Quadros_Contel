import { NextResponse } from "next/server";
import { deleteChecklist } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ checklistId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { checklistId } = await params;
    await deleteChecklist(checklistId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
