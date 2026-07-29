import { NextResponse } from "next/server";

export function handleError(err: unknown) {
  const status = (err as { status?: number })?.status ?? 500;
  const message = err instanceof Error ? err.message : "Erro inesperado";
  if (status === 500) {
    console.error(err);
  }
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    const err = new Error("Corpo da requisição inválido");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
}
