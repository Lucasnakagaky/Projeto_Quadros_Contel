import { promises as fs } from "fs";
import path from "path";
import { APIRequestContext, Page, expect } from "@playwright/test";

export type Seed = { pipeId: string; faseId: string; cardId: string; campoId: string };

// Reaproveita o pipe já existente do usuário (não cria pipe novo, pra não sujar a lista dele) e
// garante o campo "Descrição da Demanda" (texto_formatado) — mesma rota que o app usa.
export async function seedCard(request: APIRequestContext, titulo: string): Promise<Seed> {
  const pipes = await (await request.get("/api/pipes")).json();
  const pipeId = pipes[0].id as string;

  const fases = await (await request.get(`/api/pipes/${pipeId}/fases`)).json();
  const faseId = fases[0].id as string;

  const campo = await (await request.post(`/api/pipes/${pipeId}/campos/garantir-descricao-demanda`)).json();

  const card = await (
    await request.post(`/api/pipes/${pipeId}/cards`, { data: { faseId, titulo } })
  ).json();

  return { pipeId, faseId, cardId: card.id, campoId: campo.id };
}

// permanentDeleteCard não apaga os arquivos físicos de upload — limpa manualmente aqui pra não
// deixar resíduo de imagem de teste no projeto do usuário.
export async function cleanupCard(request: APIRequestContext, seed: Seed) {
  await request.delete(`/api/cards/${seed.cardId}`);
  const uploadsDir = path.join(process.cwd(), "public", "uploads", seed.cardId);
  await fs.rm(uploadsDir, { recursive: true, force: true });
}

export async function abrirCard(page: Page, seed: Seed) {
  await page.goto(`/pipes/${seed.pipeId}?cardId=${seed.cardId}`);
  await expect(page.locator(`#campo-${seed.campoId}`)).toBeVisible();
}

// Escreve HTML real na área de transferência do navegador e dispara Ctrl+V — precisa ser um
// paste de verdade (não um dispatchEvent sintético) pra acionar a inserção nativa do Chromium no
// contentEditable, que é o comportamento que o bug original depende.
export async function colarHtml(page: Page, html: string) {
  await page.evaluate(async (htmlColado) => {
    const item = new ClipboardItem({ "text/html": new Blob([htmlColado], { type: "text/html" }) });
    await navigator.clipboard.write([item]);
  }, html);
  await page.keyboard.press("Control+V");
}

// Igual a colarHtml, mas só escreve text/plain no clipboard (sem text/html) — simula colar de
// uma fonte que não fornece HTML, exercitando o fallback de texto puro do handlePaste.
export async function colarTexto(page: Page, texto: string) {
  await page.evaluate(async (textoColado) => {
    const item = new ClipboardItem({ "text/plain": new Blob([textoColado], { type: "text/plain" }) });
    await navigator.clipboard.write([item]);
  }, texto);
  await page.keyboard.press("Control+V");
}
