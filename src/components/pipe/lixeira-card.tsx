"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Card } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { tempoRelativo } from "@/lib/utils";

export function LixeiraCard({ card, onRemovido }: { card: Card; onRemovido: () => void }) {
  const [loading, setLoading] = useState(false);

  async function restaurar() {
    setLoading(true);
    try {
      await api.post(`/api/cards/${card.id}/restaurar`);
      toast.success("Card restaurado");
      onRemovido();
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
      onRemovido();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800" title={card.titulo}>{card.titulo}</p>
        <span className="text-xs text-slate-500">Excluído {tempoRelativo(card.excluidoEm)}</span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
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
