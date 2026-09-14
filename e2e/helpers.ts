import { Page, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as store from "../src/lib/store";

export type Seed = { pipeId: string; faseId: string; cardId: string; campoId: string };

// Cliente com service_role: o setup/teardown de e2e escreve direto nas tabelas,
// ignorando a RLS (o app, no navegador, continua usando a anon key + sessão).
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "uploads";

// Reaproveita o pipe/fase que já existem (não cria pipe novo pra não sujar a lista) e garante o
// campo "Descrição da Demanda" (texto_formatado) pelo mesmo caminho que o app usa.
export async function seedCard(titulo: string): Promise<Seed> {
  const pipes = await store.listPipes();
  const pipeId = pipes[0].id;

  const fases = await store.listFasesByPipe(pipeId);
  const faseId = fases[0].id;

  const campo = await store.ensureDescricaoDemandaCampo(pipeId);
  const card = await store.createCard({ pipeId, faseId, titulo });

  return { pipeId, faseId, cardId: card.id, campoId: campo.id };
}

// Apaga o card (as FKs ON DELETE CASCADE levam anexos/comentários/etc juntos) e limpa os
// arquivos do card no Storage, pra não deixar resíduo de imagem de teste no bucket.
export async function cleanupCard(seed: Seed) {
  await limparStorageDoCard(seed.cardId);
  await store.permanentDeleteCard(seed.cardId).catch(() => {});
}

export async function limparStorageDoCard(cardId: string) {
  const { data } = await sb.storage.from(BUCKET).list(cardId);
  if (data?.length) {
    await sb.storage.from(BUCKET).remove(data.map((f) => `${cardId}/${f.name}`));
  }
}

// Operações de banco que os specs precisam no setup/teardown. Antes eram chamadas HTTP a
// /api/**; agora vão direto pro Supabase via store.ts (mesmas regras de negócio do app).
export const db = {
  criarEtiqueta: (pipeId: string, nome: string, cor: string) => store.createLabel(pipeId, nome, cor),
  apagarEtiqueta: (id: string) => store.deleteLabel(id).catch(() => {}),
  listarEtiquetas: (pipeId: string) => store.listLabelsByPipe(pipeId),
  camposDoPipe: (pipeId: string) => store.listCamposByPipe(pipeId),
  criarCard: (pipeId: string, faseId: string, titulo: string) => store.createCard({ pipeId, faseId, titulo }),
  apagarCard: (id: string) => store.permanentDeleteCard(id).catch(() => {}),
  anexosDoCard: (cardId: string) => store.listAttachmentsByCard(cardId),
  // merge de valores_campos, como faz o app ao salvar um campo
  async setValorCampo(cardId: string, campoId: string, valor: unknown) {
    const card = await store.getCard(cardId);
    await store.updateCard(cardId, { valoresCampos: { ...card.valoresCampos, [campoId]: valor } });
  },
};

export async function abrirCard(page: Page, seed: Seed) {
  // caminho relativo ao baseURL (que termina em /Projeto_Quadros_Contel/) e com barra
  // final antes da query, por causa do trailingSlash do export estático. Rota estática fixa
  // (/pipes/quadro), o pipe é identificado por ?id= — ver plano "Corrigir 404 ao criar Pipe".
  await page.goto(`pipes/quadro/?id=${seed.pipeId}&cardId=${seed.cardId}`);
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

// Escreve um único ClipboardItem com DUAS representações simultâneas (text/html com texto ao
// redor + um item image/* solto) — simula uma fonte real que oferece ambos pra uma mesma
// operação de copiar (ex.: "texto + imagem + texto" de um e-mail/página). Regressão-alvo: um
// item de imagem solto no clipboard não pode mais descartar o texto que veio junto, nem causar
// upload duplicado da mesma imagem.
export async function colarHtmlComImagemBruta(page: Page, html: string, pngBase64: string) {
  await page.evaluate(
    async ({ htmlColado, png }) => {
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      const item = new ClipboardItem({
        "text/html": new Blob([htmlColado], { type: "text/html" }),
        "image/png": new Blob([bytes], { type: "image/png" }),
      });
      await navigator.clipboard.write([item]);
    },
    { htmlColado: html, png: pngBase64 }
  );
  await page.keyboard.press("Control+V");
}
