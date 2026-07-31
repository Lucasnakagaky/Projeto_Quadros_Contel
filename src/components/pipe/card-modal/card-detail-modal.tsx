"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, MoreVertical, Settings, Share2, Sparkles, Tag, Trash2, User } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";
import { Card, Etiqueta } from "@/lib/types";
import { campoPorTipo } from "@/lib/campo-utils";
import { tempoRelativo } from "@/lib/utils";
import { CardDetail, ConexaoResolvida } from "./types";
import { CampoValueList } from "./campo-value-list";
import { ChildCardsField } from "./child-cards-field";
import { PaisSection } from "./pais-section";
import { PhaseHistory } from "./phase-history";
import { MoverFasePopover } from "./mover-fase-popover";
import { ChecklistSection } from "./checklist-section";
import { CommentsSection } from "./comments-section";
import { AttachmentsSection } from "./attachments-section";
import { EmBrevePanel } from "../em-breve-panel";

export function CardDetailModal({
  cardId,
  onClose,
  onCardUpdated,
  onCardTrashed,
  onEtiquetasChanged,
  onConexaoCriada,
  onNavigateToCard,
}: {
  cardId: string;
  onClose: () => void;
  onCardUpdated: (card: Card) => void;
  onCardTrashed: (cardId: string) => void;
  onEtiquetasChanged: (etiquetas: Etiqueta[]) => void;
  onConexaoCriada: (cardPaiId: string) => void;
  onNavigateToCard: (cardId: string) => void;
}) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [tabAtiva, setTabAtiva] = useState("form");

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<CardDetail>(`/api/cards/${cardId}`);
      setDetail(data);
      setTitulo(data.card.titulo);
      onCardUpdated(data.card);
      onEtiquetasChanged(data.etiquetas);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar card");
      onClose();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const [cardIdAnterior, setCardIdAnterior] = useState(cardId);
  if (cardId !== cardIdAnterior) {
    setCardIdAnterior(cardId);
    setLoading(true);
    setTabAtiva("form");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/cardId-change; setState happens after an await inside carregar()
    carregar();
  }, [carregar]);

  async function patchCard(body: { titulo?: string; valoresCampos?: Record<string, unknown> }) {
    if (!detail) return;
    try {
      const card = await api.patch<Card>(`/api/cards/${cardId}`, body);
      setDetail((prev) => (prev ? { ...prev, card } : prev));
      onCardUpdated(card);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar card");
    }
  }

  function salvarValorCampo(campoId: string, valor: unknown) {
    patchCard({ valoresCampos: { [campoId]: valor } });
  }

  function focarCampo(tipo: Parameters<typeof campoPorTipo>[1]) {
    const campo = detail ? campoPorTipo(detail.campos, tipo) : undefined;
    setTabAtiva("form");
    if (!campo) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`campo-${campo.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("bg-blue-50");
      setTimeout(() => el?.classList.remove("bg-blue-50"), 1200);
    });
  }

  async function moverFase(faseId: string) {
    if (!detail) return;
    try {
      const card = await api.post<Card>(`/api/cards/${cardId}/mover`, { faseId, index: 0 });
      setDetail((prev) => (prev ? { ...prev, card } : prev));
      onCardUpdated(card);
      const fase = detail.fases.find((f) => f.id === faseId);
      toast.success(`Card movido com sucesso para ${fase?.nome ?? ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover card");
    }
  }

  async function moverParaLixeira() {
    if (!confirm("Mover este card para a lixeira?")) return;
    try {
      await api.post(`/api/cards/${cardId}/lixeira`);
      toast.success("Card movido para a lixeira");
      onCardTrashed(cardId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover card para a lixeira");
    }
  }

  function atualizarEtiquetas(next: Etiqueta[]) {
    setDetail((prev) => (prev ? { ...prev, etiquetas: next } : prev));
    onEtiquetasChanged(next);
  }

  function handleConexaoCriada(r: ConexaoResolvida) {
    setDetail((prev) => (prev ? { ...prev, conexoesFilhos: [...prev.conexoesFilhos, r] } : prev));
    onConexaoCriada(cardId);
  }

  function handleConexaoRemovida(conexaoId: string) {
    setDetail((prev) =>
      prev
        ? { ...prev, conexoesFilhos: prev.conexoesFilhos.filter((r) => r.conexao.id !== conexaoId) }
        : prev
    );
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  if (loading || !detail) {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-64 max-w-4xl items-center justify-center">
          <span className="text-sm text-slate-400">Carregando card...</span>
        </DialogContent>
      </Dialog>
    );
  }

  const { card, pipe, fases, campos, etiquetas, usuarios, checklists, comentarios, anexos, conexoesFilhos, conexoesPais } = detail;
  const faseAtual = fases.find((f) => f.id === card.faseId);
  const criador = usuarios.find((u) => u.id === card.criadoPorId);
  const camposConexaoPipe = campos.filter((c) => c.tipo === "conexao_pipe");
  void pipe;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_280px]">
          {/* Painel esquerdo */}
          <div className="flex min-w-0 flex-col gap-4">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => titulo.trim() && titulo !== card.titulo && patchCard({ titulo })}
              className="h-auto flex-1 border-none px-0 text-xl font-bold shadow-none focus:ring-0"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => focarCampo("responsavel")}>
                <User size={14} />
                Adicionar responsável
              </Button>
              <Button variant="outline" size="sm" onClick={() => focarCampo("data_vencimento")}>
                <CalendarClock size={14} />
                Vencimento
              </Button>
              <Button variant="outline" size="sm" onClick={() => focarCampo("etiquetas")}>
                <Tag size={14} />
                Adicionar etiquetas
              </Button>
            </div>

            <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
              <TabsList>
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="atividades">Atividades</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
                <TabsTrigger value="checklists">Checklists</TabsTrigger>
                <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="mais">+</TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="flex flex-col gap-4 pt-3">
                <div className="text-xs text-slate-400">
                  Formulário Inicial — Criado por{" "}
                  <span className="font-medium text-slate-600">{criador?.nome ?? "—"}</span> •{" "}
                  {tempoRelativo(card.criadoEm)}
                </div>

                <CampoValueList
                  campos={campos}
                  card={card}
                  pipeId={card.pipeId}
                  etiquetas={etiquetas}
                  usuarios={usuarios}
                  onSalvarValor={salvarValorCampo}
                  onEtiquetaCriada={(e) => atualizarEtiquetas([...etiquetas, e])}
                  onEtiquetaAtualizada={(e) =>
                    atualizarEtiquetas(etiquetas.map((et) => (et.id === e.id ? e : et)))
                  }
                  onEtiquetaExcluida={(id) => atualizarEtiquetas(etiquetas.filter((et) => et.id !== id))}
                />

                {camposConexaoPipe.map((campo) => (
                  <ChildCardsField
                    key={campo.id}
                    campoId={campo.id}
                    nomeConexao={campo.config.nomeConexao || campo.titulo}
                    cardId={card.id}
                    pipeDestinoId={campo.config.pipeDestinoId}
                    modoConexao={campo.config.modoConexao ?? "criar"}
                    cardinalidade={campo.config.cardinalidade ?? "varios"}
                    relacionadas={conexoesFilhos.filter((r) => r.conexao.campoId === campo.id)}
                    onConexaoCriada={handleConexaoCriada}
                    onConexaoRemovida={handleConexaoRemovida}
                    onOpenCard={onNavigateToCard}
                  />
                ))}

                <PaisSection conexoesPais={conexoesPais} onOpenCard={onNavigateToCard} />
              </TabsContent>

              <TabsContent value="atividades" className="pt-3">
                <PhaseHistory historico={card.historico} fases={fases} />
              </TabsContent>

              <TabsContent value="anexos" className="pt-3">
                <AttachmentsSection
                  cardId={cardId}
                  anexos={anexos}
                  onChanged={(a) => setDetail((prev) => (prev ? { ...prev, anexos: a } : prev))}
                />
              </TabsContent>

              <TabsContent value="checklists" className="pt-3">
                <ChecklistSection
                  cardId={cardId}
                  checklists={checklists}
                  onChanged={(c) => setDetail((prev) => (prev ? { ...prev, checklists: c } : prev))}
                />
              </TabsContent>

              <TabsContent value="comentarios" className="pt-3">
                <CommentsSection
                  cardId={cardId}
                  comentarios={comentarios}
                  onChanged={(c) => setDetail((prev) => (prev ? { ...prev, comentarios: c } : prev))}
                />
              </TabsContent>

              <TabsContent value="email" className="pt-3">
                <EmBrevePanel titulo="Email" />
              </TabsContent>
              <TabsContent value="pdf" className="pt-3">
                <EmBrevePanel titulo="PDF" />
              </TabsContent>
              <TabsContent value="mais" className="pt-3">
                <EmBrevePanel titulo="Mais abas" />
              </TabsContent>
            </Tabs>

            <button
              onClick={() => toast("Editar visualização do card — em breve")}
              className="self-start text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              Editar visualização do card
            </button>
          </div>

          {/* Painel direito */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Fase atual</span>
                {faseAtual && (
                  <span
                    className="w-fit rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${faseAtual.cor}22`, color: faseAtual.cor }}
                  >
                    {faseAtual.nome}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toast("Configurações — em breve")}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                  aria-label="Configurações"
                >
                  <Settings size={16} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                      aria-label="Mais opções"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => toast("Configurar condicionais — em breve")}>
                      Configurar condicionais nos campos
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 data-[highlighted]:bg-red-50"
                      onSelect={moverParaLixeira}
                    >
                      <Trash2 size={14} />
                      Mover card para a lixeira
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <button
              onClick={() => toast("Compartilhar — em breve")}
              className="flex items-center gap-1.5 self-start text-sm text-slate-500 hover:text-slate-700"
            >
              <Share2 size={14} />
              Compartilhar
            </button>

            <div className="flex flex-col gap-2 rounded-md border border-dashed border-slate-200 p-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Sparkles size={14} className="text-blue-500" />
                Adicionar campos com IA
              </span>
              <button
                onClick={() => toast("Sugestões de IA — em breve")}
                className="self-start text-xs text-blue-600 hover:underline"
              >
                Sugerir campos
              </button>
            </div>

            <MoverFasePopover fases={fases} faseAtualId={card.faseId} onMover={moverFase} />

            <button
              onClick={() => toast("Configurações — em breve")}
              className="text-left text-sm text-slate-500 hover:text-slate-700"
            >
              Configurações
            </button>
            <button
              onClick={() => toast("Mover cards com IA — em breve")}
              className="text-left text-sm text-slate-500 hover:text-slate-700"
            >
              Mover cards com IA
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
