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
  const paisComFilhos = Array.from(
    new Set(db.conexoes.filter((cx) => cardIdsDoPipe.has(cx.cardPaiId)).map((cx) => cx.cardPaiId))
  );

  return (
    <Suspense fallback={null}>
      <PipeBoard
        pipeInicial={pipe}
        fasesIniciais={fases}
        cardsIniciais={cards}
        camposIniciais={campos}
        etiquetasIniciais={etiquetas}
        usuariosIniciais={db.usuarios}
        paisComFilhosIniciais={paisComFilhos}
      />
    </Suspense>
  );
}
