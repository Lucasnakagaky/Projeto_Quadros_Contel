import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { addAttachment, listAttachmentsByCard } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

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

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { cardId } = await params;
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      const err = new Error("Arquivo não enviado");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }

    const cardDir = path.join(UPLOADS_DIR, cardId);
    await fs.mkdir(cardDir, { recursive: true });

    const ext = path.extname(file.name);
    const safeName = `${uuid()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(cardDir, safeName), buffer);

    const anexo = await addAttachment({
      cardId,
      nome: file.name,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
      url: `/uploads/${cardId}/${safeName}`,
    });

    return NextResponse.json(anexo, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
