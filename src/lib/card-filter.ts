import { Card } from "./types";
import { normalizarTexto } from "./utils";
import { stringArray } from "./campo-utils";

export type ColumnsMap = Record<string, string[]>;

export interface ResultadoFiltro {
  /** Mesmo formato de `columns` (faseId -> ids ordenados), só que sem os cards que não casam. */
  columnsFiltradas: ColumnsMap;
  /** Quantos cards continuam visíveis somando todas as fases. */
  total: number;
}

/**
 * Um card casa quando o termo aparece no título OU no nome de alguma etiqueta dele.
 * Compara sempre em texto normalizado (sem acento, minúsculo) e por trecho parcial,
 * então "urg" acha "Urgente" e "manutencao" acha "Manutenção".
 */
export function cardCorresponde(
  card: Card,
  termoNormalizado: string,
  campoEtiquetasId: string | undefined,
  nomeNormalizadoPorEtiquetaId: Map<string, string>
): boolean {
  if (normalizarTexto(card.titulo).includes(termoNormalizado)) return true;
  if (!campoEtiquetasId) return false;
  return stringArray(card.valoresCampos[campoEtiquetasId]).some((etiquetaId) =>
    nomeNormalizadoPorEtiquetaId.get(etiquetaId)?.includes(termoNormalizado)
  );
}

/**
 * Filtra o que aparece em cada coluna sem mexer na estrutura do quadro: as fases continuam
 * todas presentes (mesmo que fiquem vazias) e cada card permanece na sua fase de origem —
 * o filtro só oculta. Não altera `columns` nem nenhum dado persistido.
 *
 * Recebe o índice de etiquetas já pronto (id -> nome normalizado) para não refazer esse
 * trabalho a cada tecla digitada.
 */
export function filtrarColunas(
  columns: ColumnsMap,
  cardsById: Record<string, Card>,
  termo: string,
  campoEtiquetasId: string | undefined,
  nomeNormalizadoPorEtiquetaId: Map<string, string>
): ResultadoFiltro {
  const termoNormalizado = normalizarTexto(termo);

  // Sem termo não há filtro: devolve a mesma referência para não invalidar memos à toa.
  if (!termoNormalizado) {
    let total = 0;
    for (const ids of Object.values(columns)) total += ids.length;
    return { columnsFiltradas: columns, total };
  }

  const columnsFiltradas: ColumnsMap = {};
  let total = 0;

  for (const [faseId, ids] of Object.entries(columns)) {
    const visiveis = ids.filter((id) => {
      const card = cardsById[id];
      return (
        card !== undefined &&
        cardCorresponde(card, termoNormalizado, campoEtiquetasId, nomeNormalizadoPorEtiquetaId)
      );
    });
    columnsFiltradas[faseId] = visiveis;
    total += visiveis.length;
  }

  return { columnsFiltradas, total };
}
