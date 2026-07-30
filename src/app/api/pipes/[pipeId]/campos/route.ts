import { NextResponse } from "next/server";
import { createCampo, listCamposByPipe } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";
import { CampoConfig, TipoCampo } from "@/lib/types";

type Ctx = { params: Promise<{ pipeId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const campos = await listCamposByPipe(pipeId);
    return NextResponse.json(campos);
  } catch (err) {
    return handleError(err);
  }
}

type Body = {
  tipo?: TipoCampo;
  titulo?: string;
  obrigatorio?: boolean;
  descricao?: string;
  textoAjuda?: string;
  visualizacaoCompacta?: boolean;
  config?: CampoConfig;
};

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { pipeId } = await params;
    const body = await readJson<Body>(req);
    if (!body.tipo) {
      const err = new Error("Tipo do campo é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    if (!body.titulo || !body.titulo.trim()) {
      const err = new Error("Título do campo é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const campo = await createCampo(pipeId, {
      tipo: body.tipo,
      titulo: body.titulo,
      obrigatorio: body.obrigatorio,
      descricao: body.descricao,
      textoAjuda: body.textoAjuda,
      visualizacaoCompacta: body.visualizacaoCompacta,
      config: body.config,
    });
    return NextResponse.json(campo, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
