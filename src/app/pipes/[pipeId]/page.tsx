import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  cardTitulosPorId,
  getPipeFull,
  listConexoesEnvolvendoCards,
} from "@/lib/store";
import { CardRelacionado } from "@/lib/types";
import { PipeBoard } from "@/components/pipe/pipe-board";

export default async function PipePage({
  params,
}: {
  params: Promise<{ pipeId: string }>;
}) {
  const { pipeId } = await params;

  let full;
  try {
    full = await getPipeFull(pipeId);
  } catch {
    notFound();
  }
  const { pipe, fases, campos, cards, etiquetas, usuarios } = full;

  const cardIdsDoPipe = new Set(cards.map((c) => c.id));
  const conexoes = await listConexoesEnvolvendoCards([...cardIdsDoPipe]);

  // Títulos reais dos cards relacionados (podem ser de outro pipe).
  const idsRelacionados = conexoes.flatMap((cx) => [cx.cardPaiId, cx.cardFilhoId]);
  const titulos = await cardTitulosPorId(idsRelacionados);

  const cardsFilhosIds = Array.from(
    new Set(conexoes.filter((cx) => cardIdsDoPipe.has(cx.cardFilhoId)).map((cx) => cx.cardFilhoId))
  );

  const filhosPorCard: Record<string, CardRelacionado[]> = {};
  const paisPorCard: Record<string, CardRelacionado[]> = {};
  conexoes.forEach((cx) => {
    if (cardIdsDoPipe.has(cx.cardPaiId) && titulos[cx.cardFilhoId]) {
      (filhosPorCard[cx.cardPaiId] ??= []).push({ id: cx.cardFilhoId, titulo: titulos[cx.cardFilhoId] });
    }
    if (cardIdsDoPipe.has(cx.cardFilhoId) && titulos[cx.cardPaiId]) {
      (paisPorCard[cx.cardFilhoId] ??= []).push({ id: cx.cardPaiId, titulo: titulos[cx.cardPaiId] });
    }
  });

  return (
    <Suspense fallback={null}>
      <PipeBoard
        pipeInicial={pipe}
        fasesIniciais={fases}
        cardsIniciais={cards}
        camposIniciais={campos}
        etiquetasIniciais={etiquetas}
        usuariosIniciais={usuarios}
        cardsFilhosIniciais={cardsFilhosIds}
        filhosPorCardIniciais={filhosPorCard}
        paisPorCardIniciais={paisPorCard}
      />
    </Suspense>
  );
}
