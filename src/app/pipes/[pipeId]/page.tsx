import { notFound } from "next/navigation";
import { Suspense } from "react";
import { readDb } from "@/lib/db";
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
  const contagemFilhosPorCard: Record<string, number> = {};
  db.conexoes.forEach((cx) => {
    if (!cardIdsDoPipe.has(cx.cardPaiId)) return;
    contagemFilhosPorCard[cx.cardPaiId] = (contagemFilhosPorCard[cx.cardPaiId] ?? 0) + 1;
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
        contagemFilhosIniciais={contagemFilhosPorCard}
      />
    </Suspense>
  );
}
