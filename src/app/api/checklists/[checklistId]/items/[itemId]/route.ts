import { NextResponse } from "next/server";
import { deleteChecklistItem, toggleChecklistItem } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ checklistId: string; itemId: string }> };

export async function PATCH(_req: Request, { params }: Ctx) {
  try {
    const { checklistId, itemId } = await params;
    const checklist = await toggleChecklistItem(checklistId, itemId);
    return NextResponse.json(checklist);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { checklistId, itemId } = await params;
    const checklist = await deleteChecklistItem(checklistId, itemId);
    return NextResponse.json(checklist);
  } catch (err) {
    return handleError(err);
  }
}
