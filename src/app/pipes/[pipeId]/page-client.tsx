"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cardTitulosPorId, getPipeFull, listConexoesEnvolvendoCards } from "@/lib/store";
import { CardRelacionado } from "@/lib/types";
import { PipeBoard } from "@/components/pipe/pipe-board";
import { useAuth } from "@/components/auth-provider";

type Props = React.ComponentProps<typeof PipeBoard>;

export function PipeBoardClient({ pipeId }: { pipeId: string }) {
  const { session } = useAuth();
  const [props, setProps] = useState<Props | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!session) return;
    let vivo = true;
    (async () => {
      try {
        const { pipe, fases, campos, cards, etiquetas, usuarios } = await getPipeFull(pipeId);
        const cardIdsDoPipe = new Set(cards.map((c) => c.id));
        const conexoes = await listConexoesEnvolvendoCards([...cardIdsDoPipe]);
        const titulos = await cardTitulosPorId(
          conexoes.flatMap((cx) => [cx.cardPaiId, cx.cardFilhoId])
        );

        const cardsFilhosIniciais = Array.from(
          new Set(
            conexoes.filter((cx) => cardIdsDoPipe.has(cx.cardFilhoId)).map((cx) => cx.cardFilhoId)
          )
        );
        const filhosPorCardIniciais: Record<string, CardRelacionado[]> = {};
        const paisPorCardIniciais: Record<string, CardRelacionado[]> = {};
        conexoes.forEach((cx) => {
          if (cardIdsDoPipe.has(cx.cardPaiId) && titulos[cx.cardFilhoId]) {
            (filhosPorCardIniciais[cx.cardPaiId] ??= []).push({
              id: cx.cardFilhoId,
              titulo: titulos[cx.cardFilhoId],
            });
          }
          if (cardIdsDoPipe.has(cx.cardFilhoId) && titulos[cx.cardPaiId]) {
            (paisPorCardIniciais[cx.cardFilhoId] ??= []).push({
              id: cx.cardPaiId,
              titulo: titulos[cx.cardPaiId],
            });
          }
        });

        if (!vivo) return;
        setProps({
          pipeInicial: pipe,
          fasesIniciais: fases,
          cardsIniciais: cards,
          camposIniciais: campos,
          etiquetasIniciais: etiquetas,
          usuariosIniciais: usuarios,
          cardsFilhosIniciais,
          filhosPorCardIniciais,
          paisPorCardIniciais,
        });
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [pipeId, session]);

  if (erro) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-slate-500">Pipe não encontrado.</p>
        <Link href="/pipes" className="text-sm text-blue-600 hover:underline">
          Voltar aos pipes
        </Link>
      </div>
    );
  }
  if (!props) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-400">
        Carregando quadro…
      </div>
    );
  }
  return <PipeBoard {...props} />;
}
