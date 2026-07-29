import { NextResponse } from "next/server";
import { deleteBoard, getBoard, updateBoard } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const board = await getBoard(boardId);
    return NextResponse.json(board);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const body = await readJson<{
      nome?: string;
      descricao?: string;
      cor?: string;
      arquivado?: boolean;
    }>(req);
    const board = await updateBoard(boardId, body);
    return NextResponse.json(board);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    await deleteBoard(boardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
