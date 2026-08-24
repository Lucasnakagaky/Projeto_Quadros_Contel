import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { addAttachment, listAttachmentsByCard } from "@/lib/store";
import { handleError } from "@/lib/api-utils";
import { baixarImagemRemota } from "@/lib/fetch-remote-image";

type Ctx = { params: Promise<{ cardId: string }> };

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const anexos = await listAttachmentsByCard(cardId);
    return NextResponse.json(anexos);
  } catch (err) {
    return handleError(err);
  }
}

async function salvarBufferComoAnexo(
  cardId: string,
  buffer: Buffer,
  nome: string,
  tipo: string
) {
  const cardDir = path.join(UPLOADS_DIR, cardId);
  await fs.mkdir(cardDir, { recursive: true });

  const ext = path.extname(nome);
  const safeName = `${uuid()}${ext}`;
  await fs.writeFile(path.join(cardDir, safeName), buffer);

  return addAttachment({
    cardId,
    nome,
    tipo,
    tamanho: buffer.byteLength,
    url: `/uploads/${cardId}/${safeName}`,
  });
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const contentType = req.headers.get("content-type") ?? "";

    // Imagem embutida no HTML colado como URL remota (http/https) — baixada e re-hospedada
    // server-side (ver src/lib/fetch-remote-image.ts: fetch() do navegador não serve aqui
    // porque a maioria dos hosts reais não envia CORS permissivo pra imagens). Reaproveita o
    // mesmo modelo de Anexo e a mesma pasta /uploads/{cardId}/ do upload de arquivo comum —
    // não é uma segunda arquitetura de anexos.
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
      if (typeof body?.url !== "string" || !body.url) {
        const err = new Error("URL da imagem remota não enviada");
        (err as Error & { status?: number }).status = 400;
        throw err;
      }
      const { buffer, ext, tipo } = await baixarImagemRemota(body.url);
      const anexo = await salvarBufferComoAnexo(cardId, buffer, `imagem-colada.${ext}`, tipo);
      return NextResponse.json(anexo, { status: 201 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      const err = new Error("Arquivo não enviado");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const anexo = await salvarBufferComoAnexo(
      cardId,
      buffer,
      file.name,
      file.type || "application/octet-stream"
    );

    return NextResponse.json(anexo, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
