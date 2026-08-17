import { NextResponse } from "next/server";
import { removeCardLink } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string; linkId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { linkId } = await params;
    await removeCardLink(linkId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
