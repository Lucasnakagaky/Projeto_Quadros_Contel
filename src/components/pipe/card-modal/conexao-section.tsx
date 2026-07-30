"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { Card, Fase } from "@/lib/types";
import { tempoRelativo } from "@/lib/utils";
import { ConexaoResolvida } from "./types";

export function ConexaoSection({
  campoId,
  nomeConexao,
  cardId,
  pipeDestinoId,
  modoConexao,
  cardinalidade,
  relacionadas,
  onConexaoCriada,
  onConexaoRemovida,
  onOpenCard,
}: {
  campoId: string;
  nomeConexao: string;
  cardId: string;
  pipeDestinoId?: string;
  modoConexao: "criar" | "pesquisar_criar";
  cardinalidade: "unico" | "varios";
  relacionadas: ConexaoResolvida[];
  onConexaoCriada: (r: ConexaoResolvida) => void;
  onConexaoRemovida: (conexaoId: string) => void;
  onOpenCard: (cardId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"criar" | "existente">("criar");
  const [fases, setFases] = useState<Fase[]>([]);
  const [candidatos, setCandidatos] = useState<Card[]>([]);
  const [titulo, setTitulo] = useState("");
  const [faseId, setFaseId] = useState("");
  const [cardFilhoId, setCardFilhoId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const atingiuLimite = cardinalidade === "unico" && relacionadas.length >= 1;

  async function abrir() {
    if (!pipeDestinoId) {
      toast.error("Esta conexão não tem um pipe de destino configurado");
      return;
    }
    setAberto(true);
    setModo("criar");
    setTitulo("");
    setCardFilhoId("");
    setCarregando(true);
    try {
      const fasesDestino = await api.get<Fase[]>(`/api/pipes/${pipeDestinoId}/fases`);
      setFases(fasesDestino);
      setFaseId(fasesDestino[0]?.id ?? "");
      if (modoConexao === "pesquisar_criar") {
        const cards = await api.get<Card[]>(`/api/pipes/${pipeDestinoId}/cards`);
        const idsConectados = new Set(relacionadas.map((r) => r.card?.id));
        setCandidatos(cards.filter((c) => c.id !== cardId && !idsConectados.has(c.id)));
      }
    } catch {
      toast.error("Erro ao carregar dados da conexão");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmar() {
    setSalvando(true);
    try {
      if (modo === "existente") {
        if (!cardFilhoId) {
          toast.error("Selecione um card para conectar");
          return;
        }
        const result = await api.post<{ conexao: ConexaoResolvida["conexao"] }>(
          `/api/cards/${cardId}/conexoes`,
          { campoId, modo: "existente", cardFilhoId }
        );
        const card = candidatos.find((c) => c.id === cardFilhoId);
        const fase = fases.find((f) => f.id === card?.faseId);
        onConexaoCriada({ conexao: result.conexao, card, fase });
      } else {
        if (!titulo.trim() || !faseId || !pipeDestinoId) {
          toast.error("Título e fase são obrigatórios");
          return;
        }
        const result = await api.post<{ conexao: ConexaoResolvida["conexao"]; card: Card }>(
          `/api/cards/${cardId}/conexoes`,
          { campoId, modo: "criar", pipeId: pipeDestinoId, faseId, titulo }
        );
        const fase = fases.find((f) => f.id === faseId);
        onConexaoCriada({ conexao: result.conexao, card: result.card, fase });
      }
      toast.success("Card criado com sucesso");
      setAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conexão");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(conexaoId: string) {
    try {
      await api.delete(`/api/cards/${cardId}/conexoes/${conexaoId}`);
      onConexaoRemovida(conexaoId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover conexão");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      <span className="text-sm font-semibold text-slate-700">{nomeConexao}</span>

      {relacionadas.length > 0 && (
        <div className="flex flex-col gap-2">
          {relacionadas.map((r) => (
            <button
              key={r.conexao.id}
              onClick={() => r.card && onOpenCard(r.card.id)}
              className="group flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 text-left hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-800">
                  {r.card?.titulo ?? "Card removido"}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    remover(r.conexao.id);
                  }}
                  className="text-slate-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                >
                  <X size={14} />
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                <span>Pipe: {r.pipe?.nome ?? "—"}</span>
                <span>Criado {tempoRelativo(r.card?.criadoEm)}</span>
                {r.fase && (
                  <span
                    className="rounded-full px-1.5 py-0.5 font-medium"
                    style={{ backgroundColor: `${r.fase.cor}22`, color: r.fase.cor }}
                  >
                    {r.fase.nome}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {!aberto && !atingiuLimite && (
        <button
          onClick={abrir}
          className="flex items-center gap-1 self-start text-sm text-blue-600 hover:underline"
        >
          <Plus size={14} />
          Criar novo card
        </button>
      )}

      {aberto && (
        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-2">
          {modoConexao === "pesquisar_criar" && (
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setModo("criar")}
                className={`rounded-full px-2.5 py-1 font-medium ${modo === "criar" ? "bg-blue-600 text-white" : "bg-white text-slate-500"}`}
              >
                Criar novo
              </button>
              <button
                onClick={() => setModo("existente")}
                className={`rounded-full px-2.5 py-1 font-medium ${modo === "existente" ? "bg-blue-600 text-white" : "bg-white text-slate-500"}`}
              >
                Conectar existente
              </button>
            </div>
          )}

          {carregando ? (
            <span className="text-sm text-slate-400">Carregando...</span>
          ) : modo === "existente" ? (
            <Select value={cardFilhoId} onValueChange={setCardFilhoId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione um card..." />
              </SelectTrigger>
              <SelectContent>
                {candidatos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <Input
                autoFocus
                placeholder="Título do card"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <Select value={faseId} onValueChange={setFaseId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  {fases.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={confirmar} disabled={salvando || carregando}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
