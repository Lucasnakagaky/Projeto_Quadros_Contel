import { NextResponse } from "next/server";
import { reorderFases } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const body = await readJson<{ orderedIds: string[] }>(req);
    const fases = await reorderFases(pipeId, body.orderedIds);
    return NextResponse.json(fases);
  } catch (err) {
    return handleError(err);
  }
}
