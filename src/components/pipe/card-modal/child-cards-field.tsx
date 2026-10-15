"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Pencil, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { Campo, Card, Etiqueta, Fase, Pipe, Usuario } from "@/lib/types";
import { ConexaoResolvida } from "./types";
import { ChildCardChip } from "./card-conexao-chip";
import { FOCO, ICONE_SECAO_AZUL, LINK_ACAO } from "./estilos";
import { ChildCardInlineForm } from "./child-card-inline-form";

export function ChildCardsField({
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
  onOpenCard: (cardId: string, opts?: { focarDescricao?: boolean }) => void;
}) {
  const [edicaoAtiva, setEdicaoAtiva] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [modo, setModo] = useState<"criar" | "existente">("criar");
  const [carregando, setCarregando] = useState(false);

  const [pipeDestino, setPipeDestino] = useState<Pipe | null>(null);
  const [fasesDestino, setFasesDestino] = useState<Fase[]>([]);
  const [camposDestino, setCamposDestino] = useState<Campo[]>([]);
  const [etiquetasDestino, setEtiquetasDestino] = useState<Etiqueta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [candidatos, setCandidatos] = useState<Card[]>([]);
  const [cardFilhoId, setCardFilhoId] = useState("");

  const atingiuLimite = cardinalidade === "unico" && relacionadas.length >= 1;

  async function abrirFormulario() {
    if (!pipeDestinoId) {
      toast.error("Esta conexão não tem um pipe de destino configurado");
      return;
    }
    setFormAberto(true);
    setModo("criar");
    setCardFilhoId("");
    setCarregando(true);
    try {
      const [pipes, fases, campos, etiquetas, usuariosResp] = await Promise.all([
        api.get<Pipe[]>("/api/pipes"),
        api.get<Fase[]>(`/api/pipes/${pipeDestinoId}/fases`),
        api.get<Campo[]>(`/api/pipes/${pipeDestinoId}/campos`),
        api.get<Etiqueta[]>(`/api/pipes/${pipeDestinoId}/etiquetas`),
        api.get<Usuario[]>("/api/users"),
      ]);
      setPipeDestino(pipes.find((p) => p.id === pipeDestinoId) ?? null);
      setFasesDestino(fases);
      setCamposDestino(campos);
      setEtiquetasDestino(etiquetas);
      setUsuarios(usuariosResp);
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

  async function criarFilho(titulo: string, faseId: string, valoresCampos: Record<string, unknown>) {
    if (!pipeDestinoId) return;
    try {
      const result = await api.post<{ conexao: ConexaoResolvida["conexao"]; card: Card }>(
        `/api/cards/${cardId}/conexoes`,
        { campoId, modo: "criar", pipeId: pipeDestinoId, faseId, titulo, valoresCampos }
      );
      const fase = fasesDestino.find((f) => f.id === faseId);
      onConexaoCriada({ conexao: result.conexao, card: result.card, fase, pipe: pipeDestino ?? undefined });
      toast.success("Card criado com sucesso");
      setFormAberto(false);
      // o formulário inicial (CampoDraftRow) só suporta texto puro na "Descrição da Demanda" —
      // abre o card recém-criado, onde o editor completo (com upload de imagem) já funciona.
      onOpenCard(result.card.id, { focarDescricao: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar card");
    }
  }

  async function conectarExistente() {
    if (!cardFilhoId) {
      toast.error("Selecione um card para conectar");
      return;
    }
    try {
      const result = await api.post<{ conexao: ConexaoResolvida["conexao"] }>(`/api/cards/${cardId}/conexoes`, {
        campoId,
        modo: "existente",
        cardFilhoId,
      });
      const card = candidatos.find((c) => c.id === cardFilhoId);
      const fase = fasesDestino.find((f) => f.id === card?.faseId);
      onConexaoCriada({ conexao: result.conexao, card, fase, pipe: pipeDestino ?? undefined });
      toast.success("Card conectado com sucesso");
      setFormAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar card");
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

  const mostrarBotaoAdicionar = !atingiuLimite && (relacionadas.length === 0 || edicaoAtiva) && !formAberto;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={ICONE_SECAO_AZUL}>
          <Link2 size={13} />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{nomeConexao}</span>
        {relacionadas.length > 0 && (
          <button
            onClick={() => setEdicaoAtiva((v) => !v)}
            className={`flex items-center gap-1 ${LINK_ACAO}`}
          >
            <Pencil size={12} />
            {edicaoAtiva ? "Concluir" : "Editar"}
          </button>
        )}
      </div>

      {relacionadas.length > 0 && (
        <div className="flex flex-col gap-2">
          {relacionadas.map((r) => (
            <ChildCardChip
              key={r.conexao.id}
              cardId={r.card?.id ?? r.conexao.cardFilhoId}
              titulo={r.card?.titulo ?? "Card removido"}
              pipeNome={r.pipe?.nome ?? "—"}
              criadoEm={r.card?.criadoEm ?? ""}
              faseNome={r.fase?.nome ?? "—"}
              faseCor={r.fase?.cor ?? "#64748b"}
              quebrada={!r.card}
              onAbrirCard={() => r.card && onOpenCard(r.card.id)}
              onRemover={edicaoAtiva ? () => remover(r.conexao.id) : undefined}
            />
          ))}
        </div>
      )}

      {mostrarBotaoAdicionar && (
        <button
          onClick={abrirFormulario}
          className={`flex items-center gap-1 self-start text-sm ${LINK_ACAO}`}
        >
          <Plus size={14} />
          Criar card Filho
        </button>
      )}

      {formAberto && (
        <div className="flex flex-col gap-2">
          {modoConexao === "pesquisar_criar" && (
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setModo("criar")}
                className={`rounded-full px-2.5 py-1 font-medium transition-colors duration-(--duracao-rapida) ${FOCO} ${modo === "criar" ? "gdt-modal-btn" : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"}`}
              >
                Criar novo
              </button>
              <button
                onClick={() => setModo("existente")}
                className={`rounded-full px-2.5 py-1 font-medium transition-colors duration-(--duracao-rapida) ${FOCO} ${modo === "existente" ? "gdt-modal-btn" : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"}`}
              >
                Conectar existente
              </button>
            </div>
          )}

          {carregando ? (
            <span className="text-sm text-slate-400">Carregando...</span>
          ) : modo === "existente" ? (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 p-2.5">
              <Select value={cardFilhoId} onValueChange={setCardFilhoId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione um card..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((c) => {
                    const fase = fasesDestino.find((f) => f.id === c.faseId);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{c.titulo}</span>
                          {fase && (
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: `color-mix(in srgb, ${fase.cor} 14%, white)`, color: `color-mix(in srgb, ${fase.cor} 66%, #0f172a)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${fase.cor} 24%, transparent)` }}
                            >
                              {fase.nome}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <button
                  onClick={conectarExistente}
                  className={`gdt-modal-btn rounded-full px-3 py-1.5 text-sm font-medium ${FOCO}`}
                >
                  Conectar
                </button>
                <button
                  onClick={() => setFormAberto(false)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors duration-(--duracao-rapida) hover:bg-indigo-50 hover:text-indigo-700 ${FOCO}`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            pipeDestinoId && (
              <ChildCardInlineForm
                pipeDestinoId={pipeDestinoId}
                pipeDestinoNome={pipeDestino?.nome ?? ""}
                fases={fasesDestino}
                campos={camposDestino}
                etiquetas={etiquetasDestino}
                usuarios={usuarios}
                onEtiquetaCriada={(e) => setEtiquetasDestino((prev) => [...prev, e])}
                onCriar={criarFilho}
                onFechar={() => setFormAberto(false)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
