import { describe, expect, it } from "vitest";
import { filtrarColunas, ColumnsMap } from "./card-filter";
import { normalizarTexto } from "./utils";
import { Card } from "./types";

const CAMPO_ETIQUETAS_ID = "campo-etiquetas";

const ETIQUETA_URGENTE = "et-urgente";
const ETIQUETA_NORMAL = "et-normal";

const indiceEtiquetas = new Map([
  [ETIQUETA_URGENTE, normalizarTexto("Urgente")],
  [ETIQUETA_NORMAL, normalizarTexto("Normal")],
]);

function card(id: string, faseId: string, titulo: string, etiquetaIds: string[] = []): Card {
  return {
    id,
    pipeId: "pipe-1",
    faseId,
    titulo,
    valoresCampos: etiquetaIds.length > 0 ? { [CAMPO_ETIQUETAS_ID]: etiquetaIds } : {},
    criadoPorId: "user-1",
    criadoEm: "2026-01-01T00:00:00.000Z",
    atualizadoEm: "2026-01-01T00:00:00.000Z",
    historico: [],
    ordem: 0,
    excluido: false,
    excluidoEm: null,
  };
}

// Quadro com a mesma etiqueta "Urgente" espalhada por três fases diferentes.
const CARDS = [
  card("c1", "entrada", "Troca de equipamento", [ETIQUETA_URGENTE]),
  card("c2", "desenvolvimento", "Problema no servidor", [ETIQUETA_URGENTE]),
  card("c3", "testes", "Manutenção preventiva", [ETIQUETA_URGENTE]),
  card("c4", "entrega", "Solicitação de compra", [ETIQUETA_NORMAL]),
  card("c5", "entrada", "Solicitação de manutenção", []),
];

const cardsById = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const columns: ColumnsMap = {
  entrada: ["c1", "c5"],
  desenvolvimento: ["c2"],
  testes: ["c3"],
  entrega: ["c4"],
};

function filtrar(termo: string) {
  return filtrarColunas(columns, cardsById, termo, CAMPO_ETIQUETAS_ID, indiceEtiquetas);
}

describe("filtrarColunas", () => {
  it("sem termo, devolve as colunas originais pela mesma referência e conta todos os cards", () => {
    const { columnsFiltradas, total } = filtrar("");

    expect(columnsFiltradas).toBe(columns);
    expect(total).toBe(5);
  });

  it("trata um termo só de espaços como ausência de filtro", () => {
    const { columnsFiltradas, total } = filtrar("   ");

    expect(columnsFiltradas).toBe(columns);
    expect(total).toBe(5);
  });

  it("filtra por trecho parcial do título", () => {
    const { columnsFiltradas, total } = filtrar("manut");

    expect(total).toBe(2);
    expect(columnsFiltradas.testes).toEqual(["c3"]);
    expect(columnsFiltradas.entrada).toEqual(["c5"]);
  });

  it("filtra por etiqueta, alcançando cards cujo título não contém o termo", () => {
    const { columnsFiltradas, total } = filtrar("Urgente");

    expect(total).toBe(3);
    expect(columnsFiltradas.entrada).toEqual(["c1"]);
    expect(columnsFiltradas.desenvolvimento).toEqual(["c2"]);
    expect(columnsFiltradas.testes).toEqual(["c3"]);
    expect(columnsFiltradas.entrega).toEqual([]);
  });

  it("mantém todas as fases presentes, mesmo as que ficaram sem nenhum card", () => {
    const { columnsFiltradas } = filtrar("Urgente");

    expect(Object.keys(columnsFiltradas).sort()).toEqual(Object.keys(columns).sort());
    expect(columnsFiltradas.entrega).toEqual([]);
  });

  it("ignora diferença entre maiúsculas e minúsculas", () => {
    expect(filtrar("urgente").total).toBe(3);
    expect(filtrar("URGENTE").total).toBe(3);
    expect(filtrar("UrGeNtE").total).toBe(3);
  });

  it("encontra etiqueta por trecho parcial", () => {
    expect(filtrar("urg").total).toBe(3);
  });

  it("ignora acentuação nos dois sentidos", () => {
    expect(filtrar("manutencao").total).toBe(2);
    expect(filtrar("Manutenção").total).toBe(2);
    expect(filtrar("solicitacao").total).toBe(2);
  });

  it("devolve todas as colunas vazias quando nada corresponde", () => {
    const { columnsFiltradas, total } = filtrar("xyz-inexistente");

    expect(total).toBe(0);
    expect(Object.values(columnsFiltradas).every((ids) => ids.length === 0)).toBe(true);
    expect(Object.keys(columnsFiltradas)).toHaveLength(4);
  });

  it("preserva a ordem original dos cards dentro da coluna", () => {
    const { columnsFiltradas } = filtrar("o");

    // "c1" vem antes de "c5" em columns.entrada e essa ordem deve se manter
    expect(columnsFiltradas.entrada).toEqual(["c1", "c5"]);
  });

  it("não altera o objeto columns nem os cards de origem", () => {
    const snapshotColumns = JSON.stringify(columns);
    const snapshotCards = JSON.stringify(cardsById);

    filtrar("Urgente");

    expect(JSON.stringify(columns)).toBe(snapshotColumns);
    expect(JSON.stringify(cardsById)).toBe(snapshotCards);
  });

  it("filtra só pelo título quando o pipe não tem campo de etiquetas", () => {
    const { total } = filtrarColunas(columns, cardsById, "Urgente", undefined, indiceEtiquetas);

    expect(total).toBe(0);
  });

  it("ignora ids de card que não existem mais em cardsById", () => {
    const columnsComFantasma: ColumnsMap = { ...columns, entrada: ["c1", "fantasma"] };

    const { columnsFiltradas, total } = filtrarColunas(
      columnsComFantasma,
      cardsById,
      "Urgente",
      CAMPO_ETIQUETAS_ID,
      indiceEtiquetas
    );

    expect(columnsFiltradas.entrada).toEqual(["c1"]);
    expect(total).toBe(3);
  });
});
