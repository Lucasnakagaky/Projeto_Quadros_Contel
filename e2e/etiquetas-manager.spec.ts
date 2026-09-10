import { expect, test } from "@playwright/test";
import { abrirCard, cleanupCard, db, seedCard } from "./helpers";

test.describe("Gerenciar etiquetas — tela de administração do pipe", () => {
  test("editar nome/cor na tela de gerenciar reflete no chip do board e na pill do card", async ({
    page,
  }) => {
    const titulo = "[E2E] etiquetas manager - editar reflete em todo lugar";
    const seed = await seedCard(titulo);
    let etiquetaId: string | undefined;
    try {
      const etiqueta = await db.criarEtiqueta(seed.pipeId, "Original", "#000000");
      etiquetaId = etiqueta.id;

      const campos = await db.camposDoPipe(seed.pipeId);
      const campoEtiquetas = campos.find((c) => c.tipo === "etiquetas")!;
      await db.setValorCampo(seed.cardId, campoEtiquetas.id, [etiqueta.id]);

      // "Gerenciar etiquetas" fica no cabeçalho do pipe — precisa ser aberto a partir do board,
      // sem nenhum card já aberto: o overlay do modal do card cobre o cabeçalho inteiro, então um
      // clique nesse botão cairia no overlay (fechando o card) em vez de abrir a tela de gerenciar.
      await page.goto(`pipes/${seed.pipeId}/`);
      await page.getByRole("button", { name: "Gerenciar etiquetas" }).click();
      const gerenciar = page.getByRole("dialog", { name: "Gerenciar etiquetas" });
      await expect(gerenciar).toBeVisible();
      await gerenciar.getByRole("button", { name: "Editar etiqueta Original" }).click();

      const editar = page.getByRole("dialog", { name: "Editar etiqueta" });
      await expect(editar.getByLabel("Nome da etiqueta")).toHaveValue("Original");
      await editar.getByLabel("Nome da etiqueta").fill("Renomeada");
      await editar.getByRole("button", { name: "Salvar" }).click();
      await expect(editar).not.toBeVisible();
      await expect(gerenciar.getByText("Renomeada")).toBeVisible();

      // fecha "Gerenciar etiquetas" — único Dialog aberto neste ponto, Esc é seguro aqui
      await page.keyboard.press("Escape");
      await expect(gerenciar).not.toBeVisible();

      // reflete no chip do card, ainda no board
      const chip = page.locator("div.cursor-grab", { hasText: titulo });
      await expect(chip.getByText("Renomeada")).toBeVisible();
      await expect(chip.getByText("Original", { exact: true })).toHaveCount(0);

      // e na pill do card ao abrir
      await abrirCard(page, seed);
      await expect(page.getByRole("button", { name: "Renomeada", exact: true })).toBeVisible();
    } finally {
      if (etiquetaId) await db.apagarEtiqueta(etiquetaId);
      await cleanupCard(seed);
    }
  });

  test("excluir mostra a contagem de cards e remove a etiqueta de todos eles, sem apagar os cards", async ({
    page,
  }) => {
    const tituloA = "[E2E] etiquetas manager - excluir card A";
    const tituloB = "[E2E] etiquetas manager - excluir card B";
    const seedA = await seedCard(tituloA);
    const seedB = await seedCard(tituloB);
    let etiquetaId: string | undefined;
    try {
      const etiqueta = await db.criarEtiqueta(seedA.pipeId, "Compartilhada", "#a855f7");
      etiquetaId = etiqueta.id;

      const campos = await db.camposDoPipe(seedA.pipeId);
      const campoEtiquetas = campos.find((c) => c.tipo === "etiquetas")!;
      await db.setValorCampo(seedA.cardId, campoEtiquetas.id, [etiqueta.id]);
      await db.setValorCampo(seedB.cardId, campoEtiquetas.id, [etiqueta.id]);

      // idem: abre "Gerenciar etiquetas" a partir do board, sem card aberto por cima
      await page.goto(`pipes/${seedA.pipeId}/`);
      await page.getByRole("button", { name: "Gerenciar etiquetas" }).click();
      const gerenciar = page.getByRole("dialog", { name: "Gerenciar etiquetas" });
      await gerenciar.getByRole("button", { name: "Excluir etiqueta Compartilhada" }).click();

      const confirmar = page.getByRole("dialog", { name: "Excluir etiqueta" });
      await expect(confirmar).toContainText("2 cards");
      await confirmar.getByRole("button", { name: "Excluir" }).click();
      await expect(confirmar).not.toBeVisible();
      await expect(gerenciar.getByText("Compartilhada")).toHaveCount(0);

      etiquetaId = undefined; // já excluída pelo próprio teste, cleanup no finally vira no-op

      await page.keyboard.press("Escape");
      await expect(gerenciar).not.toBeVisible();

      // os dois cards perdem a etiqueta, mas continuam existindo intactos
      await abrirCard(page, seedA);
      await expect(page.getByRole("button", { name: "+ Adicionar etiquetas" })).toBeVisible();

      await abrirCard(page, seedB);
      await expect(page.getByRole("button", { name: "+ Adicionar etiquetas" })).toBeVisible();
    } finally {
      if (etiquetaId) await db.apagarEtiqueta(etiquetaId);
      await cleanupCard(seedA);
      await cleanupCard(seedB);
    }
  });
});
