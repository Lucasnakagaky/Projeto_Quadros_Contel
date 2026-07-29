"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Board } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function ArchivedBoardCard({
  board,
  listCount,
}: {
  board: Board;
  listCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function desarquivar() {
    setLoading(true);
    try {
      await api.patch(`/api/boards/${board.id}`, { arquivado: false });
      toast.success("Quadro restaurado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar quadro");
    } finally {
      setLoading(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir permanentemente o quadro "${board.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/api/boards/${board.id}`);
      toast.success("Quadro excluído");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir quadro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-40 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white opacity-80 shadow-sm">
      <div
        className="flex h-16 shrink-0 items-center px-4"
        style={{ backgroundColor: board.cor }}
      >
        <h3 className="truncate font-semibold text-white">{board.nome}</h3>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <span className="text-xs font-medium text-slate-400">
          {listCount} {listCount === 1 ? "lista" : "listas"}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={loading} onClick={desarquivar}>
            <ArchiveRestore size={14} />
            Desarquivar
          </Button>
          <Button size="sm" variant="destructive" disabled={loading} onClick={excluir}>
            <Trash2 size={14} />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
