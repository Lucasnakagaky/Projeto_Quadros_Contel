"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Archive,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  MessageSquare,
  Paperclip,
  Settings2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { Campo, Card, Etiqueta, Fase } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { tempoRelativo } from "@/lib/utils";
import { CardDetail, CardLinkResolvida, ConexaoResolvida } from "./types";
import { CampoValueList } from "./campo-value-list";
import { CampoValueRow } from "./campo-value-row";
import { FormBuilder } from "../form-builder/form-builder";
import { ChildCardsField } from "./child-cards-field";
import { EtiquetasPopover } from "./etiquetas-popover";
import { PaisSection } from "./pais-section";
import { PhaseHistory } from "./phase-history";
import { MoverFasePopover } from "./mover-fase-popover";
import { ChecklistSection } from "./checklist-section";
import { CommentsSection } from "./comments-section";
import { AttachmentsSection } from "./attachments-section";
import { FOCO } from "./estilos";

// Abas do card: mesma linguagem das abas do shell (azul → índigo → violeta), em escala menor.
// O ui/tabs não muda: o cn()/twMerge só sobrepõe estas classes aqui.
const CLASSE_ABA = `group/aba mr-1.5 mb-1.5 flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600 transition-[background-color,color,border-color,translate,box-shadow] duration-(--duracao-rapida) hover:-translate-y-px hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700 ${FOCO} data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:bg-linear-to-r data-[state=active]:from-(--gdt-aba-1) data-[state=active]:via-(--gdt-aba-2) data-[state=active]:to-(--gdt-aba-3) data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:shadow-(--gdt-aba-sombra-sm)`;

// Ação do trilho lateral (Action Rail): neutra; só o vermelho de ação destrutiva aparece em hover/foco.
const ACAO_TRILHO = `group/acao flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left text-sm font-medium text-slate-600 transition-[background-color,color,box-shadow] duration-(--duracao-rapida) hover:bg-white hover:text-indigo-700 hover:shadow-(--gdt-sombra-1) ${FOCO} cursor-pointer`;
const ACAO_TRILHO_PERIGO = `group/acao flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left text-sm font-medium text-slate-600 transition-[background-color,color,box-shadow] duration-(--duracao-rapida) hover:bg-red-50 hover:text-red-600 focus-visible:bg-red-50 focus-visible:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 cursor-pointer`;
const ICONE_TRILHO =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200/70 transition-colors duration-(--duracao-rapida) group-hover/acao:text-indigo-600 group-focus-visible/acao:text-indigo-600";
const ICONE_TRILHO_PERIGO =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200/70 transition-colors duration-(--duracao-rapida) group-hover/acao:text-red-600 group-focus-visible/acao:text-red-600";

// Linha hairline (substitui o divisor rgb(220,223,229) repetido 7×): some nas pontas.
const SEPARADOR = "h-px shrink-0 bg-linear-to-r from-transparent via-slate-300/70 to-transparent";

function ContadorAba({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="rounded-full bg-slate-200/80 px-1.5 py-px text-[11px] font-semibold tabular-nums text-slate-600 transition-colors duration-(--duracao-rapida) group-data-[state=active]/aba:bg-white/25 group-data-[state=active]/aba:text-white">
      {valor}
    </span>
  );
}

export function CardDetailModal({
  cardId,
  cards,
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
  /** Todos os cards do pipe (não só o atual) — usado pra contar quantos cards usam cada
   * etiqueta ao confirmar exclusão dentro do EtiquetasPopover (mesmo dado que
   * EtiquetasManagerModal já recebe de pipe-board.tsx). */
  cards: Card[];
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
  const tituloRef = useRef<HTMLTextAreaElement>(null);
  // Sinaliza (sem re-render) que o EtiquetasPopover está com uma edição inline de etiqueta em
  // andamento — usado no onEscapeKeyDown do Dialog logo abaixo. O input inline de edição não é
  // um Dialog Radix (é só um <input> comum), então o listener de Esc do Radix (fase de captura
  // no document) roda ANTES de qualquer preventDefault/stopPropagation que o próprio input
  // tentasse fazer, fechando o card inteiro. O prop onEscapeKeyDown é o ponto de extensão que o
  // próprio Radix expõe pra isso — mesma ideia de layer stack que ele já usa entre Dialogs
  // aninhados, replicada manualmente pra esse único filho que não é um Dialog.
  const etiquetaEmEdicaoRef = useRef(false);

  // Cresce a altura do textarea do título junto com o conteúdo — cobre tanto a digitação
  // quanto o preenchimento inicial assíncrono de `titulo` (ver `carregar()` abaixo).
  useLayoutEffect(() => {
    const el = tituloRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [titulo]);

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
      el?.classList.add("bg-blue-50", "gdt-campo-destaque");
      setTimeout(() => el?.classList.remove("bg-blue-50", "gdt-campo-destaque"), 1200);
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
        {/* mesma largura (max-w-6xl) do modal carregado: sem salto de tamanho ao abrir */}
        <DialogContent
          className="gdt-modal scrollbar-fina flex h-64 w-[calc(100vw-1rem)] max-w-6xl items-center justify-center"
          overlayClassName="gdt-modal-overlay"
          closeClassName="gdt-modal-fechar"
        >
          <DialogTitle className="sr-only">Carregando card</DialogTitle>
          <span className="text-sm font-medium text-slate-500">Carregando card...</span>
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
  const campoDescricao = campos.find(
    (c) => c.tipo === "texto_formatado" && c.titulo === "Descrição da Demanda"
  );
  const idsEtiquetas = campoEtiquetas ? stringArray(card.valoresCampos[campoEtiquetas.id]) : [];
  void pipe;

  return (
    <>
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        // gdt-modal*: casca de vidro, overlay frio e Geist (o modal é um portal fora do
        // .gdt-shell). `--fase` só alimenta a luz contextual (faixa superior, pills, marcadores).
        className="gdt-modal gdt-modal-luz scrollbar-fina w-[calc(100vw-1rem)] max-w-6xl"
        overlayClassName="gdt-modal-overlay"
        closeClassName="gdt-modal-fechar"
        style={{ "--fase": faseAtual?.cor ?? "#6366f1" } as React.CSSProperties}
        onEscapeKeyDown={(e) => {
          if (etiquetaEmEdicaoRef.current) e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">{card.titulo || "Detalhes do card"}</DialogTitle>
        <DialogDescription className="sr-only">
          Detalhes, campos e atividades do card {card.titulo}
        </DialogDescription>
        {/* 3 colunas independentes (padrão Pipefy): card | fase atual | ações da fase — a ordem
            do DOM não muda. Visualmente são 3 painéis flutuantes sobre a casca de vidro:
            conteúdo principal (maior peso), contexto/descrição e trilho de ações (compacto). */}
        <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_240px] md:gap-3 md:p-3">
          {/* Coluna 1 — Card */}
          <div className="gdt-modal-painel flex min-w-0 flex-col gap-3 px-5 py-5">
            {/* Chip de fase no topo do cabeçalho (só visual: o rótulo "Fase atual" e a pill
                oficial continuam na coluna 2). */}
            {faseAtual && (
              <span
                aria-hidden="true"
                className="gdt-fase-pill flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--fase)", boxShadow: "0 0 6px var(--fase)" }}
                />
                {faseAtual.nome}
              </span>
            )}

            {/* O título continua sendo o 1º input/textarea do dialog (contrato dos testes). */}
            <Textarea
              ref={tituloRef}
              rows={1}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => titulo.trim() && titulo !== card.titulo && patchCard({ titulo })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="-mx-2 h-auto w-[calc(100%+1rem)] shrink-0 resize-none overflow-hidden rounded-lg border-0 bg-transparent px-2 py-1 pr-10 text-2xl font-bold leading-tight tracking-tight text-slate-900 shadow-none transition-colors duration-(--duracao-rapida) hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-7 rounded-full border-slate-200 bg-white/80 px-2.5 text-xs text-slate-600 transition-[background-color,border-color,color] duration-(--duracao-rapida) hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 ${FOCO}`}
                onClick={() => focarCampo("data_vencimento")}
              >
                <CalendarClock size={12} />
                Vencimento
              </Button>
            </div>

            {/* Linha própria (não divide com o botão Vencimento): as pills podem quebrar em
                várias linhas, e um trigger de altura variável ao lado de um botão de altura fixa
                (items-center) quebraria o alinhamento vertical. */}
            <EtiquetasPopover
              pipeId={card.pipeId}
              etiquetas={etiquetas}
              cards={cards}
              campos={campos}
              selecionadas={idsEtiquetas}
              onSalvarSelecao={(ids) => campoEtiquetas && salvarValorCampo(campoEtiquetas.id, ids)}
              onEtiquetasChanged={atualizarEtiquetas}
              emEdicaoRef={etiquetaEmEdicaoRef}
            />

            <div className={SEPARADOR} />

            {/* Barra de funcionalidades do card — navegação (padrão Pipefy: Form,
                Atividades, Anexos, Checklists, Comentários). Quebra para a segunda linha
                naturalmente via flex-wrap quando não há espaço na primeira. */}
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
              </TabsList>

              <div className={`mt-1 ${SEPARADOR}`} />

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
                  onAnexoCriado={(anexo) =>
                    setDetail((prev) => (prev ? { ...prev, anexos: [...prev.anexos, anexo] } : prev))
                  }
                />
              </TabsContent>

            </Tabs>
          </div>

          {/* Coluna 2 — Fase atual (independente da coluna de ações). `md:self-start` evita
              que o Grid estique esta coluna para acompanhar a altura da coluna 1 quando ela
              tem muito conteúdo — sem isso, o scroll compartilhado deixava um vão enorme de
              espaço em branco abaixo do texto curto desta coluna. */}
          <div className="gdt-modal-contexto flex min-w-0 flex-col md:self-start">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 p-5 pt-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Fase atual</span>
                {faseAtual && (
                  <span className="gdt-fase-pill w-fit rounded-full px-2.5 py-1 text-xs font-semibold">
                    {faseAtual.nome}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled
                title="Configurações da fase — em breve"
                aria-label="Configurações da fase (em breve)"
                className="shrink-0 cursor-not-allowed rounded-lg p-1.5 text-slate-300"
              >
                <Settings2 size={16} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5 pb-5">
              {faseAtual?.descricao ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {faseAtual.descricao}
                </p>
              ) : (
                <p className="text-sm text-slate-400">Nenhuma informação adicional desta fase.</p>
              )}

              {campoDescricao && (
                // Área de trabalho da Descrição: superfície branca sólida (o campo `#campo-<id>`
                // continua dentro dela, visível sem abrir aba — contrato dos testes).
                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-(--gdt-sombra-1)">
                  <CampoValueRow
                    campo={campoDescricao}
                    cardId={card.id}
                    usuarios={usuarios}
                    valor={card.valoresCampos[campoDescricao.id]}
                    onSave={(valor) => salvarValorCampo(campoDescricao.id, valor)}
                    onAnexoCriado={(anexo) =>
                      setDetail((prev) => (prev ? { ...prev, anexos: [...prev.anexos, anexo] } : prev))
                    }
                  />
                </div>
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
          <div className="gdt-modal-trilho flex flex-col px-4 py-5 md:self-start">
            <div className="flex shrink-0 flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Mover card para fase
              </span>
              <MoverFasePopover fases={fases} faseAtualId={card.faseId} onMover={moverFase} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1 pb-1 md:overflow-y-auto">
              <div className={`mb-2 mt-4 ${SEPARADOR}`} />

              <button onClick={() => setConfigurandoCampos(true)} className={ACAO_TRILHO}>
                <span className={ICONE_TRILHO}>
                  <Settings2 size={14} />
                </span>
                Configurações
              </button>

              <button
                onClick={arquivarCard}
                className={ACAO_TRILHO}
                aria-label="Arquivar card"
                title="Arquivar card"
              >
                <span className={ICONE_TRILHO}>
                  <Archive size={14} />
                </span>
                Arquivado
              </button>

              {faseAtual?.ehFinal && (
                <button
                  onClick={moverParaLixeira}
                  className={`mt-3 ${ACAO_TRILHO_PERIGO}`}
                  aria-label="Mover card para a lixeira"
                  title="Mover card para a lixeira"
                >
                  <span className={ICONE_TRILHO_PERIGO}>
                    <Trash2 size={14} />
                  </span>
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
