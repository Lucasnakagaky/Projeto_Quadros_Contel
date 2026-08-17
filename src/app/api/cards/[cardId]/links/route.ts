import { NextResponse } from "next/server";
import { createCardLinks } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

type Body = {
  campoId: string;
  targetIds: string[];
};

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<Body>(req);

    if (!body.campoId) {
      const err = new Error("Campo de vinculação é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    if (!Array.isArray(body.targetIds) || body.targetIds.length === 0) {
      const err = new Error("Selecione ao menos um card para vincular");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }

    const links = await createCardLinks(body.campoId, cardId, body.targetIds);
    return NextResponse.json(links, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
