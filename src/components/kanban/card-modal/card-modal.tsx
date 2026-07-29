"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api-client";
import { Card, Etiqueta, Usuario } from "@/lib/types";
import { CardDetail } from "./types";
import { ChecklistSection } from "./checklist-section";
import { CommentsSection } from "./comments-section";
import { AttachmentsSection } from "./attachments-section";
import { PredecessorsSection } from "./predecessors-section";
import { SidePanel } from "./side-panel";

export function CardModal({
  cardId,
  boardId,
  onClose,
  onCardUpdated,
  onCardDeleted,
  onLabelsChanged,
  knownEtiquetas,
  membros,
}: {
  cardId: string;
  boardId: string;
  onClose: () => void;
  onCardUpdated: (card: Card) => void;
  onCardDeleted: (cardId: string) => void;
  onLabelsChanged: (etiquetas: Etiqueta[]) => void;
  knownEtiquetas: Etiqueta[];
  membros: Usuario[];
}) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editandoDescricao, setEditandoDescricao] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<CardDetail>(`/api/cards/${cardId}`);
      setDetail(data);
      setTitulo(data.card.titulo);
      setDescricao(data.card.descricao);
      onCardUpdated(data.card);
      onLabelsChanged(data.etiquetas);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar card");
      onClose();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  useEffect(() => {
    setLoading(true);
    carregar();
  }, [carregar]);

  async function patch(body: Partial<Card>) {
    if (!detail) return;
    try {
      const card = await api.patch<Card>(`/api/cards/${cardId}`, body);
      setDetail((prev) => (prev ? { ...prev, card } : prev));
      onCardUpdated(card);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar card");
    }
  }

  async function mudarStatus(listId: string) {
    try {
      await api.post(`/api/cards/${cardId}/move`, { listId, index: 0 });
      setDetail((prev) => {
        if (!prev) return prev;
        const card = { ...prev.card, listId };
        onCardUpdated(card);
        return { ...prev, card };
      });
      toast.success("Status atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover card");
    }
  }

  async function excluirCard() {
    if (!confirm("Excluir este card? Essa ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/api/cards/${cardId}`);
      toast.success("Card excluído");
      onCardDeleted(cardId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir card");
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  if (loading || !detail) {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-64 max-w-3xl items-center justify-center">
          <span className="text-sm text-slate-400">Carregando card...</span>
        </DialogContent>
      </Dialog>
    );
  }

  const { card } = detail;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-6 min-w-0">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={card.concluido}
                onCheckedChange={(v) => patch({ concluido: Boolean(v) })}
                className="mt-2"
              />
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => titulo.trim() && titulo !== card.titulo && patch({ titulo })}
                className={`h-auto flex-1 border-none px-0 text-xl font-semibold shadow-none focus:ring-0 ${
                  card.concluido ? "text-slate-400 line-through" : "text-slate-900"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={card.listId} onValueChange={mudarStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {detail.listas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data-inicio">Data de Início</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  defaultValue={card.dataInicio ?? ""}
                  onBlur={(e) => patch({ dataInicio: e.target.value || null })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="duracao-horas">Duração (h)</Label>
                <Input
                  id="duracao-horas"
                  type="number"
                  min={0}
                  defaultValue={card.duracaoHoras ?? ""}
                  onBlur={(e) =>
                    patch({
                      duracaoHoras: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="duracao-dias">Duração (dias)</Label>
                <Input
                  id="duracao-dias"
                  type="number"
                  min={0}
                  defaultValue={card.duracaoDias ?? ""}
                  onBlur={(e) =>
                    patch({
                      duracaoDias: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label htmlFor="data-entrega">Data de Entrega Prevista</Label>
                <Input
                  id="data-entrega"
                  type="date"
                  defaultValue={card.dataEntregaPrevista ?? ""}
                  onBlur={(e) =>
                    patch({ dataEntregaPrevista: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Descrição</Label>
              {editandoDescricao ? (
                <Textarea
                  autoFocus
                  rows={5}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  onBlur={() => {
                    setEditandoDescricao(false);
                    if (descricao !== card.descricao) patch({ descricao });
                  }}
                />
              ) : (
                <button
                  onClick={() => setEditandoDescricao(true)}
                  className="min-h-[64px] cursor-text rounded-md border border-transparent px-2 py-2 text-left text-sm text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                >
                  {card.descricao || (
                    <span className="text-slate-400">
                      Clique para adicionar uma descrição...
                    </span>
                  )}
                </button>
              )}
            </div>

            <AttachmentsSection
              cardId={cardId}
              anexos={detail.anexos}
              onChanged={(anexos) => setDetail((prev) => (prev ? { ...prev, anexos } : prev))}
            />

            <ChecklistSection
              cardId={cardId}
              checklists={detail.checklists}
              onChanged={(checklists) =>
                setDetail((prev) => (prev ? { ...prev, checklists } : prev))
              }
            />

            <PredecessorsSection
              cardId={cardId}
              predecessores={detail.predecessores}
              candidatos={detail.candidatosPredecessores}
              onChanged={carregar}
            />

            <CommentsSection
              cardId={cardId}
              comentarios={detail.comentarios}
              onChanged={(comentarios) =>
                setDetail((prev) => (prev ? { ...prev, comentarios } : prev))
              }
            />
          </div>

          <div className="flex flex-col gap-6">
            <SidePanel
              boardId={boardId}
              card={card}
              etiquetas={detail.etiquetas.length ? detail.etiquetas : knownEtiquetas}
              membros={detail.membros.length ? detail.membros : membros}
              onCardChanged={(c) => {
                setDetail((prev) => (prev ? { ...prev, card: c } : prev));
                onCardUpdated(c);
              }}
              onLabelsChanged={(etiquetas) => {
                setDetail((prev) => (prev ? { ...prev, etiquetas } : prev));
                onLabelsChanged(etiquetas);
              }}
            />

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
              <Label>Ações</Label>
              <Button
                variant="outline"
                onClick={() => patch({ concluido: !card.concluido })}
              >
                <CheckCircle2 size={16} />
                {card.concluido ? "Reabrir" : "Concluir"}
              </Button>
              <Button variant="destructive" onClick={excluirCard}>
                <Trash2 size={16} />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
