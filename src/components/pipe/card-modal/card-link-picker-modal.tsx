"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, Fase } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CardLinkPickerModal({
  open,
  onOpenChange,
  titulo,
  candidatos,
  fases,
  cardinalidade,
  carregando,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  candidatos: Card[];
  fases: Fase[];
  cardinalidade: "unico" | "varios";
  carregando: boolean;
  onConfirmar: (ids: string[]) => void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Reseta busca/seleção sempre que o modal reabre (padrão já usado no CampoConfigModal
  // para sincronizar estado local com a prop `open` sem useEffect).
  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) {
      setBusca("");
      setSelecionados([]);
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return candidatos;
    return candidatos.filter((c) => c.titulo.toLowerCase().includes(termo));
  }, [candidatos, busca]);

  function alternar(cardId: string) {
    if (cardinalidade === "unico") {
      setSelecionados((prev) => (prev[0] === cardId ? [] : [cardId]));
      return;
    }
    setSelecionados((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }

  function confirmar() {
    if (selecionados.length === 0) return;
    onConfirmar(selecionados);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-6 pb-6">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              autoFocus
              placeholder="Buscar por título..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {carregando ? (
              <p className="py-6 text-center text-sm text-slate-400">Carregando cards...</p>
            ) : filtrados.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                {candidatos.length === 0
                  ? "Nenhum outro card disponível neste pipe"
                  : "Nenhum card encontrado"}
              </p>
            ) : (
              filtrados.map((c) => {
                const fase = fases.find((f) => f.id === c.faseId);
                const marcado = selecionados.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50",
                      marcado && "bg-blue-50/60"
                    )}
                  >
                    <Checkbox checked={marcado} onCheckedChange={() => alternar(c.id)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{c.titulo}</span>
                    {fase && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: `${fase.cor}1f`, color: fase.cor }}
                      >
                        {fase.nome}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={selecionados.length === 0}>
              Vincular{selecionados.length > 0 ? ` (${selecionados.length})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
