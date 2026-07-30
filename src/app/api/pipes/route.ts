import { NextResponse } from "next/server";
import { createPipe, listPipes } from "@/lib/store";
import { handleError, readJson } from "@/lib/api-utils";

export async function GET() {
  try {
    const pipes = await listPipes();
    return NextResponse.json(pipes);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ nome?: string }>(req);
    if (!body.nome || !body.nome.trim()) {
      const err = new Error("Nome do pipe é obrigatório");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    const pipe = await createPipe(body.nome);
    return NextResponse.json(pipe, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
