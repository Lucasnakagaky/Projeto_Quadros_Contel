import { NextResponse } from "next/server";
import { deleteComment } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ commentId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { commentId } = await params;
    await deleteComment(commentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
