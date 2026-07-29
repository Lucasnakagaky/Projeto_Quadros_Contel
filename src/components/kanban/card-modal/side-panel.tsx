"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api-client";
import { Card, CORES_ETIQUETA, Etiqueta, Usuario } from "@/lib/types";
import { iniciais, cn } from "@/lib/utils";

export function SidePanel({
  boardId,
  card,
  etiquetas,
  membros,
  onCardChanged,
  onLabelsChanged,
}: {
  boardId: string;
  card: Card;
  etiquetas: Etiqueta[];
  membros: Usuario[];
  onCardChanged: (card: Card) => void;
  onLabelsChanged: (etiquetas: Etiqueta[]) => void;
}) {
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [nomeEtiqueta, setNomeEtiqueta] = useState("");
  const [corEtiqueta, setCorEtiqueta] = useState(CORES_ETIQUETA[0]);

  async function alternarEtiqueta(labelId: string) {
    try {
      const atualizado = await api.post<Card>(`/api/cards/${card.id}/labels/${labelId}`);
      onCardChanged(atualizado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar etiqueta");
    }
  }

  async function criarEtiqueta() {
    if (!nomeEtiqueta.trim()) return;
    try {
      const etiqueta = await api.post<Etiqueta>(`/api/boards/${boardId}/labels`, {
        nome: nomeEtiqueta.trim(),
        cor: corEtiqueta,
      });
      onLabelsChanged([...etiquetas, etiqueta]);
      setNomeEtiqueta("");
      setCriandoEtiqueta(false);
      toast.success("Etiqueta criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etiqueta");
    }
  }

  async function alternarResponsavel(userId: string) {
    try {
      const atualizado = await api.post<Card>(`/api/cards/${card.id}/assignees/${userId}`);
      onCardChanged(atualizado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar responsável");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Label>Adicionar ao Card</Label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-500">Etiquetas</span>
        <div className="flex flex-col gap-1">
          {etiquetas.map((etiqueta) => (
            <label
              key={etiqueta.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
            >
              <Checkbox
                checked={card.etiquetaIds.includes(etiqueta.id)}
                onCheckedChange={() => alternarEtiqueta(etiqueta.id)}
              />
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: etiqueta.cor }}
              />
              <span className="text-sm text-slate-700">{etiqueta.nome}</span>
            </label>
          ))}
        </div>

        {criandoEtiqueta ? (
          <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
            <Input
              autoFocus
              placeholder="Nome da etiqueta"
              value={nomeEtiqueta}
              onChange={(e) => setNomeEtiqueta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarEtiqueta()}
            />
            <div className="flex flex-wrap gap-1.5">
              {CORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCorEtiqueta(c)}
                  className={cn(
                    "h-6 w-6 rounded-full",
                    corEtiqueta === c && "ring-2 ring-slate-900 ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={criarEtiqueta}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCriandoEtiqueta(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCriandoEtiqueta(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Plus size={14} />
            Criar nova etiqueta
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-500">Responsáveis</span>
        <div className="flex flex-col gap-1">
          {membros.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum membro no quadro</p>
          )}
          {membros.map((usuario) => (
            <label
              key={usuario.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
            >
              <Checkbox
                checked={card.responsavelIds.includes(usuario.id)}
                onCheckedChange={() => alternarResponsavel(usuario.id)}
              />
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                style={{ backgroundColor: usuario.corAvatar }}
              >
                {iniciais(usuario.nome)}
              </span>
              <span className="text-sm text-slate-700">{usuario.nome}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
