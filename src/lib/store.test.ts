import { describe, expect, it, vi } from "vitest";
import type { DbSchema } from "./types";

vi.mock("./db", () => {
  const db: DbSchema = {
    usuarios: [{ id: "user-1", nome: "Você", email: "voce@exemplo.com", corAvatar: "#000000" }],
    pipes: [],
    fases: [],
    campos: [],
    cards: [],
    conexoes: [],
    cardLinks: [],
    etiquetas: [],
    checklists: [],
    comentarios: [],
    anexos: [],
  };
  return {
    readDb: async () => db,
    mutateDb: async (fn: (db: DbSchema) => unknown) => fn(db),
    writeDb: async () => {},
    CURRENT_USER_ID: "user-1",
  };
});

const {
  createCampo,
  createCard,
  createPipe,
  ensureCardsVinculadosCampo,
  ensureDescricaoDemandaCampo,
  ensureFaseArquivada,
  getCard,
  listCamposByPipe,
  listFasesByPipe,
  updateCampo,
  updateCard,
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
