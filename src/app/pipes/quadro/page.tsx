"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLink as Link } from "@/components/ui/app-link";
import { cardTitulosPorId, getPipeFull, listConexoesEnvolvendoCards } from "@/lib/store";
import { CardRelacionado } from "@/lib/types";
import { PipeBoard } from "@/components/pipe/pipe-board";
import { useAuth } from "@/components/auth-provider";

// Rota estática fixa (sem [pipeId]) — o id do pipe vem da query string (?id=...), não de
// um segmento dinâmico. Um segmento dinâmico exigiria generateStaticParams no export
// estático, e todo pipe criado DEPOIS do build ficaria 404 até o próximo deploy (era assim
// antes: /pipes/[pipeId] com dynamicParams=false). Query string é 100% client-side, então um
// pipe novo funciona na hora, sem rebuild.

type Props = React.ComponentProps<typeof PipeBoard>;

function PipeBoardContent() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const pipeId = searchParams.get("id");
  const [props, setProps] = useState<Props | null>(null);
  // null = sem erro. `naoEncontrado` = o pipe não existe (404); senão foi uma falha ao carregar.
  const [erro, setErro] = useState<{ naoEncontrado: boolean; detalhe: string } | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!session || !pipeId) return;
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
      } catch (e) {
        console.error("Falha ao carregar o quadro", e);
        if (vivo) {
          setErro({
            naoEncontrado: (e as { status?: number })?.status === 404,
            detalhe: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [pipeId, session, tentativa]);

  if (!pipeId || erro) {
    const naoEncontrado = !pipeId || !!erro?.naoEncontrado;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-slate-500">
          {naoEncontrado ? "Pipe não encontrado." : "Não foi possível carregar o quadro."}
        </p>
        {!naoEncontrado && erro && <p className="max-w-md text-xs text-slate-400">{erro.detalhe}</p>}
        {!naoEncontrado && (
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setTentativa((n) => n + 1);
            }}
            className="text-sm gdt-focus cursor-pointer rounded text-indigo-600 hover:underline"
          >
            Tentar novamente
          </button>
        )}
        <Link href="/pipes" className="text-sm gdt-focus rounded text-indigo-600 hover:underline">
          Voltar aos pipes
        </Link>
      </div>
    );
  }
  if (!props) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-500">
        Carregando quadro…
      </div>
    );
  }
  return <PipeBoard {...props} />;
}

export default function PipeQuadroPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-500">
          Carregando quadro…
        </div>
      }
    >
      <PipeBoardContent />
    </Suspense>
  );
}
