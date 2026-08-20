import { expect, test } from "@playwright/test";
import { abrirCard, cleanupCard, colarHtml, seedCard } from "./helpers";

const PNG_TRANSPARENTE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test.describe("Descrição da Demanda — zoom da imagem (lightbox)", () => {
  test("clicar na imagem salva abre o lightbox (não entra em edição); X, clique fora e ESC fecham", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] lightbox - clique na imagem");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await colarHtml(page, `<p>Legenda</p><img src="data:image/png;base64,${PNG_TRANSPARENTE}">`);
      await expect(editor.locator("img")).toHaveAttribute("src", /^\/uploads\//, { timeout: 10_000 });
      await campo.getByRole("button", { name: "Salvar" }).click();

      // fecha e reabre pra garantir que estamos testando a visualização salva, não o editor
      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const imgSalva = page.locator(`#campo-${seed.campoId} img`);
      await expect(imgSalva).toBeVisible();
      const srcSalvo = await imgSalva.getAttribute("src");
      expect(srcSalvo).toMatch(/^\/uploads\//);

      // 1) clicar na imagem abre o lightbox, e NÃO entra em modo de edição
      // (escopado pelo título acessível do lightbox — sem isso, `role=dialog` também bate no
      // modal do card por trás, que continua aberto e visível quando só o lightbox fecha)
      await imgSalva.click();
      const dialog = page.getByRole("dialog", { name: "Imagem ampliada" });
      await expect(dialog).toBeVisible();
      const imgAmpliada = dialog.locator("img");
      await expect(imgAmpliada).toHaveAttribute("src", new RegExp(srcSalvo!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      await expect(campo.getByRole("textbox", { name: "Editor de atividades" })).toHaveCount(0);

      // 2) ESC fecha
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();

      // 3) clique fora (overlay) fecha
      await imgSalva.click();
      await expect(dialog).toBeVisible();
      await page.mouse.click(5, 5);
      await expect(dialog).not.toBeVisible();

      // 4) botão X fecha
      await imgSalva.click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Fechar" }).click();
      await expect(dialog).not.toBeVisible();

      // depois de fechar o lightbox, clicar fora da imagem (no texto) ainda abre a edição normal
      await campo.getByText("Legenda").click();
      await expect(campo.getByRole("textbox", { name: "Editor de atividades" })).toBeVisible();
    } finally {
      await cleanupCard(request, seed);
    }
  });

  test("clicar na imagem ainda em edição (antes de salvar) abre o lightbox sem perder o conteúdo não salvo", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] lightbox - clique durante edição, antes de salvar");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await colarHtml(page, `<p>Legenda não salva</p><img src="data:image/png;base64,${PNG_TRANSPARENTE}">`);
      const img = editor.locator("img");
      await expect(img).toHaveAttribute("src", /^\/uploads\//, { timeout: 10_000 });

      // clica na imagem ainda dentro do editor, sem ter salvo — não pode entrar em modo de
      // seleção de texto nem perder o conteúdo já digitado/colado
      await img.click();
      const dialog = page.getByRole("dialog", { name: "Imagem ampliada" });
      await expect(dialog).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();

      // o editor continua visível, ainda em modo de edição, com o conteúdo não salvo intacto
      await expect(editor).toBeVisible();
      await expect(editor).toContainText("Legenda não salva");
      await expect(editor.locator("img")).toHaveCount(1);

      // Salvar continua funcionando normalmente depois de fechar o lightbox
      await campo.getByRole("button", { name: "Salvar" }).click();
      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const campoFinal = page.locator(`#campo-${seed.campoId}`);
      await expect(campoFinal).toContainText("Legenda não salva");
      await expect(campoFinal.locator("img")).toHaveCount(1);
    } finally {
      await cleanupCard(request, seed);
    }
  });
});
