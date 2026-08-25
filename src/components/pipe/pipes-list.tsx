"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Pipe } from "@/lib/types";
import { PipeCard } from "./pipe-card";
import { EditarPipeModal } from "./editar-pipe-modal";
import { ExcluirPipeModal } from "./excluir-pipe-modal";

interface PipeComContagem {
  pipe: Pipe;
  faseCount: number;
  cardCount: number;
}

export function PipesList({ initialPipes }: { initialPipes: PipeComContagem[] }) {
  const [pipes, setPipes] = useState(initialPipes);
  const [pipeParaEditar, setPipeParaEditar] = useState<Pipe | null>(null);
  const [pipeParaExcluir, setPipeParaExcluir] = useState<Pipe | null>(null);

  async function handleSalvarEdicao(values: { nome: string }) {
    if (!pipeParaEditar) return;
    try {
      const atualizado = await api.patch<Pipe>(`/api/pipes/${pipeParaEditar.id}`, values);
      setPipes((prev) =>
        prev.map((p) => (p.pipe.id === atualizado.id ? { ...p, pipe: atualizado } : p))
      );
      toast.success("Pipe atualizado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pipe");
    }
  }

  async function handleConfirmarExclusao() {
    if (!pipeParaExcluir) return;
    const alvo = pipeParaExcluir;
    try {
      await api.delete(`/api/pipes/${alvo.id}`);
      setPipes((prev) => prev.filter((p) => p.pipe.id !== alvo.id));
      toast.success("Pipe excluído com sucesso!");
      setPipeParaExcluir(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir pipe");
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pipes.map(({ pipe, faseCount, cardCount }) => (
          <PipeCard
            key={pipe.id}
            pipe={pipe}
            faseCount={faseCount}
            cardCount={cardCount}
            onEdit={() => setPipeParaEditar(pipe)}
            onRequestDelete={() => setPipeParaExcluir(pipe)}
          />
        ))}
      </div>

      <EditarPipeModal
        open={pipeParaEditar !== null}
        onOpenChange={(open) => !open && setPipeParaEditar(null)}
        pipe={pipeParaEditar}
        onSubmit={handleSalvarEdicao}
      />

      <ExcluirPipeModal
        open={pipeParaExcluir !== null}
        onOpenChange={(open) => !open && setPipeParaExcluir(null)}
        pipeNome={pipeParaExcluir?.nome ?? ""}
        onConfirm={handleConfirmarExclusao}
      />
    </>
  );
}
