"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { Card } from "@/lib/types";

export function PredecessorsSection({
  cardId,
  predecessores,
  candidatos,
  onChanged,
}: {
  cardId: string;
  predecessores: Card[];
  candidatos: Card[];
  onChanged: () => void;
}) {
  const [selecionado, setSelecionado] = useState<string>("");

  const disponiveis = candidatos.filter(
    (c) => !predecessores.some((p) => p.id === c.id)
  );

  async function alternar(predecessorId: string) {
    try {
      await api.post(`/api/cards/${cardId}/predecessors/${predecessorId}`);
      setSelecionado("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar predecessora");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Predecessores</Label>

      {predecessores.length > 0 && (
        <ul className="flex flex-col gap-1">
          {predecessores.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            >
              <span className="truncate text-slate-700">{p.titulo}</span>
              <button
                onClick={() => alternar(p.id)}
                className="text-slate-400 hover:text-red-600"
                aria-label="Remover predecessora"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Select value={selecionado || undefined} onValueChange={setSelecionado}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Filtrar por..." />
          </SelectTrigger>
          <SelectContent>
            {disponiveis.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-slate-400">
                Nenhuma tarefa disponível
              </div>
            ) : (
              disponiveis.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.titulo}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!selecionado}
          onClick={() => selecionado && alternar(selecionado)}
        >
          <Plus size={14} />
          Adicionar tarefa Predecessora
        </Button>
      </div>
    </div>
  );
}
