import { notFound } from "next/navigation";
import { Suspense } from "react";
import { readDb } from "@/lib/db";
import { CardRelacionado } from "@/lib/types";
import { PipeBoard } from "@/components/pipe/pipe-board";

export default async function PipePage({
  params,
}: {
  params: Promise<{ pipeId: string }>;
}) {
  const { pipeId } = await params;
  const db = await readDb();
  const pipe = db.pipes.find((p) => p.id === pipeId);
  if (!pipe) notFound();

  const fases = db.fases.filter((f) => f.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
  const cards = db.cards
    .filter((c) => c.pipeId === pipeId && !c.excluido)
    .sort((a, b) => a.ordem - b.ordem);
  const campos = db.campos.filter((c) => c.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
  const etiquetas = db.etiquetas.filter((e) => e.pipeId === pipeId);

  const cardIdsDoPipe = new Set(cards.map((c) => c.id));

  const cardsFilhosIds = Array.from(
    new Set(db.conexoes.filter((cx) => cardIdsDoPipe.has(cx.cardFilhoId)).map((cx) => cx.cardFilhoId))
  );

  // Nomes reais dos cards relacionados (pai/filho), para exibir na face do card no Kanban.
  const filhosPorCard: Record<string, CardRelacionado[]> = {};
  const paisPorCard: Record<string, CardRelacionado[]> = {};
  db.conexoes.forEach((cx) => {
    if (cardIdsDoPipe.has(cx.cardPaiId)) {
      const filho = db.cards.find((c) => c.id === cx.cardFilhoId);
      if (filho) {
        (filhosPorCard[cx.cardPaiId] ??= []).push({ id: filho.id, titulo: filho.titulo });
      }
    }
    if (cardIdsDoPipe.has(cx.cardFilhoId)) {
      const pai = db.cards.find((c) => c.id === cx.cardPaiId);
      if (pai) {
        (paisPorCard[cx.cardFilhoId] ??= []).push({ id: pai.id, titulo: pai.titulo });
      }
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
        usuariosIniciais={db.usuarios}
        cardsFilhosIniciais={cardsFilhosIds}
        filhosPorCardIniciais={filhosPorCard}
        paisPorCardIniciais={paisPorCard}
      />
    </Suspense>
  );
}
