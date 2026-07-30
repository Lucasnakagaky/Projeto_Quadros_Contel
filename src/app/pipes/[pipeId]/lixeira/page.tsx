import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { readDb } from "@/lib/db";
import { LixeiraCard } from "@/components/pipe/lixeira-card";

export default async function LixeiraPage({
  params,
}: {
  params: Promise<{ pipeId: string }>;
}) {
  const { pipeId } = await params;
  const db = await readDb();
  const pipe = db.pipes.find((p) => p.id === pipeId);
  if (!pipe) notFound();

  const cards = db.cards
    .filter((c) => c.pipeId === pipeId && c.excluido)
    .sort((a, b) => ((a.excluidoEm ?? "") < (b.excluidoEm ?? "") ? 1 : -1));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href={`/pipes/${pipeId}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Voltar para {pipe.nome}
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Lixeira</h1>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="text-slate-500">A lixeira está vazia.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <LixeiraCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
