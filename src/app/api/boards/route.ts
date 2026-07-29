import { NextResponse } from "next/server";
import { createBoard, listBoards } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";
import { CORES_QUADRO } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const arquivado = searchParams.get("arquivado") === "true";
    const boards = await listBoards(arquivado);
    return NextResponse.json(boards);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ nome?: string; descricao?: string; cor?: string }>(
      req
    );
    if (!body.nome || !body.nome.trim()) {
      const err = new Error("Nome do quadro é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const board = await createBoard({
      nome: body.nome,
      descricao: body.descricao ?? "",
      cor: body.cor ?? CORES_QUADRO[0],
    });
    return NextResponse.json(board, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
