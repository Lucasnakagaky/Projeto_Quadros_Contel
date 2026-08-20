import { expect, test } from "@playwright/test";
import { abrirCard, cleanupCard, colarHtml, colarTexto, seedCard } from "./helpers";

// PNGs mínimos válidos (1x1), usados como payload de "imagem colada" — bytes diferentes entre
// as duas para o cenário de "duas imagens" não depender só do nome de arquivo gerado no upload.
const PNG_TRANSPARENTE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_VERMELHO =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test.describe("Descrição da Demanda — colar imagem embutida (data:) no HTML", () => {
  test("texto + 1 imagem: botão desabilita durante upload, imagem e formatação sobrevivem a salvar/fechar/reabrir", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] cenário 1 - uma imagem");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();

      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await expect(editor).toBeVisible();
      await editor.click();

      // atrasa só a resposta do upload, pra dar tempo de observar o botão "Salvar" desabilitado
      await page.route("**/api/cards/**/attachments", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((r) => setTimeout(r, 800));
        }
        await route.continue();
      });

      await colarHtml(
        page,
        "<p>Texto normal <b>negrito</b> <i>itálico</i><br>quebra de linha</p>" +
          `<img src="data:image/png;base64,${PNG_TRANSPARENTE}">`
      );

      const botaoSalvar = campo.getByRole("button", { name: "Salvar" });
      await expect(botaoSalvar).toBeDisabled();

      const img = editor.locator("img");
      await expect(img).toHaveAttribute("src", /^\/uploads\//, { timeout: 10_000 });
      await expect(botaoSalvar).toBeEnabled();

      await botaoSalvar.click();

      // fecha e reabre de verdade (navega pra fora e volta com cardId na URL de novo)
      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const imgFinal = page.locator(`#campo-${seed.campoId} img`);
      await expect(imgFinal).toHaveAttribute("src", /^\/uploads\//);
      const htmlFinal = await page.locator(`#campo-${seed.campoId}`).innerHTML();
      expect(htmlFinal).toContain("<b>negrito</b>");
      expect(htmlFinal).toMatch(/<i>itálico<\/i>/);
      expect(htmlFinal).toContain("<br>");
      expect(htmlFinal).not.toContain("data:image");
    } finally {
      await cleanupCard(request, seed);
    }
  });

  test("duas imagens embutidas no mesmo paste são ambas enviadas e persistem", async ({ page, context, request }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] cenário 2 - duas imagens");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await colarHtml(
        page,
        `<p>Antes</p><img src="data:image/png;base64,${PNG_TRANSPARENTE}">` +
          `<p>Meio</p><img src="data:image/png;base64,${PNG_VERMELHO}"><p>Depois</p>`
      );

      await expect(editor.locator("img")).toHaveCount(2);
      await expect(editor.locator("img").nth(0)).toHaveAttribute("src", /^\/uploads\//, { timeout: 10_000 });
      await expect(editor.locator("img").nth(1)).toHaveAttribute("src", /^\/uploads\//, { timeout: 10_000 });

      const src1 = await editor.locator("img").nth(0).getAttribute("src");
      const src2 = await editor.locator("img").nth(1).getAttribute("src");
      expect(src1).not.toEqual(src2);

      await campo.getByRole("button", { name: "Salvar" }).click();

      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const imgsFinais = page.locator(`#campo-${seed.campoId} img`);
      await expect(imgsFinais).toHaveCount(2);
      await expect(imgsFinais.nth(0)).toHaveAttribute("src", /^\/uploads\//);
      await expect(imgsFinais.nth(1)).toHaveAttribute("src", /^\/uploads\//);
    } finally {
      await cleanupCard(request, seed);
    }
  });

  test("falha no upload: imagem quebrada some, erro é avisado, e o restante do texto ainda salva", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] cenário 3 - falha de upload");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await page.route("**/api/cards/**/attachments", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Falha simulada" }),
          });
          return;
        }
        await route.continue();
      });

      await colarHtml(
        page,
        `<p>Texto que deve sobreviver <b>negrito</b></p><img src="data:image/png;base64,${PNG_TRANSPARENTE}">`
      );

      await expect(page.getByText(/Erro ao enviar imagem colada|Falha simulada/)).toBeVisible({ timeout: 10_000 });
      await expect(editor.locator("img")).toHaveCount(0);

      const botaoSalvar = campo.getByRole("button", { name: "Salvar" });
      await expect(botaoSalvar).toBeEnabled();
      await botaoSalvar.click();

      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const campoFinal = page.locator(`#campo-${seed.campoId}`);
      await expect(campoFinal).toContainText("Texto que deve sobreviver");
      const htmlFinal = await campoFinal.innerHTML();
      expect(htmlFinal).toContain("<b>negrito</b>");
      expect(htmlFinal).not.toContain("<img");
    } finally {
      await cleanupCard(request, seed);
    }
  });
});

test.describe("Descrição da Demanda — sanitização de HTML sujo no momento do paste", () => {
  test("span com estilo inline e div com classe: o estilo/classe some, o texto sobrevive a salvar/fechar/reabrir", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] paste sujo - estilo/classe removidos");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await colarHtml(
        page,
        '<span style="color:red;font-family:Arial">texto vermelho</span>' +
          '<div class="c1">linha via div</div>'
      );

      // já sanitizado dentro do próprio editor, antes de salvar — não só depois
      await expect(editor).toContainText("texto vermelho");
      await expect(editor).toContainText("linha via div");
      const htmlEditor = await editor.innerHTML();
      expect(htmlEditor).not.toContain("color:red");
      expect(htmlEditor).not.toContain("Arial");
      expect(htmlEditor).not.toContain('class="c1"');

      await campo.getByRole("button", { name: "Salvar" }).click();
      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const htmlFinal = await page.locator(`#campo-${seed.campoId}`).innerHTML();
      expect(htmlFinal).not.toContain("color:red");
      expect(htmlFinal).not.toContain("Arial");
      expect(htmlFinal).not.toContain('class="c1"');
      expect(htmlFinal).toContain("texto vermelho");
      expect(htmlFinal).toContain("linha via div");
    } finally {
      await cleanupCard(request, seed);
    }
  });

  test("colar um documento Word completo (<html><head><style>...) não vaza CSS/JS como texto visível", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] paste sujo - documento Word completo");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await colarHtml(
        page,
        "<html><head><meta charset='utf-8'>" +
          "<style>p.MsoNormal{margin:0;color:red;} span{font-family:Calibri;}</style>" +
          "</head><body><p class='MsoNormal'><b>Texto do Word</b></p></body></html>"
      );

      await expect(editor).toContainText("Texto do Word");
      const htmlEditor = await editor.innerHTML();
      expect(htmlEditor).not.toContain("MsoNormal");
      expect(htmlEditor).not.toContain("Calibri");
      expect(htmlEditor).not.toContain("<style");
      expect(htmlEditor).toContain("<b>Texto do Word</b>");
    } finally {
      await cleanupCard(request, seed);
    }
  });

  test("colar itens de lista soltos com o cursor dentro de uma <ul> existente não quebra a estrutura", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] paste dentro de lista existente");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await campo.getByRole("button", { name: "Lista com marcadores" }).click();
      await page.keyboard.type("Item existente");

      // cursor fica no fim de "Item existente", dentro do <li> — cola outro item de lista ali
      await colarHtml(page, "<li>Item colado</li>");

      await expect(editor.locator("ul")).toHaveCount(1);
      await expect(editor.locator("li")).toHaveCount(2);
      await expect(editor.locator("li").nth(0)).toHaveText("Item existente");
      await expect(editor.locator("li").nth(1)).toHaveText("Item colado");

      await campo.getByRole("button", { name: "Salvar" }).click();
      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      const campoFinal = page.locator(`#campo-${seed.campoId}`);
      await expect(campoFinal.locator("ul")).toHaveCount(1);
      await expect(campoFinal.locator("li")).toHaveCount(2);
    } finally {
      await cleanupCard(request, seed);
    }
  });

  test("colar só texto puro (sem HTML no clipboard) preserva quebras de linha como <br>", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const seed = await seedCard(request, "[E2E] paste texto puro com quebras de linha");
    try {
      await abrirCard(page, seed);
      const campo = page.locator(`#campo-${seed.campoId}`);
      await campo.getByRole("button", { name: "Clique aqui para adicionar" }).click();
      const editor = campo.getByRole("textbox", { name: "Editor de atividades" });
      await editor.click();

      await colarTexto(page, "linha 1\nlinha 2\nlinha 3");

      await expect(editor.locator("br")).toHaveCount(2);
      await expect(editor).toContainText("linha 1");
      await expect(editor).toContainText("linha 2");
      await expect(editor).toContainText("linha 3");

      await campo.getByRole("button", { name: "Salvar" }).click();
      await page.goto(`/pipes/${seed.pipeId}`);
      await abrirCard(page, seed);

      await expect(page.locator(`#campo-${seed.campoId} br`)).toHaveCount(2);
    } finally {
      await cleanupCard(request, seed);
    }
  });
});
