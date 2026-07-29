"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api-client";
import { Checklist } from "@/lib/types";

export function ChecklistSection({
  cardId,
  checklists,
  onChanged,
}: {
  cardId: string;
  checklists: Checklist[];
  onChanged: (checklists: Checklist[]) => void;
}) {
  const [novoItemPorChecklist, setNovoItemPorChecklist] = useState<Record<string, string>>(
    {}
  );

  async function adicionarChecklist() {
    try {
      const checklist = await api.post<Checklist>(`/api/cards/${cardId}/checklists`, {
        titulo: "Checklist",
      });
      onChanged([...checklists, checklist]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar checklist");
    }
  }

  async function excluirChecklist(id: string) {
    try {
      await api.delete(`/api/checklists/${id}`);
      onChanged(checklists.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir checklist");
    }
  }

  async function adicionarItem(checklistId: string) {
    const texto = (novoItemPorChecklist[checklistId] ?? "").trim();
    if (!texto) return;
    try {
      const checklist = await api.post<Checklist>(
        `/api/checklists/${checklistId}/items`,
        { texto }
      );
      onChanged(checklists.map((c) => (c.id === checklistId ? checklist : c)));
      setNovoItemPorChecklist((prev) => ({ ...prev, [checklistId]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar item");
    }
  }

  async function alternarItem(checklistId: string, itemId: string) {
    try {
      const checklist = await api.patch<Checklist>(
        `/api/checklists/${checklistId}/items/${itemId}`
      );
      onChanged(checklists.map((c) => (c.id === checklistId ? checklist : c)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar item");
    }
  }

  async function excluirItem(checklistId: string, itemId: string) {
    try {
      const checklist = await api.delete<Checklist>(
        `/api/checklists/${checklistId}/items/${itemId}`
      );
      onChanged(checklists.map((c) => (c.id === checklistId ? checklist : c)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover item");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>SubTarefas</Label>
        <Button size="sm" variant="outline" onClick={adicionarChecklist}>
          <Plus size={14} />
          Adicionar Checklist
        </Button>
      </div>

      {checklists.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum checklist ainda</p>
      ) : (
        <div className="flex flex-col gap-4">
          {checklists.map((checklist) => {
            const total = checklist.itens.length;
            const feitos = checklist.itens.filter((i) => i.concluido).length;
            return (
              <div key={checklist.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {checklist.titulo}{" "}
                    {total > 0 && (
                      <span className="text-xs font-normal text-slate-400">
                        ({feitos}/{total})
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => excluirChecklist(checklist.id)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Excluir checklist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <ul className="flex flex-col gap-1">
                  {checklist.itens.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={() => alternarItem(checklist.id, item.id)}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          item.concluido ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        {item.texto}
                      </span>
                      <button
                        onClick={() => excluirItem(checklist.id, item.id)}
                        className="text-slate-300 hover:text-red-600"
                        aria-label="Remover item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={novoItemPorChecklist[checklist.id] ?? ""}
                    onChange={(e) =>
                      setNovoItemPorChecklist((prev) => ({
                        ...prev,
                        [checklist.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") adicionarItem(checklist.id);
                    }}
                  />
                  <Button size="sm" onClick={() => adicionarItem(checklist.id)}>
                    Adicionar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
