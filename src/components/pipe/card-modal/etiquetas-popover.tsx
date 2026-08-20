"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api-client";
import { CORES_ETIQUETA, Etiqueta } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EtiquetasPopover({
  pipeId,
  etiquetas,
  selecionadas,
  onSalvarSelecao,
  onEtiquetaCriada,
  onEtiquetaAtualizada,
  onEtiquetaExcluida,
}: {
  pipeId: string;
  etiquetas: Etiqueta[];
  selecionadas: string[];
  onSalvarSelecao: (ids: string[]) => void;
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
  onEtiquetaAtualizada: (etiqueta: Etiqueta) => void;
  onEtiquetaExcluida: (etiquetaId: string) => void;
}) {
  return (
    <Popover
      trigger={({ toggle }) => (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={toggle}>
          <Tag size={12} />
          Adicionar etiqueta
        </Button>
      )}
    >
      {() => (
        <Conteudo
          pipeId={pipeId}
          etiquetas={etiquetas}
          selecionadas={selecionadas}
          onSalvarSelecao={onSalvarSelecao}
          onEtiquetaCriada={onEtiquetaCriada}
          onEtiquetaAtualizada={onEtiquetaAtualizada}
          onEtiquetaExcluida={onEtiquetaExcluida}
        />
      )}
    </Popover>
  );
}

function Conteudo({
  pipeId,
  etiquetas,
  selecionadas,
  onSalvarSelecao,
  onEtiquetaCriada,
  onEtiquetaAtualizada,
  onEtiquetaExcluida,
}: {
  pipeId: string;
  etiquetas: Etiqueta[];
  selecionadas: string[];
  onSalvarSelecao: (ids: string[]) => void;
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
  onEtiquetaAtualizada: (etiqueta: Etiqueta) => void;
  onEtiquetaExcluida: (etiquetaId: string) => void;
}) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_ETIQUETA[0]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [corEdicao, setCorEdicao] = useState(CORES_ETIQUETA[0]);

  function alternar(id: string) {
    onSalvarSelecao(
      selecionadas.includes(id) ? selecionadas.filter((x) => x !== id) : [...selecionadas, id]
    );
  }

  function iniciarEdicao(etiqueta: Etiqueta) {
    setCriando(false);
    setEditandoId(etiqueta.id);
    setNomeEdicao(etiqueta.nome);
    setCorEdicao(etiqueta.cor);
  }

  async function criar() {
    if (!nome.trim()) return;
    try {
      const etiqueta = await api.post<Etiqueta>(`/api/pipes/${pipeId}/etiquetas`, {
        nome: nome.trim(),
        cor,
      });
      onEtiquetaCriada(etiqueta);
      onSalvarSelecao([...selecionadas, etiqueta.id]);
      setNome("");
      setCriando(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etiqueta");
    }
  }

  async function salvarEdicao() {
    if (!editandoId || !nomeEdicao.trim()) return;
    try {
      const atualizada = await api.patch<Etiqueta>(`/api/pipes/${pipeId}/etiquetas/${editandoId}`, {
        nome: nomeEdicao.trim(),
        cor: corEdicao,
      });
      onEtiquetaAtualizada(atualizada);
      setEditandoId(null);
      toast.success("Etiqueta atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar etiqueta");
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta etiqueta? Ela será removida de todos os cards.")) return;
    try {
      await api.delete(`/api/pipes/${pipeId}/etiquetas/${id}`);
      onEtiquetaExcluida(id);
      if (selecionadas.includes(id)) onSalvarSelecao(selecionadas.filter((x) => x !== id));
      if (editandoId === id) setEditandoId(null);
      toast.success("Etiqueta excluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir etiqueta");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-500">Etiquetas</span>

      {etiquetas.length === 0 && !criando && (
        <p className="text-sm text-slate-400">Nenhuma etiqueta cadastrada</p>
      )}

      {etiquetas.map((e) =>
        editandoId === e.id ? (
          <div key={e.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
            <Input
              autoFocus
              value={nomeEdicao}
              onChange={(ev) => setNomeEdicao(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && salvarEdicao()}
            />
            <div className="flex flex-wrap gap-1.5">
              {CORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCorEdicao(c)}
                  className={cn(
                    "h-6 w-6 rounded-full",
                    corEdicao === c && "ring-2 ring-slate-900 ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={salvarEdicao}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div key={e.id} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <Checkbox checked={selecionadas.includes(e.id)} onCheckedChange={() => alternar(e.id)} />
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
              <span className="truncate text-sm text-slate-700">{e.nome}</span>
            </label>
            <button
              type="button"
              onClick={() => iniciarEdicao(e)}
              className="shrink-0 text-slate-400 opacity-0 hover:text-slate-700 group-hover:opacity-100"
              aria-label={`Editar etiqueta ${e.nome}`}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => excluir(e.id)}
              className="shrink-0 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
              aria-label={`Excluir etiqueta ${e.nome}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )
      )}

      {criando ? (
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
          <Input
            autoFocus
            placeholder="Nome da etiqueta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
          />
          <div className="flex flex-wrap gap-1.5">
            {CORES_ETIQUETA.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={cn("h-6 w-6 rounded-full", cor === c && "ring-2 ring-slate-900 ring-offset-1")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={criar}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="flex items-center gap-1 self-start text-xs text-blue-600 hover:underline"
        >
          <Plus size={12} />
          Criar nova etiqueta
        </button>
      )}
    </div>
  );
}
