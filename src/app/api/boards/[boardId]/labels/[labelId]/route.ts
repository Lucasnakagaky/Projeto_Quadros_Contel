import { NextResponse } from "next/server";
import { deleteLabel } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string; labelId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { labelId } = await params;
    await deleteLabel(labelId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
