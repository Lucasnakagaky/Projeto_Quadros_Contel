import { NextResponse } from "next/server";
import { createConexaoComCardExistente, createConexaoComNovoCard } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ cardId: string }> };

type Body = {
  campoId: string;
  modo: "criar" | "existente";
  pipeId?: string;
  faseId?: string;
  titulo?: string;
  valoresCampos?: Record<string, unknown>;
  cardFilhoId?: string;
};

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const body = await readJson<Body>(req);

    if (!body.campoId) {
      const err = new Error("Campo de conexão é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }

    if (body.modo === "existente") {
      if (!body.cardFilhoId) {
        const err = new Error("Selecione um card para conectar");
        (err as Error & { status?: number }).status = 400;
        throw err;
      }
      const conexao = await createConexaoComCardExistente(body.campoId, cardId, body.cardFilhoId);
      return NextResponse.json({ conexao }, { status: 201 });
    }

    if (!body.pipeId || !body.faseId || !body.titulo || !body.titulo.trim()) {
      const err = new Error("Título e fase são obrigatórios para criar o card filho");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const result = await createConexaoComNovoCard(body.campoId, cardId, {
      pipeId: body.pipeId,
      faseId: body.faseId,
      titulo: body.titulo,
      valoresCampos: body.valoresCampos,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
