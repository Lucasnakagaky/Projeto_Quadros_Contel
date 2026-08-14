"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Settings2,
  Share2,
  Tag,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { Campo, Card, Etiqueta } from "@/lib/types";
import { campoPorTipo } from "@/lib/campo-utils";
import { tempoRelativo } from "@/lib/utils";
import { CardDetail, ConexaoResolvida } from "./types";
import { CampoValueList } from "./campo-value-list";
import { FormBuilder } from "../form-builder/form-builder";
import { ChildCardsField } from "./child-cards-field";
import { PaisSection } from "./pais-section";
import { PhaseHistory } from "./phase-history";
import { MoverFasePopover } from "./mover-fase-popover";
import { ChecklistSection } from "./checklist-section";
import { CommentsSection } from "./comments-section";
import { AttachmentsSection } from "./attachments-section";

const CLASSE_ABA =
  "mr-2 mb-2 flex shrink grow-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 data-[state=active]:border-slate-200 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900";

function ContadorAba({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="rounded-full bg-slate-200 px-1.5 py-px text-[11px] font-semibold text-slate-600">
      {valor}
    </span>
  );
}

export function CardDetailModal({
  cardId,
  onClose,
  onCardUpdated,
  onCardTrashed,
  onEtiquetasChanged,
  onCamposChanged,
  onConexaoCriada,
  onNavigateToCard,
}: {
  cardId: string;
  onClose: () => void;
  onCardUpdated: (card: Card) => void;
  onCardTrashed: (cardId: string) => void;
  onEtiquetasChanged: (etiquetas: Etiqueta[]) => void;
  onCamposChanged: (campos: Campo[]) => void;
  onConexaoCriada: (cardPaiId: string, cardFilhoId: string, cardFilhoTitulo: string) => void;
  onNavigateToCard: (cardId: string) => void;
}) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [tabAtiva, setTabAtiva] = useState("anexos");
  const [configurandoCampos, setConfigurandoCampos] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<CardDetail>(`/api/cards/${cardId}`);
      let campos = data.campos;

      // Qualquer card deve ter um campo de "Descrição da Demanda" (texto simples, no
      // padrão Pipefy), provisionado uma única vez por pipe. Provisiona antes do campo de
      // conexão de pipe abaixo para que a ordem final fique Descrição da Demanda → Subtarefas.
      if (!campos.some((c) => c.tipo === "texto_longo" && c.titulo === "Descrição da Demanda")) {
        try {
          const campo = await api.post<Campo>(
            `/api/pipes/${data.card.pipeId}/campos/garantir-descricao-demanda`,
            {}
          );
          campos = [...campos, campo];
          onCamposChanged(campos);
        } catch {
          // se não conseguir provisionar, o card continua funcionando normalmente
        }
      }

      // Qualquer card deve poder criar um card filho, mesmo que o pipe ainda não tenha
      // um campo de "Conexão de pipe" configurado — provisiona um padrão (mesmo pipe,
      // reaproveitando a estrutura de conexões já existente) na primeira vez que faltar.
      if (!campos.some((c) => c.tipo === "conexao_pipe")) {
        try {
          const campo = await api.post<Campo>(
            `/api/pipes/${data.card.pipeId}/campos/garantir-subtarefas`,
            {}
          );
          campos = [...campos, campo];
          onCamposChanged(campos);
        } catch {
          // se não conseguir provisionar, o card continua funcionando normalmente,
          // só sem a seção de card filho até uma nova tentativa
        }
      }

      setDetail({ ...data, campos });
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
    setTabAtiva("anexos");
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

  function atualizarCampos(next: Campo[]) {
    setDetail((prev) => (prev ? { ...prev, campos: next } : prev));
    onCamposChanged(next);
  }

  function handleConexaoCriada(r: ConexaoResolvida) {
    setDetail((prev) => (prev ? { ...prev, conexoesFilhos: [...prev.conexoesFilhos, r] } : prev));
    onConexaoCriada(cardId, r.card?.id ?? r.conexao.cardFilhoId, r.card?.titulo ?? "Card");
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
          <DialogTitle className="sr-only">Carregando card</DialogTitle>
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
    <>
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogTitle className="sr-only">{card.titulo || "Detalhes do card"}</DialogTitle>
        <DialogDescription className="sr-only">
          Detalhes, campos e atividades do card {card.titulo}
        </DialogDescription>
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
              <Button variant="outline" size="sm" onClick={() => focarCampo("data_vencimento")}>
                <CalendarClock size={14} />
                Vencimento
              </Button>
              <Button variant="outline" size="sm" onClick={() => focarCampo("etiquetas")}>
                <Tag size={14} />
                Adicionar etiquetas
              </Button>
            </div>

            <div className="border-t border-[rgb(220,223,229)]" />

            {/* Abas secundárias — ficam acima dos campos do card (hierarquia: navegação
                de conteúdo relacionado antes dos dados do formulário). */}
            <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
              <TabsList className="flex-wrap items-center gap-0 max-w-[420px]">
                <TabsTrigger value="anexos" className={CLASSE_ABA}>
                  <Paperclip size={14} />
                  Anexos
                  <ContadorAba valor={anexos.length} />
                </TabsTrigger>
                <TabsTrigger value="checklists" className={CLASSE_ABA}>
                  <CheckSquare size={14} />
                  Checklists
                  <ContadorAba valor={checklists.length} />
                </TabsTrigger>
                <TabsTrigger value="comentarios" className={CLASSE_ABA}>
                  <MessageSquare size={14} />
                  Comentários
                  <ContadorAba valor={comentarios.length} />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="anexos" className="pt-4">
                <AttachmentsSection
                  cardId={cardId}
                  anexos={anexos}
                  onChanged={(a) => setDetail((prev) => (prev ? { ...prev, anexos: a } : prev))}
                />
              </TabsContent>

              <TabsContent value="checklists" className="pt-4">
                <ChecklistSection
                  cardId={cardId}
                  checklists={checklists}
                  onChanged={(c) => setDetail((prev) => (prev ? { ...prev, checklists: c } : prev))}
                />
              </TabsContent>

              <TabsContent value="comentarios" className="pt-4">
                <CommentsSection
                  cardId={cardId}
                  comentarios={comentarios}
                  onChanged={(c) => setDetail((prev) => (prev ? { ...prev, comentarios: c } : prev))}
                />
              </TabsContent>
            </Tabs>

            <div className="border-t border-[rgb(220,223,229)]" />

            {/* Campos do card — sempre visíveis, sem depender de aba */}
            <div className="flex flex-col gap-4">
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

              <div className="border-t border-[rgb(220,223,229)] pt-4">
                <PhaseHistory historico={card.historico} fases={fases} />
              </div>
            </div>
          </div>

          {/* Painel direito */}
          <div className="flex flex-col gap-4 border-t border-[rgb(220,223,229)] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
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

            <button
              onClick={() => toast("Compartilhar — em breve")}
              className="flex items-center gap-1.5 self-start rounded-md px-1 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              <Share2 size={14} />
              Compartilhar
            </button>

            <MoverFasePopover fases={fases} faseAtualId={card.faseId} onMover={moverFase} />

            <button
              onClick={() => setConfigurandoCampos(true)}
              className="flex items-center gap-1.5 self-start rounded-md px-1 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              <Settings2 size={14} />
              Configurações
            </button>

            <button
              onClick={moverParaLixeira}
              className="mt-auto flex items-center gap-1.5 self-start rounded-md px-1 py-1.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
              aria-label="Mover card para a lixeira"
              title="Mover card para a lixeira"
            >
              <Trash2 size={14} />
              Mover para a lixeira
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={configurandoCampos} onOpenChange={setConfigurandoCampos}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Campos do formulário</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          <FormBuilder pipeId={card.pipeId} campos={campos} onCamposChanged={atualizarCampos} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
