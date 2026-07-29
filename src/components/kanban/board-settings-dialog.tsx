"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { Board, CORES_QUADRO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BoardSettingsDialog({
  board,
  open,
  onOpenChange,
  onSaved,
}: {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (board: Board) => void;
}) {
  const [nome, setNome] = useState(board.nome);
  const [descricao, setDescricao] = useState(board.descricao);
  const [cor, setCor] = useState(board.cor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(board.nome);
      setDescricao(board.descricao);
      setCor(board.cor);
    }
  }, [open, board]);

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome do quadro");
      return;
    }
    setLoading(true);
    try {
      const atualizado = await api.patch<Board>(`/api/boards/${board.id}`, {
        nome: nome.trim(),
        descricao,
        cor,
      });
      onSaved(atualizado);
      toast.success("Configurações salvas");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Configurações do Quadro
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-nome">Nome</Label>
            <Input id="settings-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-descricao">Descrição</Label>
            <Textarea
              id="settings-descricao"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cor de Fundo</Label>
            <div className="flex flex-wrap gap-2">
              {CORES_QUADRO.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full",
                    cor === c && "ring-2 ring-slate-900 ring-offset-2"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={loading}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
