import { NextResponse } from "next/server";
import { addBoardMember, getBoard, removeBoardMember } from "@/lib/store";
import { readDb } from "@/lib/db";
import { handleError, readJson } from "@/lib/api-utils";

type Ctx = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const board = await getBoard(boardId);
    const db = await readDb();
    const membros = db.usuarios.filter((u) => board.membroIds.includes(u.id));
    return NextResponse.json({ board, membros });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const body = await readJson<{ nome?: string; email?: string }>(req);
    if (!body.email || !body.email.trim()) {
      const err = new Error("E-mail é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const usuario = await addBoardMember(boardId, {
      nome: body.nome?.trim() || body.email.split("@")[0],
      email: body.email,
    });
    return NextResponse.json(usuario, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { boardId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      const err = new Error("userId é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    await removeBoardMember(boardId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
