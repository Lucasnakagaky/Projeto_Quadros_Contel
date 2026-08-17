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

const { createCampo, createCard, createPipe, listFasesByPipe, updateCampo, updateCard } = await import(
  "./store"
);

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
