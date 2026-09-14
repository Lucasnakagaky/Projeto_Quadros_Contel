"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLink as Link } from "@/components/ui/app-link";
import { ArrowLeft } from "lucide-react";
import { getPipe, listTrashByPipe } from "@/lib/store";
import type { Card, Pipe } from "@/lib/types";
import { LixeiraCard } from "@/components/pipe/lixeira-card";
import { useAuth } from "@/components/auth-provider";

// Rota estática fixa (sem [pipeId]) — mesma razão do /pipes/quadro: o id do pipe vem de
// ?id=, não de um segmento dinâmico, então funciona pra qualquer pipe sem precisar de
// rebuild/generateStaticParams.

function LixeiraContent() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const pipeId = searchParams.get("id");
  const [pipe, setPipe] = useState<Pipe | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!session || !pipeId) return;
    let vivo = true;
    (async () => {
      try {
        const [p, cs] = await Promise.all([getPipe(pipeId), listTrashByPipe(pipeId)]);
        if (!vivo) return;
        setPipe(p);
        setCards(cs);
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [pipeId, session]);

  if (!pipeId || erro) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 text-center text-slate-500">
        Pipe não encontrado.{" "}
        <Link href="/pipes" className="text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href={`/pipes/quadro?id=${pipeId}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Voltar para {pipe?.nome ?? "o pipe"}
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Lixeira</h1>

      {cards === null ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="text-slate-500">A lixeira está vazia.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <LixeiraCard
              key={card.id}
              card={card}
              onRemovido={() => setCards((cs) => (cs ?? []).filter((c) => c.id !== card.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LixeiraPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-slate-400">Carregando…</p>}>
      <LixeiraContent />
    </Suspense>
  );
}
