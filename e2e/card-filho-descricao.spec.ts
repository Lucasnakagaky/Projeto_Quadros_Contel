import { expect, test } from "@playwright/test";
import { abrirCard, cleanupCard, seedCard } from "./helpers";

test.describe("Criar card filho — Descrição da Demanda", () => {
  test("ao criar um card filho, o app navega pro card recém-criado com o campo Descrição visível", async ({
    page,
    request,
  }) => {
    const seed = await seedCard(request, "[E2E] card pai - criação de filho");
    let cardFilhoId: string | null = null;
    try {
      await abrirCard(page, seed);

      // "Subtarefas (Cards Filhos)" é provisionado automaticamente ao abrir qualquer card
      await page.getByRole("button", { name: "Criar card Filho" }).click();
      await page.getByPlaceholder("Título do card").fill("[E2E] card filho");
      await page.getByRole("button", { name: "Criar novo card" }).click();

      // navegou pro card filho (URL troca de cardId — não fica mais no card pai)
      await expect(page).toHaveURL(new RegExp(`cardId=(?!${seed.cardId})[\\w-]+`));
      const url = new URL(page.url());
      cardFilhoId = url.searchParams.get("cardId");
      expect(cardFilhoId).not.toBeNull();
      expect(cardFilhoId).not.toEqual(seed.cardId);

      // o título no cabeçalho do modal já é o do card filho (confirma que trocou de card mesmo)
      const tituloInput = page.getByRole("dialog").locator("input, textarea").first();
      await expect(tituloInput).toHaveValue("[E2E] card filho");

      // campo "Descrição da Demanda" (texto_formatado, com upload de imagem) está visível, sem
      // precisar de nenhum passo extra do usuário
      const campoDescricao = page.locator('[id^="campo-"]').filter({ hasText: "Descrição da Demanda" });
      await expect(campoDescricao).toBeVisible();
      await expect(campoDescricao.getByRole("button", { name: "Clique aqui para adicionar" })).toBeVisible();
    } finally {
      if (cardFilhoId) await request.delete(`/api/cards/${cardFilhoId}`).catch(() => {});
      await cleanupCard(request, seed);
    }
  });
});
