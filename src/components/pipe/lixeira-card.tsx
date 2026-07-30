"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Card } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { tempoRelativo } from "@/lib/utils";

export function LixeiraCard({ card }: { card: Card }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function restaurar() {
    setLoading(true);
    try {
      await api.post(`/api/cards/${card.id}/restaurar`);
      toast.success("Card restaurado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar card");
    } finally {
      setLoading(false);
    }
  }

  async function excluirDefinitivo() {
    if (
      !confirm(`Excluir permanentemente o card "${card.titulo}"? Essa ação não pode ser desfeita.`)
    ) {
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/api/cards/${card.id}`);
      toast.success("Card excluído definitivamente");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{card.titulo}</p>
        <span className="text-xs text-slate-400">Excluído {tempoRelativo(card.excluidoEm)}</span>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" disabled={loading} onClick={restaurar}>
          <ArchiveRestore size={14} />
          Restaurar
        </Button>
        <Button size="sm" variant="destructive" disabled={loading} onClick={excluirDefinitivo}>
          <Trash2 size={14} />
          Excluir definitivamente
        </Button>
      </div>
    </div>
  );
}
