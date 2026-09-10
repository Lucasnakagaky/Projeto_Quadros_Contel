import { expect, test } from "@playwright/test";
import { cleanupCard, db, seedCard } from "./helpers";

// Títulos com um prefixo improvável ("zz…"): o pipe usado pelo seed é o pipe real do usuário e
// já tem cards dele: o filtro precisa de termos que só casem com os cards deste teste.
const TITULO_A = "[E2E] filtro zzalpha";
const TITULO_B = "[E2E] filtro zzbeta";
const ETIQUETA = "ZZUrgência";

test.describe("Filtro de cards — Kanban e Lista", () => {
  test("filtra por título e por etiqueta, e o clique na etiqueta do card aplica o filtro", async ({
    page,
  }) => {
    const seed = await seedCard(TITULO_A);
    let etiquetaId: string | undefined;
    let cardBId: string | undefined;
    try {
      const cardB = await db.criarCard(seed.pipeId, seed.faseId, TITULO_B);
      cardBId = cardB.id;

      const etiqueta = await db.criarEtiqueta(seed.pipeId, ETIQUETA, "#ef4444");
      etiquetaId = etiqueta.id;

      // só o card A recebe a etiqueta — é o que separa "filtrou por etiqueta" de "filtrou por título"
      const campos = await db.camposDoPipe(seed.pipeId);
      const campoEtiquetas = campos.find((c) => c.tipo === "etiquetas")!;
      await db.setValorCampo(seed.cardId, campoEtiquetas.id, [etiqueta.id]);

      await page.goto(`pipes/${seed.pipeId}/`);
      const busca = page.getByLabel("Pesquisar cards ou etiquetas");
      const cardA = page.getByText(TITULO_A);
      const cardBNoQuadro = page.getByText(TITULO_B);

      await expect(cardA).toBeVisible();
      await expect(cardBNoQuadro).toBeVisible();

      // título: trecho parcial, só o card A casa
      await busca.fill("zzalpha");
      await expect(cardA).toBeVisible();
      await expect(cardBNoQuadro).toHaveCount(0);

      // etiqueta: o termo não aparece no título do card A, só no nome da etiqueta dele —
      // e sem acento, exercitando a normalização
      await busca.fill("zzurgencia");
      await expect(cardA).toBeVisible();
      await expect(cardBNoQuadro).toHaveCount(0);

      await page.getByRole("button", { name: "Limpar filtro" }).click();
      await expect(busca).toHaveValue("");
      await expect(cardBNoQuadro).toBeVisible();

      // nada corresponde: aparece o aviso, e o botão dele limpa o filtro
      await busca.fill("zz-nao-existe");
      await expect(page.getByTestId("filtro-sem-resultados")).toBeVisible();
      await page
        .getByTestId("filtro-sem-resultados")
        .getByRole("button", { name: "Limpar filtro" })
        .click();
      await expect(page.getByTestId("filtro-sem-resultados")).toHaveCount(0);

      // exact: true é obrigatório aqui: a raiz do card tem role="button" (dnd-kit) e o nome
      // acessível dela inclui o aria-label da etiqueta, então um match por substring pegaria o
      // card inteiro e o clique abriria o card em vez de filtrar.
      // clicar na etiqueta do card preenche o filtro e NÃO abre o card
      await page
        .getByRole("button", { name: `Filtrar por etiqueta ${ETIQUETA}`, exact: true })
        .first()
        .click();
      await expect(busca).toHaveValue(ETIQUETA);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(cardBNoQuadro).toHaveCount(0);
    } finally {
      if (cardBId) await db.apagarCard(cardBId);
      if (etiquetaId) await db.apagarEtiqueta(etiquetaId);
      await cleanupCard(seed);
    }
  });

  test("o filtro continua aplicado ao trocar para a aba Lista e filtra as linhas da tabela", async ({
    page,
  }) => {
    const seed = await seedCard(TITULO_A);
    let etiquetaId: string | undefined;
    let cardBId: string | undefined;
    try {
      const cardB = await db.criarCard(seed.pipeId, seed.faseId, TITULO_B);
      cardBId = cardB.id;

      const etiqueta = await db.criarEtiqueta(seed.pipeId, ETIQUETA, "#ef4444");
      etiquetaId = etiqueta.id;

      const campos = await db.camposDoPipe(seed.pipeId);
      const campoEtiquetas = campos.find((c) => c.tipo === "etiquetas")!;
      await db.setValorCampo(seed.cardId, campoEtiquetas.id, [etiqueta.id]);

      await page.goto(`pipes/${seed.pipeId}/`);
      const busca = page.getByLabel("Pesquisar cards ou etiquetas");
      await busca.fill("zzalpha");

      await page.getByRole("tab", { name: "Lista" }).click();

      // mesmo estado de filtro nas duas abas: o campo continua preenchido e já filtrando
      await expect(page.getByLabel("Pesquisar cards ou etiquetas")).toHaveValue("zzalpha");
      await expect(page.getByRole("cell", { name: TITULO_A })).toBeVisible();
      await expect(page.getByRole("cell", { name: TITULO_B })).toHaveCount(0);

      // sem resultado, a lista mostra a mensagem de filtro (não a de "pipe vazio")
      await page.getByLabel("Pesquisar cards ou etiquetas").fill("zz-nao-existe");
      await expect(page.getByTestId("lista-sem-resultados")).toBeVisible();

      await page.getByRole("button", { name: "Limpar filtro" }).click();
      await expect(page.getByRole("cell", { name: TITULO_B })).toBeVisible();

      // clicar na etiqueta da linha filtra a lista sem abrir o card
      await page
        .getByRole("button", { name: `Filtrar por etiqueta ${ETIQUETA}`, exact: true })
        .first()
        .click();
      await expect(page.getByLabel("Pesquisar cards ou etiquetas")).toHaveValue(ETIQUETA);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("cell", { name: TITULO_A })).toBeVisible();
      await expect(page.getByRole("cell", { name: TITULO_B })).toHaveCount(0);
    } finally {
      if (cardBId) await db.apagarCard(cardBId);
      if (etiquetaId) await db.apagarEtiqueta(etiquetaId);
      await cleanupCard(seed);
    }
  });
});
