"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { Campo, Card, Etiqueta } from "@/lib/types";
import { EtiquetaFormModal } from "./etiqueta-form-modal";

/**
 * Tela de administração das etiquetas do pipe — único lugar onde editar/excluir uma
 * etiqueta é possível (o popover rápido do card só busca/aplica/cria). Acessível pelo
 * cabeçalho do pipe (pipe-header.tsx).
 */
export function EtiquetasManagerModal({
  open,
  onOpenChange,
  pipeId,
  etiquetas,
  onEtiquetasChanged,
  cards,
  campos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeId: string;
  etiquetas: Etiqueta[];
  onEtiquetasChanged: (etiquetas: Etiqueta[]) => void;
  cards: Card[];
  campos: Campo[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [etiquetaEditando, setEtiquetaEditando] = useState<Etiqueta | undefined>(undefined);
  const [etiquetaParaExcluir, setEtiquetaParaExcluir] = useState<Etiqueta | null>(null);

  // Mapa id -> quantidade de cards que usam, calculado uma vez (não por linha/render) — usado
  // só na confirmação de exclusão, pra avisar quantos cards perdem a etiqueta.
  const contagemUso = useMemo(() => {
    const campoEtiquetas = campoPorTipo(campos, "etiquetas");
    const mapa = new Map<string, number>();
    if (!campoEtiquetas) return mapa;
    for (const card of cards) {
      for (const id of stringArray(card.valoresCampos[campoEtiquetas.id])) {
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
      }
    }
    return mapa;
  }, [cards, campos]);

  function abrirCriacao() {
    setEtiquetaEditando(undefined);
    setModalAberto(true);
  }

  function abrirEdicao(etiqueta: Etiqueta) {
    setEtiquetaEditando(etiqueta);
    setModalAberto(true);
  }

  async function salvar(nome: string, cor: string) {
    try {
      if (etiquetaEditando) {
        const atualizada = await api.patch<Etiqueta>(
          `/api/pipes/${pipeId}/etiquetas/${etiquetaEditando.id}`,
          { nome, cor }
        );
        onEtiquetasChanged(etiquetas.map((e) => (e.id === atualizada.id ? atualizada : e)));
        toast.success("Etiqueta atualizada");
      } else {
        const criada = await api.post<Etiqueta>(`/api/pipes/${pipeId}/etiquetas`, { nome, cor });
        onEtiquetasChanged([...etiquetas, criada]);
        toast.success("Etiqueta criada");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar etiqueta");
    }
  }

  async function confirmarExclusao() {
    if (!etiquetaParaExcluir) return;
    const alvo = etiquetaParaExcluir;
    try {
      await api.delete(`/api/pipes/${pipeId}/etiquetas/${alvo.id}`);
      onEtiquetasChanged(etiquetas.filter((e) => e.id !== alvo.id));
      toast.success("Etiqueta excluída");
      setEtiquetaParaExcluir(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir etiqueta");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Gerenciar etiquetas</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 px-6 pb-6">
            {etiquetas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma etiqueta cadastrada neste pipe</p>
            ) : (
              <div className="flex flex-col gap-1">
                {etiquetas.map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: e.cor }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{e.nome}</span>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(e)}
                      aria-label={`Editar etiqueta ${e.nome}`}
                      className="shrink-0 text-slate-400 hover:text-slate-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtiquetaParaExcluir(e)}
                      aria-label={`Excluir etiqueta ${e.nome}`}
                      className="shrink-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" className="self-start" onClick={abrirCriacao}>
              <Plus size={14} />
              Criar nova etiqueta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EtiquetaFormModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        etiqueta={etiquetaEditando}
        onSalvar={salvar}
      />

      <Dialog
        open={etiquetaParaExcluir !== null}
        onOpenChange={(o) => !o && setEtiquetaParaExcluir(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Excluir etiqueta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            {etiquetaParaExcluir && (
              <p className="text-sm text-slate-600">
                A etiqueta{" "}
                <span className="font-semibold" style={{ color: etiquetaParaExcluir.cor }}>
                  {etiquetaParaExcluir.nome}
                </span>{" "}
                é usada em{" "}
                <span className="font-semibold">
                  {contagemUso.get(etiquetaParaExcluir.id) ?? 0}{" "}
                  {(contagemUso.get(etiquetaParaExcluir.id) ?? 0) === 1 ? "card" : "cards"}
                </span>{" "}
                atualmente. Ela será removida de todos eles — os cards não serão apagados.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEtiquetaParaExcluir(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmarExclusao}>
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
