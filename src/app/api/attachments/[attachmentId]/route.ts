import { NextResponse } from "next/server";
import { deleteAttachment } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ attachmentId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { attachmentId } = await params;
    await deleteAttachment(attachmentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
