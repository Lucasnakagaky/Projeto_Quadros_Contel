import { expect, test } from "@playwright/test";
import { abrirCard, cleanupCard, seedCard } from "./helpers";

test.describe("Gerenciar etiquetas — tela de administração do pipe", () => {
  test("editar nome/cor na tela de gerenciar reflete no chip do board e na pill do card", async ({
    page,
    request,
  }) => {
    const titulo = "[E2E] etiquetas manager - editar reflete em todo lugar";
    const seed = await seedCard(request, titulo);
    let etiquetaId: string | undefined;
    try {
      const etiqueta = await (
        await request.post(`/api/pipes/${seed.pipeId}/etiquetas`, {
          data: { nome: "Original", cor: "#000000" },
        })
      ).json();
      etiquetaId = etiqueta.id;

      const cardDetail = await (await request.get(`/api/cards/${seed.cardId}`)).json();
      const campoEtiquetas = cardDetail.campos.find((c: { tipo: string }) => c.tipo === "etiquetas");
      await request.patch(`/api/cards/${seed.cardId}`, {
        data: { valoresCampos: { [campoEtiquetas.id]: [etiqueta.id] } },
      });

      // "Gerenciar etiquetas" fica no cabeçalho do pipe — precisa ser aberto a partir do board,
      // sem nenhum card já aberto: o overlay do modal do card cobre o cabeçalho inteiro, então um
      // clique nesse botão cairia no overlay (fechando o card) em vez de abrir a tela de gerenciar.
      await page.goto(`/pipes/${seed.pipeId}`);
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
      if (etiquetaId) await request.delete(`/api/pipes/${seed.pipeId}/etiquetas/${etiquetaId}`);
      await cleanupCard(request, seed);
    }
  });

  test("excluir mostra a contagem de cards e remove a etiqueta de todos eles, sem apagar os cards", async ({
    page,
    request,
  }) => {
    const tituloA = "[E2E] etiquetas manager - excluir card A";
    const tituloB = "[E2E] etiquetas manager - excluir card B";
    const seedA = await seedCard(request, tituloA);
    const seedB = await seedCard(request, tituloB);
    let etiquetaId: string | undefined;
    try {
      const etiqueta = await (
        await request.post(`/api/pipes/${seedA.pipeId}/etiquetas`, {
          data: { nome: "Compartilhada", cor: "#a855f7" },
        })
      ).json();
      etiquetaId = etiqueta.id;

      const cardDetailA = await (await request.get(`/api/cards/${seedA.cardId}`)).json();
      const campoEtiquetas = cardDetailA.campos.find((c: { tipo: string }) => c.tipo === "etiquetas");
      await request.patch(`/api/cards/${seedA.cardId}`, {
        data: { valoresCampos: { [campoEtiquetas.id]: [etiqueta.id] } },
      });
      await request.patch(`/api/cards/${seedB.cardId}`, {
        data: { valoresCampos: { [campoEtiquetas.id]: [etiqueta.id] } },
      });

      // idem: abre "Gerenciar etiquetas" a partir do board, sem card aberto por cima
      await page.goto(`/pipes/${seedA.pipeId}`);
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
      if (etiquetaId) await request.delete(`/api/pipes/${seedA.pipeId}/etiquetas/${etiquetaId}`);
      await cleanupCard(request, seedA);
      await cleanupCard(request, seedB);
    }
  });
});
