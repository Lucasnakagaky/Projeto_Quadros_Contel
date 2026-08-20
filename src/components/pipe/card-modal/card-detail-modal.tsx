"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Archive,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  CornerDownRight,
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { Campo, Card, Etiqueta, Fase } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { tempoRelativo } from "@/lib/utils";
import { CardDetail, CardLinkResolvida, ConexaoResolvida } from "./types";
import { CampoValueList } from "./campo-value-list";
import { FormBuilder } from "../form-builder/form-builder";
import { ChildCardsField } from "./child-cards-field";
import { EtiquetasPopover } from "./etiquetas-popover";
import { PaisSection } from "./pais-section";
import { PhaseHistory } from "./phase-history";
import { MoverFasePopover } from "./mover-fase-popover";
import { ChecklistSection } from "./checklist-section";
import { CommentsSection } from "./comments-section";
import { AttachmentsSection } from "./attachments-section";

const CLASSE_ABA =
  "mr-1.5 mb-1.5 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 data-[state=active]:border-slate-300 data-[state=active]:bg-slate-100 data-[state=active]:font-semibold data-[state=active]:text-slate-900";

function ContadorAba({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="rounded-full bg-slate-200 px-1.5 py-px text-[11px] font-semibold text-slate-600">
      {valor}
    </span>
  );
}

/** Placeholder honesto para abas cuja funcionalidade ainda não existe no sistema
 * (Email, PDF) — navegação real, sem simular envio/geração que não existem. */
function AbaEmBreve({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-xs text-slate-400">Em breve</p>
    </div>
  );
}

export function CardDetailModal({
  cardId,
  focarDescricaoAoAbrir,
  onClose,
  onCardUpdated,
  onCardTrashed,
  onEtiquetasChanged,
  onCamposChanged,
  onConexaoCriada,
  onFaseCriada,
  onNavigateToCard,
}: {
  cardId: string;
  // true quando o modal deve abrir já rolado/destacado no campo "Descrição da Demanda" — usado
  // ao criar um card filho, cujo formulário inicial não suporta imagem (é um Textarea simples),
  // pra levar o usuário direto pro editor completo (com upload de imagem) assim que o card existe.
  focarDescricaoAoAbrir?: boolean;
  onClose: () => void;
  onCardUpdated: (card: Card) => void;
  onCardTrashed: (cardId: string) => void;
  onEtiquetasChanged: (etiquetas: Etiqueta[]) => void;
  onCamposChanged: (campos: Campo[]) => void;
  onConexaoCriada: (cardPaiId: string, cardFilhoId: string, cardFilhoTitulo: string) => void;
  onFaseCriada: (fase: Fase) => void;
  onNavigateToCard: (cardId: string, opts?: { focarDescricao?: boolean }) => void;
}) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [tabAtiva, setTabAtiva] = useState("form");
  const [configurandoCampos, setConfigurandoCampos] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<CardDetail>(`/api/cards/${cardId}`);
      let campos = data.campos;

      // Qualquer card deve ter um campo de "Descrição da Demanda" (texto formatado, com
      // suporte a imagem), provisionado uma única vez por pipe. Provisiona antes do campo de
      // conexão de pipe abaixo para que a ordem final fique Descrição da Demanda → Subtarefas.
      // Chama o "garantir" tanto quando o campo ainda não existe quanto quando ele existe no
      // tipo antigo ("texto_longo") — nesse segundo caso o endpoint migra o campo (e o valor
      // salvo em cada card do pipe) para "texto_formatado" no lugar, em vez de só ignorar.
      const descricaoAntiga = campos.find(
        (c) => c.tipo === "texto_longo" && c.titulo === "Descrição da Demanda"
      );
      const temDescricaoFormatada = campos.some(
        (c) => c.tipo === "texto_formatado" && c.titulo === "Descrição da Demanda"
      );
      if (descricaoAntiga || !temDescricaoFormatada) {
        try {
          const campo = await api.post<Campo>(
            `/api/pipes/${data.card.pipeId}/campos/garantir-descricao-demanda`,
            {}
          );
          campos = descricaoAntiga
            ? campos.map((c) => (c.id === campo.id ? campo : c))
            : [...campos, campo];
          onCamposChanged(campos);
          if (descricaoAntiga) {
            // a migração também reescreve o valor salvo em cada card (texto → HTML) — busca o
            // card de novo para não mostrar o texto antigo sem quebras de linha até reabrir.
            const fresco = await api.get<CardDetail>(`/api/cards/${cardId}`);
            data.card = fresco.card;
          }
        } catch {
          // se não conseguir provisionar/migrar, o card continua funcionando normalmente
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

      // Qualquer card deve poder se conectar livremente a outro card do mesmo pipe (sem
      // relação de pai/filho, via "Conectar card") — provisiona o campo "Cards vinculados"
      // na primeira vez que faltar, mesmo padrão dos dois provisionamentos acima.
      if (!campos.some((c) => c.tipo === "cards_vinculados")) {
        try {
          const campo = await api.post<Campo>(
            `/api/pipes/${data.card.pipeId}/campos/garantir-cards-vinculados`,
            {}
          );
          campos = [...campos, campo];
          onCamposChanged(campos);
        } catch {
          // se não conseguir provisionar, a seção de conexões continua mostrando só os pais
        }
      }

      setDetail({ ...data, campos });
      setTitulo(data.card.titulo);
      onCardUpdated(data.card);
      onEtiquetasChanged(data.etiquetas);
      if (focarDescricaoAoAbrir) {
        destacarCampo(campoPorTipo(campos, "texto_formatado"));
      }
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

  function destacarCampo(campo: Campo | undefined) {
    if (!campo) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`campo-${campo.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("bg-blue-50");
      setTimeout(() => el?.classList.remove("bg-blue-50"), 1200);
    });
  }

  function focarCampo(tipo: Parameters<typeof campoPorTipo>[1]) {
    destacarCampo(detail ? campoPorTipo(detail.campos, tipo) : undefined);
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

  async function arquivarCard() {
    if (!detail) return;
    try {
      let faseArquivado = detail.fases.find((f) => f.nome === "Arquivado");
      if (!faseArquivado) {
        faseArquivado = await api.post<Fase>(
          `/api/pipes/${detail.card.pipeId}/fases/garantir-arquivada`,
          {}
        );
        setDetail((prev) => (prev ? { ...prev, fases: [...prev.fases, faseArquivado!] } : prev));
        onFaseCriada(faseArquivado);
      }
      const card2 = await api.post<Card>(`/api/cards/${cardId}/mover`, {
        faseId: faseArquivado.id,
        index: 0,
      });
      setDetail((prev) => (prev ? { ...prev, card: card2 } : prev));
      onCardUpdated(card2);
      toast.success("Card arquivado com sucesso");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar card");
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

  function handleLinksCriados(resolvidas: CardLinkResolvida[]) {
    setDetail((prev) => (prev ? { ...prev, cardLinks: [...prev.cardLinks, ...resolvidas] } : prev));
  }

  function handleLinkRemovido(linkId: string) {
    setDetail((prev) =>
      prev ? { ...prev, cardLinks: prev.cardLinks.filter((r) => r.link.id !== linkId) } : prev
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

  const { card, pipe, fases, campos, etiquetas, usuarios, checklists, comentarios, anexos, conexoesFilhos, conexoesPais, cardLinks } = detail;
  const faseAtual = fases.find((f) => f.id === card.faseId);
  const criador = usuarios.find((u) => u.id === card.criadoPorId);
  const camposConexaoPipe = campos.filter((c) => c.tipo === "conexao_pipe");
  const campoCardsVinculados = campos.find((c) => c.tipo === "cards_vinculados");
  const campoEtiquetas = campos.find((c) => c.tipo === "etiquetas");
  const idsEtiquetas = campoEtiquetas ? stringArray(card.valoresCampos[campoEtiquetas.id]) : [];
  const etiquetasSelecionadas = etiquetas.filter((e) => idsEtiquetas.includes(e.id));
  void pipe;

  return (
    <>
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogTitle className="sr-only">{card.titulo || "Detalhes do card"}</DialogTitle>
        <DialogDescription className="sr-only">
          Detalhes, campos e atividades do card {card.titulo}
        </DialogDescription>
        {/* 3 colunas independentes (padrão Pipefy): card | fase atual | ações da fase.
            Divididas por borda (não gap), cada uma com seu próprio padding interno. */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_240px]">
          {/* Coluna 1 — Card */}
          <div className="flex min-w-0 flex-col gap-3 p-5">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => titulo.trim() && titulo !== card.titulo && patchCard({ titulo })}
              className="h-auto flex-1 border-none px-0 text-xl font-bold shadow-none focus:ring-0"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => focarCampo("data_vencimento")}
              >
                <CalendarClock size={12} />
                Vencimento
              </Button>
              <EtiquetasPopover
                pipeId={card.pipeId}
                etiquetas={etiquetas}
                selecionadas={idsEtiquetas}
                onSalvarSelecao={(ids) => campoEtiquetas && salvarValorCampo(campoEtiquetas.id, ids)}
                onEtiquetaCriada={(e) => atualizarEtiquetas([...etiquetas, e])}
                onEtiquetaAtualizada={(e) =>
                  atualizarEtiquetas(etiquetas.map((et) => (et.id === e.id ? e : et)))
                }
                onEtiquetaExcluida={(id) => atualizarEtiquetas(etiquetas.filter((et) => et.id !== id))}
              />
            </div>

            {etiquetasSelecionadas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {etiquetasSelecionadas.map((e) => (
                  <span
                    key={e.id}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${e.cor}1f`, color: e.cor }}
                  >
                    {e.nome}
                  </span>
                ))}
              </div>
            )}

            <div className="border-t border-[rgb(220,223,229)]" />

            {/* Barra de funcionalidades do card — navegação (padrão Pipefy: Form,
                Atividades, Anexos, Checklists, Comentários, Email, PDF, +). Quebra para a
                segunda linha naturalmente via flex-wrap quando não há espaço na primeira. */}
            <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
              <TabsList className="items-center gap-0">
                <TabsTrigger value="form" className={CLASSE_ABA}>
                  <ClipboardList size={14} />
                  Form
                </TabsTrigger>
                <TabsTrigger value="atividades" className={CLASSE_ABA}>
                  <Activity size={14} />
                  Atividades
                </TabsTrigger>
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
                <TabsTrigger value="email" className={CLASSE_ABA}>
                  <Mail size={14} />
                  Email
                </TabsTrigger>
                <TabsTrigger value="pdf" className={CLASSE_ABA}>
                  <FileText size={14} />
                  PDF
                </TabsTrigger>
                <button
                  type="button"
                  disabled
                  title="Mais funcionalidades — em breve"
                  aria-label="Mais funcionalidades (em breve)"
                  className="mr-1.5 mb-1.5 flex h-[26px] w-[26px] shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300"
                >
                  <Plus size={14} />
                </button>
              </TabsList>

              <div className="mt-2 border-t border-[rgb(220,223,229)]" />

              <TabsContent value="form" className="pt-2">
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-slate-400">
                    Formulário Inicial — Criado por{" "}
                    <span className="font-medium text-slate-600">{criador?.nome ?? "—"}</span> •{" "}
                    {tempoRelativo(card.criadoEm)}
                  </div>

                  <CampoValueList
                    campos={campos}
                    card={card}
                    usuarios={usuarios}
                    onSalvarValor={salvarValorCampo}
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

                  <PaisSection
                    conexoesPais={conexoesPais}
                    cardLinks={cardLinks}
                    cardId={card.id}
                    pipeId={card.pipeId}
                    campoId={campoCardsVinculados?.id}
                    cardinalidade={campoCardsVinculados?.config.cardinalidade ?? "varios"}
                    onOpenCard={onNavigateToCard}
                    onLinksCriados={handleLinksCriados}
                    onLinkRemovido={handleLinkRemovido}
                  />
                </div>
              </TabsContent>

              <TabsContent value="atividades" className="pt-2">
                <PhaseHistory
                  historico={card.historico}
                  fases={fases}
                  onEditarVisualizacao={() => setConfigurandoCampos(true)}
                />
              </TabsContent>

              <TabsContent value="anexos" className="pt-2">
                <AttachmentsSection
                  cardId={cardId}
                  anexos={anexos}
                  onChanged={(a) => setDetail((prev) => (prev ? { ...prev, anexos: a } : prev))}
                />
              </TabsContent>

              <TabsContent value="checklists" className="pt-2">
                <ChecklistSection
                  cardId={cardId}
                  checklists={checklists}
                  onChanged={(c) => setDetail((prev) => (prev ? { ...prev, checklists: c } : prev))}
                />
              </TabsContent>

              <TabsContent value="comentarios" className="pt-2">
                <CommentsSection
                  cardId={cardId}
                  comentarios={comentarios}
                  onChanged={(c) => setDetail((prev) => (prev ? { ...prev, comentarios: c } : prev))}
                />
              </TabsContent>

              <TabsContent value="email" className="pt-2">
                <AbaEmBreve label="Enviar card por email" />
              </TabsContent>

              <TabsContent value="pdf" className="pt-2">
                <AbaEmBreve label="Exportar card em PDF" />
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna 2 — Fase atual (independente da coluna de ações). `md:self-start` evita
              que o Grid estique esta coluna para acompanhar a altura da coluna 1 quando ela
              tem muito conteúdo — sem isso, o scroll compartilhado deixava um vão enorme de
              espaço em branco abaixo do texto curto desta coluna. */}
          <div className="flex flex-col border-t border-[rgb(220,223,229)] md:self-start md:border-l md:border-t-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgb(220,223,229)] p-5">
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
                type="button"
                disabled
                title="Configurações da fase — em breve"
                aria-label="Configurações da fase (em breve)"
                className="shrink-0 cursor-not-allowed rounded-md p-1.5 text-slate-300"
              >
                <Settings2 size={16} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              {faseAtual?.descricao ? (
                <p className="whitespace-pre-wrap text-sm text-slate-600">{faseAtual.descricao}</p>
              ) : (
                <p className="text-sm text-slate-400">Nenhuma informação adicional desta fase.</p>
              )}
            </div>
          </div>

          {/* Coluna 3 — Ações da fase (mover card, configurações). `md:self-start`: mesma
              razão da coluna 2 — evita esticar a coluna para a altura da coluna 1, o que
              afastava "Configurações" do botão "Mover para a lixeira" com um vão em branco.
              O bloco de mover fase fica fora de qualquer contêiner com overflow, porque o
              dropdown do Popover é posicionado com position:absolute (não usa portal) — um
              ancestral com overflow-y-auto cortaria o dropdown, já que "overflow-y: auto"
              força o browser a clipar também o eixo X. */}
          <div className="flex flex-col border-t border-[rgb(220,223,229)] p-5 pt-6 md:self-start md:border-l md:border-t-0">
            <div className="flex shrink-0 flex-col gap-3">
              <span className="text-sm font-semibold text-slate-800">Mover card para fase</span>
              <MoverFasePopover fases={fases} faseAtualId={card.faseId} onMover={moverFase} />

              <div className="flex flex-col gap-1.5 pl-0.5">
                <button
                  type="button"
                  disabled
                  title="Configurar mover cards — em breve"
                  className="flex cursor-not-allowed items-center gap-1.5 self-start text-xs text-slate-400"
                >
                  <CornerDownRight size={12} />
                  Configurar mover cards
                </button>
                <button
                  type="button"
                  disabled
                  title="Mover cards por IA — em breve"
                  className="flex cursor-not-allowed items-center gap-1.5 self-start text-xs text-slate-400"
                >
                  <Sparkles size={12} />
                  Mover cards por IA
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 md:overflow-y-auto">
              <div className="mt-4 border-t border-[rgb(220,223,229)] pt-4">
                <button
                  onClick={() => setConfigurandoCampos(true)}
                  className="flex items-center gap-1.5 self-start rounded-md px-1 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                >
                  <Settings2 size={14} />
                  Configurações
                </button>
              </div>

              <button
                onClick={arquivarCard}
                className="flex items-center gap-1.5 self-start rounded-md px-1 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                aria-label="Arquivar card"
                title="Arquivar card"
              >
                <Archive size={14} />
                Arquivado
              </button>

              {faseAtual?.ehFinal && (
                <button
                  onClick={moverParaLixeira}
                  className="mt-auto flex items-center gap-1.5 self-start rounded-md px-1 py-1.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                  aria-label="Mover card para a lixeira"
                  title="Mover card para a lixeira"
                >
                  <Trash2 size={14} />
                  Mover para a lixeira
                </button>
              )}
            </div>
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
