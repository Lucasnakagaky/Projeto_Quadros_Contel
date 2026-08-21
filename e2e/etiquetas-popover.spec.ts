import { expect, test } from "@playwright/test";
import { abrirCard, cleanupCard, seedCard } from "./helpers";

test.describe("Etiquetas — popover de busca/toggle/criar no card", () => {
  test("busca filtra em tempo real e o toggle aplica/remove instantaneamente, sem botão salvar", async ({
    page,
    request,
  }) => {
    const seed = await seedCard(request, "[E2E] etiquetas popover - busca e toggle");
    const criadas: string[] = [];
    try {
      const urgente = await (
        await request.post(`/api/pipes/${seed.pipeId}/etiquetas`, {
          data: { nome: "Urgente", cor: "#ef4444" },
        })
      ).json();
      const bloqueado = await (
        await request.post(`/api/pipes/${seed.pipeId}/etiquetas`, {
          data: { nome: "Bloqueado", cor: "#000000" },
        })
      ).json();
      criadas.push(urgente.id, bloqueado.id);

      await abrirCard(page, seed);
      await page.getByRole("button", { name: "+ Adicionar etiquetas" }).click();

      // "div.z-50" sozinho seria ambíguo: o DialogContent do próprio modal do card também leva
      // z-50 (dialog.tsx) e, sendo o ancestral de tudo, "contém" a busca também. w-72 + mt-2 são
      // específicos do painel do popover (posicionamento do dropdown), não usados pelo Dialog.
      function painel() {
        return page.locator("div.absolute.z-50.w-72.mt-2", { has: page.getByPlaceholder("Buscar etiqueta...") });
      }

      // exact: true — sem isso, colidiria por substring com o botão "Excluir etiqueta Urgente"
      // da mesma linha (edição/exclusão inline no popover).
      await expect(painel().getByRole("button", { name: "Urgente", exact: true })).toBeVisible();
      await expect(painel().getByRole("button", { name: "Bloqueado", exact: true })).toBeVisible();

      const busca = page.getByPlaceholder("Buscar etiqueta...");
      await busca.fill("urg");
      await expect(painel().getByRole("button", { name: "Urgente", exact: true })).toBeVisible();
      await expect(painel().getByRole("button", { name: "Bloqueado", exact: true })).toHaveCount(0);

      // clicar na etiqueta aplica na hora, sem precisar de um botão "salvar"
      await painel().getByRole("button", { name: "Urgente", exact: true }).click();
      // fecha o popover clicando fora dele (não usa Esc aqui: o popover não é Radix, então um Esc
      // também seria capturado pelo Dialog Radix do card e fecharia o card inteiro junto)
      await page.getByText("Fase atual").click();

      // pill aplicada aparece no cabeçalho do card, fora do popover
      await expect(page.getByRole("button", { name: "Urgente", exact: true })).toBeVisible();

      // clicar na pill reabre o popover — mesmo toggle, mesmo código, agora removendo
      await page.getByRole("button", { name: "Urgente", exact: true }).click();
      await painel().getByRole("button", { name: "Urgente", exact: true }).click();
      await page.getByText("Fase atual").click();

      await expect(page.getByRole("button", { name: "+ Adicionar etiquetas" })).toBeVisible();
    } finally {
      for (const id of criadas) {
        await request.delete(`/api/pipes/${seed.pipeId}/etiquetas/${id}`);
      }
      await cleanupCard(request, seed);
    }
  });

  test("busca sem resultado abre criação com o texto preenchido; hex inválido barra salvar; preset preenche o hex", async ({
    page,
    request,
  }) => {
    const seed = await seedCard(request, "[E2E] etiquetas popover - criar com hex e presets");
    let criadaId: string | undefined;
    try {
      await abrirCard(page, seed);
      await page.getByRole("button", { name: "+ Adicionar etiquetas" }).click();

      const busca = page.getByPlaceholder("Buscar etiqueta...");
      await busca.fill("Prioridade Alta");

      await page.getByRole("button", { name: 'Criar etiqueta "Prioridade Alta"' }).click();

      const modal = page.getByRole("dialog", { name: "Nova etiqueta" });
      await expect(modal).toBeVisible();
      await expect(modal.getByLabel("Nome da etiqueta")).toHaveValue("Prioridade Alta");

      const corInput = modal.getByLabel("Cor", { exact: true });

      // hex inválido barra o salvar — modal continua aberto
      await corInput.fill("nao-e-hex");
      await modal.getByRole("button", { name: "Salvar" }).click();
      await expect(modal).toBeVisible();

      // clicar num preset preenche o campo de hex (não é uma seleção paralela)
      await modal.getByRole("button", { name: "Usar cor #3b82f6" }).click();
      await expect(corInput).toHaveValue("#3b82f6");

      await modal.getByRole("button", { name: "Salvar" }).click();
      await expect(modal).not.toBeVisible();

      // criar pelo popover já aplica automaticamente ao card atual — fecha o popover (que
      // continua aberto por trás do modal) pra checar a pill sem ambiguidade com a linha da lista
      await page.getByText("Fase atual").click();
      await expect(page.getByRole("button", { name: "Prioridade Alta", exact: true })).toBeVisible();

      const listagem: { id: string; nome: string }[] = await (
        await request.get(`/api/pipes/${seed.pipeId}/etiquetas`)
      ).json();
      criadaId = listagem.find((e) => e.nome === "Prioridade Alta")?.id;
    } finally {
      if (criadaId) await request.delete(`/api/pipes/${seed.pipeId}/etiquetas/${criadaId}`);
      await cleanupCard(request, seed);
    }
  });
});
