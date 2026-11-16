import { describe, expect, it, vi } from "vitest";
import { criarFakeSupabase } from "./__mocks__/fake-supabase";

// store.ts fala com o Supabase; nos testes, um fake in-memory no lugar do cliente.
vi.mock("./supabase", () => criarFakeSupabase());

const {
  createCampo,
  createCard,
  createLabel,
  createPipe,
  deleteLabel,
  ensureCardsVinculadosCampo,
  ensureDescricaoDemandaCampo,
  ensureFaseArquivada,
  getCard,
  listCamposByPipe,
  listFasesByPipe,
  listLabelsByPipe,
  updateCampo,
  updateCard,
  updateLabel,
} = await import("./store");

describe("updateCampo", () => {
  it("persiste arquivado, valorUnico, validacaoCustomizada e config.moeda", async () => {
    const pipe = await createPipe("Pipe de teste — updateCampo");
    const campo = await createCampo(pipe.id, { tipo: "moeda", titulo: "Valor do contrato" });

    expect(campo.arquivado).toBe(false);
    expect(campo.valorUnico).toBe(false);

    const atualizado = await updateCampo(campo.id, {
      valorUnico: true,
      arquivado: true,
      validacaoCustomizada: "^[0-9]+$",
      config: { moeda: "USD" },
    });

    expect(atualizado.valorUnico).toBe(true);
    expect(atualizado.arquivado).toBe(true);
    expect(atualizado.validacaoCustomizada).toBe("^[0-9]+$");
    expect(atualizado.config.moeda).toBe("USD");
  });

  it("restaura um campo arquivado", async () => {
    const pipe = await createPipe("Pipe de teste — restaurar");
    const campo = await createCampo(pipe.id, { tipo: "texto_curto", titulo: "Campo arquivável" });
    await updateCampo(campo.id, { arquivado: true });

    const restaurado = await updateCampo(campo.id, { arquivado: false });

    expect(restaurado.arquivado).toBe(false);
  });
});

describe("updateCard — validação de valor único", () => {
  it("rejeita um valor duplicado quando o campo é marcado como único", async () => {
    const pipe = await createPipe("Pipe de teste — valor único");
    const fases = await listFasesByPipe(pipe.id);
    const campo = await createCampo(pipe.id, { tipo: "texto_curto", titulo: "CPF" });
    await updateCampo(campo.id, { valorUnico: true });

    const cardA = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card A" });
    const cardB = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card B" });

    await updateCard(cardA.id, { valoresCampos: { [campo.id]: "111.111.111-11" } });

    await expect(
      updateCard(cardB.id, { valoresCampos: { [campo.id]: "111.111.111-11" } })
    ).rejects.toThrow(/valor único/);
  });

  it("permite o mesmo valor em campos sem a restrição de valor único", async () => {
    const pipe = await createPipe("Pipe de teste — sem restrição");
    const fases = await listFasesByPipe(pipe.id);
    const campo = await createCampo(pipe.id, { tipo: "texto_curto", titulo: "Apelido" });

    const cardA = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card A" });
    const cardB = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card B" });

    await updateCard(cardA.id, { valoresCampos: { [campo.id]: "mesmo valor" } });
    const atualizado = await updateCard(cardB.id, { valoresCampos: { [campo.id]: "mesmo valor" } });

    expect(atualizado.valoresCampos[campo.id]).toBe("mesmo valor");
  });

  it("permite reeditar o próprio card com o mesmo valor único sem falso positivo", async () => {
    const pipe = await createPipe("Pipe de teste — reedição");
    const fases = await listFasesByPipe(pipe.id);
    const campo = await createCampo(pipe.id, { tipo: "texto_curto", titulo: "Matrícula" });
    await updateCampo(campo.id, { valorUnico: true });

    const card = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card único" });
    await updateCard(card.id, { valoresCampos: { [campo.id]: "ABC-1" } });

    await expect(
      updateCard(card.id, { valoresCampos: { [campo.id]: "ABC-1" } })
    ).resolves.not.toThrow();
  });
});

describe("ensureFaseArquivada", () => {
  it("cria a fase 'Arquivado' como fase final quando ela ainda não existe", async () => {
    const pipe = await createPipe("Pipe de teste — ensureFaseArquivada cria");

    const fase = await ensureFaseArquivada(pipe.id);

    expect(fase.nome).toBe("Arquivado");
    expect(fase.ehFinal).toBe(true);
    expect(fase.pipeId).toBe(pipe.id);
  });

  it("reaproveita a fase 'Arquivado' existente em vez de duplicar", async () => {
    const pipe = await createPipe("Pipe de teste — ensureFaseArquivada idempotente");

    const primeira = await ensureFaseArquivada(pipe.id);
    const segunda = await ensureFaseArquivada(pipe.id);

    expect(segunda.id).toBe(primeira.id);
    const fases = await listFasesByPipe(pipe.id);
    expect(fases.filter((f) => f.nome === "Arquivado")).toHaveLength(1);
  });
});

describe("ensureCardsVinculadosCampo", () => {
  it("cria o campo 'Cards vinculados' (bidirecional, vários) quando ele ainda não existe", async () => {
    const pipe = await createPipe("Pipe de teste — ensureCardsVinculadosCampo cria");

    const campo = await ensureCardsVinculadosCampo(pipe.id);

    expect(campo.titulo).toBe("Cards vinculados");
    expect(campo.tipo).toBe("cards_vinculados");
    expect(campo.config.bidirecional).toBe(true);
    expect(campo.config.cardinalidade).toBe("varios");
  });

  it("reaproveita o campo existente em vez de duplicar", async () => {
    const pipe = await createPipe("Pipe de teste — ensureCardsVinculadosCampo idempotente");

    const primeiro = await ensureCardsVinculadosCampo(pipe.id);
    const segundo = await ensureCardsVinculadosCampo(pipe.id);

    expect(segundo.id).toBe(primeiro.id);
    const campos = await listCamposByPipe(pipe.id);
    expect(campos.filter((c) => c.tipo === "cards_vinculados")).toHaveLength(1);
  });
});

describe("ensureDescricaoDemandaCampo", () => {
  it("cria o campo já como texto_formatado quando ele ainda não existe", async () => {
    const pipe = await createPipe("Pipe de teste — ensureDescricaoDemandaCampo cria");

    const campo = await ensureDescricaoDemandaCampo(pipe.id);

    expect(campo.titulo).toBe("Descrição da Demanda");
    expect(campo.tipo).toBe("texto_formatado");
  });

  it("migra um campo texto_longo existente para texto_formatado preservando o valor com quebras de linha", async () => {
    const pipe = await createPipe("Pipe de teste — ensureDescricaoDemandaCampo migra");
    const fases = await listFasesByPipe(pipe.id);
    const campoAntigo = await createCampo(pipe.id, {
      tipo: "texto_longo",
      titulo: "Descrição da Demanda",
    });
    const card = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card com descrição" });
    await updateCard(card.id, {
      valoresCampos: { [campoAntigo.id]: "Linha 1\nLinha 2 com <tag> & cia" },
    });

    const migrado = await ensureDescricaoDemandaCampo(pipe.id);

    expect(migrado.id).toBe(campoAntigo.id);
    expect(migrado.tipo).toBe("texto_formatado");
    const cardAtualizado = await getCard(card.id);
    expect(cardAtualizado.valoresCampos[campoAntigo.id]).toBe(
      "Linha 1<br>Linha 2 com &lt;tag&gt; &amp; cia"
    );
  });

  it("não duplica o campo nem re-escapa o valor numa segunda chamada", async () => {
    const pipe = await createPipe("Pipe de teste — ensureDescricaoDemandaCampo idempotente");
    const fases = await listFasesByPipe(pipe.id);
    const campoAntigo = await createCampo(pipe.id, {
      tipo: "texto_longo",
      titulo: "Descrição da Demanda",
    });
    const card = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card" });
    await updateCard(card.id, { valoresCampos: { [campoAntigo.id]: "Texto simples" } });

    await ensureDescricaoDemandaCampo(pipe.id);
    const segunda = await ensureDescricaoDemandaCampo(pipe.id);

    expect(segunda.id).toBe(campoAntigo.id);
    const campos = await listCamposByPipe(pipe.id);
    expect(campos.filter((c) => c.titulo === "Descrição da Demanda")).toHaveLength(1);
    const cardAtualizado = await getCard(card.id);
    expect(cardAtualizado.valoresCampos[campoAntigo.id]).toBe("Texto simples");
  });
});

describe("Etiquetas", () => {
  it("lista só as etiquetas do pipe pedido", async () => {
    const pipeA = await createPipe("Pipe de teste — etiquetas A");
    const pipeB = await createPipe("Pipe de teste — etiquetas B");
    await createLabel(pipeA.id, "Urgente", "#ef4444");
    await createLabel(pipeB.id, "Bloqueado", "#000000");

    const etiquetasA = await listLabelsByPipe(pipeA.id);

    expect(etiquetasA).toHaveLength(1);
    expect(etiquetasA[0].nome).toBe("Urgente");
  });

  it("cria cortando espaços do nome e persistindo a cor", async () => {
    const pipe = await createPipe("Pipe de teste — criar etiqueta");

    const etiqueta = await createLabel(pipe.id, "  Prioridade  ", "#3b82f6");

    expect(etiqueta.nome).toBe("Prioridade");
    expect(etiqueta.cor).toBe("#3b82f6");
    expect(etiqueta.pipeId).toBe(pipe.id);
  });

  it("atualiza nome e cor de forma independente", async () => {
    const pipe = await createPipe("Pipe de teste — atualizar etiqueta");
    const etiqueta = await createLabel(pipe.id, "Original", "#000000");

    const soNome = await updateLabel(etiqueta.id, { nome: "Renomeada" });
    expect(soNome.nome).toBe("Renomeada");
    expect(soNome.cor).toBe("#000000");

    const soCor = await updateLabel(etiqueta.id, { cor: "#ffffff" });
    expect(soCor.nome).toBe("Renomeada");
    expect(soCor.cor).toBe("#ffffff");
  });

  it("rejeita atualizar uma etiqueta inexistente", async () => {
    await expect(updateLabel("etiqueta-inexistente", { nome: "X" })).rejects.toThrow();
  });

  it("ao excluir, remove a etiqueta de todo campo de array que a referencia num card — não só do campo do tipo etiquetas", async () => {
    const pipe = await createPipe("Pipe de teste — excluir etiqueta com cascade");
    const fases = await listFasesByPipe(pipe.id);
    const campoEtiquetas = await createCampo(pipe.id, { tipo: "etiquetas", titulo: "Etiquetas" });
    // campo de outro tipo que também guarda um array de ids — a varredura do deleteLabel é
    // genérica por Object.keys(valoresCampos), não filtra por tipo de campo, então precisa
    // continuar limpando aqui também.
    const campoResponsavel = await createCampo(pipe.id, { tipo: "responsavel", titulo: "Responsável" });
    const etiqueta = await createLabel(pipe.id, "Compartilhada", "#a855f7");

    const card = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card com etiqueta" });
    await updateCard(card.id, {
      valoresCampos: {
        [campoEtiquetas.id]: [etiqueta.id],
        [campoResponsavel.id]: [etiqueta.id, "user-1"],
      },
    });

    await deleteLabel(etiqueta.id);

    const restantes = await listLabelsByPipe(pipe.id);
    expect(restantes.find((e) => e.id === etiqueta.id)).toBeUndefined();

    const cardAtualizado = await getCard(card.id);
    expect(cardAtualizado.valoresCampos[campoEtiquetas.id]).toEqual([]);
    expect(cardAtualizado.valoresCampos[campoResponsavel.id]).toEqual(["user-1"]);
  });

  it("excluir não afeta cards de outros pipes nem outras etiquetas do mesmo card", async () => {
    const pipe = await createPipe("Pipe de teste — excluir sem afetar outros");
    const fases = await listFasesByPipe(pipe.id);
    const campoEtiquetas = await createCampo(pipe.id, { tipo: "etiquetas", titulo: "Etiquetas" });
    const alvo = await createLabel(pipe.id, "Vai sumir", "#ef4444");
    const mantida = await createLabel(pipe.id, "Fica", "#22c55e");

    const card = await createCard({ pipeId: pipe.id, faseId: fases[0].id, titulo: "Card" });
    await updateCard(card.id, {
      valoresCampos: { [campoEtiquetas.id]: [alvo.id, mantida.id] },
    });

    await deleteLabel(alvo.id);

    const cardAtualizado = await getCard(card.id);
    expect(cardAtualizado.valoresCampos[campoEtiquetas.id]).toEqual([mantida.id]);
    const restantes = await listLabelsByPipe(pipe.id);
    expect(restantes.map((e) => e.id)).toEqual([mantida.id]);
  });

  it("excluir uma etiqueta inexistente não lança erro (comportamento atual)", async () => {
    await expect(deleteLabel("etiqueta-inexistente")).resolves.not.toThrow();
  });
});

// Pipes grandes (100+ cards): os ids vão na URL do PostgREST e a lista repetida para pai e
// filho estourava o limite do gateway, derrubando a abertura do quadro. Agora vai em lotes.
describe("consultas por lista de ids em pipes grandes", () => {
  async function prepararCenario(qtd: number) {
    const { supabase, tabelas } = (await import("./supabase")) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: { from: (t: string) => any };
      tabelas: Record<string, Record<string, unknown>[]>;
    };
    const ids = Array.from({ length: qtd }, (_, i) => `card-grande-${i}`);
    tabelas.cards = ids.map((id, i) => ({ id, titulo: `Card ${i}` }));
    // cada card i (par) é pai do card i+1
    tabelas.conexoes = ids
      .filter((_, i) => i % 2 === 0 && i + 1 < qtd)
      .map((id, k) => ({
        id: `cx-${k}`,
        campo_id: "campo-x",
        card_pai_id: id,
        card_filho_id: ids[ids.indexOf(id) + 1],
        criado_em: "2026-01-01T00:00:00.000Z",
      }));

    const tamanhos: number[] = [];
    const original = supabase.from;
    supabase.from = (t: string) => {
      const b = original(t);
      const orig = { or: b.or.bind(b), in: b.in.bind(b) };
      b.or = (f: string) => (tamanhos.push(f.length), orig.or(f));
      b.in = (c: string, a: unknown[]) => (tamanhos.push(a.join(",").length), orig.in(c, a));
      return b;
    };
    return { ids, tamanhos, restaurar: () => (supabase.from = original) };
  }

  it("conexões e títulos de 250 cards não geram nenhuma consulta gigante e não perdem dados", async () => {
    const { listConexoesEnvolvendoCards, cardTitulosPorId } = await import("./store");
    const { ids, tamanhos, restaurar } = await prepararCenario(250);
    try {
      const conexoes = await listConexoesEnvolvendoCards(ids);
      expect(conexoes).toHaveLength(125);

      const titulos = await cardTitulosPorId(ids);
      expect(Object.keys(titulos)).toHaveLength(250);
      expect(titulos["card-grande-249"]).toBe("Card 249");

      // nenhum filtro passa de ~3 KB (antes: ~19 KB só na lista de conexões)
      expect(Math.max(...tamanhos)).toBeLessThan(3500);
    } finally {
      restaurar();
    }
  });

  it("lista vazia não consulta nada", async () => {
    const { listConexoesEnvolvendoCards, cardTitulosPorId } = await import("./store");
    expect(await listConexoesEnvolvendoCards([])).toEqual([]);
    expect(await cardTitulosPorId([])).toEqual({});
  });
});
