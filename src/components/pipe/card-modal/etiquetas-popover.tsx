"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { Check, Plus, Tag, X } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";
import { cn } from "@/lib/utils";
import { Campo, Card, CORES_ETIQUETA, Etiqueta } from "@/lib/types";
import { EtiquetaFormModal } from "../etiquetas/etiqueta-form-modal";

/**
 * Cabeçalho de etiquetas do card: pills aplicadas (ou o link discreto de adicionar, se
 * nenhuma) + o dropdown de busca/toggle/criar. Editar nome+cor (duplo clique) e excluir
 * (ícone "x", com a mesma confirmação com contagem de uso da tela de admin) também vivem
 * aqui agora — a tela "Gerenciar etiquetas" (pipe-header.tsx) continua existindo pra quem
 * precisar de uma cor hex livre, mas o caso comum não exige mais sair do card.
 */
export function EtiquetasPopover({
  pipeId,
  etiquetas,
  cards,
  campos,
  selecionadas,
  onSalvarSelecao,
  onEtiquetasChanged,
  emEdicaoRef,
}: {
  pipeId: string;
  etiquetas: Etiqueta[];
  cards: Card[];
  campos: Campo[];
  selecionadas: string[];
  onSalvarSelecao: (ids: string[]) => void;
  onEtiquetasChanged: (etiquetas: Etiqueta[]) => void;
  /** Ref (do card-detail-modal) marcada true enquanto uma etiqueta está em edição inline aqui
   * dentro — usada no onEscapeKeyDown do Dialog do card, pra Esc cancelar só a edição em vez de
   * fechar o card inteiro (ver comentário em card-detail-modal.tsx). */
  emEdicaoRef: RefObject<boolean>;
}) {
  const etiquetasSelecionadas = etiquetas.filter((e) => selecionadas.includes(e.id));

  return (
    <Popover
      trigger={({ toggle }) =>
        etiquetasSelecionadas.length === 0 ? (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <Tag size={12} />+ Adicionar etiquetas
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {etiquetasSelecionadas.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={toggle}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium hover:opacity-80"
                style={{ backgroundColor: `${e.cor}1f`, color: e.cor }}
              >
                {e.nome}
              </button>
            ))}
            <button
              type="button"
              onClick={toggle}
              aria-label="Adicionar etiquetas"
              title="Adicionar etiquetas"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Plus size={12} />
            </button>
          </div>
        )
      }
    >
      {() => (
        <Conteudo
          pipeId={pipeId}
          etiquetas={etiquetas}
          cards={cards}
          campos={campos}
          selecionadas={selecionadas}
          onSalvarSelecao={onSalvarSelecao}
          onEtiquetasChanged={onEtiquetasChanged}
          emEdicaoRef={emEdicaoRef}
        />
      )}
    </Popover>
  );
}

function Conteudo({
  pipeId,
  etiquetas,
  cards,
  campos,
  selecionadas,
  onSalvarSelecao,
  onEtiquetasChanged,
  emEdicaoRef,
}: {
  pipeId: string;
  etiquetas: Etiqueta[];
  cards: Card[];
  campos: Campo[];
  selecionadas: string[];
  onSalvarSelecao: (ids: string[]) => void;
  onEtiquetasChanged: (etiquetas: Etiqueta[]) => void;
  emEdicaoRef: RefObject<boolean>;
}) {
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [nomeParaCriar, setNomeParaCriar] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [corEdicao, setCorEdicao] = useState("");
  const [etiquetaParaExcluir, setEtiquetaParaExcluir] = useState<Etiqueta | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ao cancelar (Esc), o input de edição some do DOM — o navegador dispara blur/focusout nele
  // por conta disso (não por causa de um clique de verdade), e esse blur borbulha até o onBlur
  // do grupo de edição. Sem essa flag, esse blur "fantasma" chamaria confirmarEdicao() de novo
  // logo depois do cancelarEdicao(), salvando o texto que o Esc devia ter descartado.
  const ignorarProximoBlurRef = useRef(false);

  const filtradas = etiquetas.filter((e) =>
    e.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  // Mapa id -> quantidade de cards que usam, usado só na confirmação de exclusão — mesma
  // lógica de etiquetas-manager-modal.tsx, agora também disponível aqui.
  const contagemUso = useMemo(() => {
    const campoEtiquetas = campoPorTipo(campos, "etiquetas");
    const mapa = new Map<string, number>();
    if (!campoEtiquetas) return mapa;
    for (const card of cards) {
      for (const id of stringArray(card.valoresCampos[campoEtiquetas.id])) {
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
      }
    }
    return mapa;
  }, [cards, campos]);

  function alternar(id: string) {
    onSalvarSelecao(
      selecionadas.includes(id) ? selecionadas.filter((x) => x !== id) : [...selecionadas, id]
    );
  }

  // Um duplo clique físico dispara dois eventos "click" antes do "dblclick" — sem esse
  // debounce, os dois cliques ligariam e desligariam a etiqueta (dois PATCH em sequência)
  // antes de entrar em modo de edição. 250ms é imperceptível pra um clique único e dá tempo
  // do "dblclick" cancelar o timer antes dele disparar.
  function aoClicarLinha(id: string) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      alternar(id);
    }, 250);
  }

  function aoDarDuploClique(etiqueta: Etiqueta) {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    emEdicaoRef.current = true;
    setEditandoId(etiqueta.id);
    setNomeEdicao(etiqueta.nome);
    setCorEdicao(etiqueta.cor);
  }

  function sairDoModoEdicao() {
    emEdicaoRef.current = false;
    setEditandoId(null);
  }

  function cancelarEdicao() {
    ignorarProximoBlurRef.current = true;
    sairDoModoEdicao();
  }

  async function confirmarEdicao() {
    const alvo = etiquetas.find((e) => e.id === editandoId);
    if (!alvo) {
      sairDoModoEdicao();
      return;
    }
    const nomeTrim = nomeEdicao.trim();
    if (!nomeTrim || (nomeTrim === alvo.nome && corEdicao === alvo.cor)) {
      sairDoModoEdicao();
      return;
    }
    try {
      const atualizada = await api.patch<Etiqueta>(`/api/pipes/${pipeId}/etiquetas/${alvo.id}`, {
        nome: nomeTrim,
        cor: corEdicao,
      });
      onEtiquetasChanged(etiquetas.map((e) => (e.id === atualizada.id ? atualizada : e)));
      toast.success("Etiqueta atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar etiqueta");
    } finally {
      sairDoModoEdicao();
    }
  }

  async function confirmarExclusao() {
    if (!etiquetaParaExcluir) return;
    const alvo = etiquetaParaExcluir;
    try {
      await api.delete(`/api/pipes/${pipeId}/etiquetas/${alvo.id}`);
      onEtiquetasChanged(etiquetas.filter((e) => e.id !== alvo.id));
      toast.success("Etiqueta excluída");
      setEtiquetaParaExcluir(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir etiqueta");
    }
  }

  function abrirCriacao(nomePreenchido: string) {
    setNomeParaCriar(nomePreenchido);
    setModalAberto(true);
  }

  async function criar(nome: string, cor: string) {
    try {
      const etiqueta = await api.post<Etiqueta>(`/api/pipes/${pipeId}/etiquetas`, { nome, cor });
      // aplica automaticamente ao card atual — comportamento já existente antes desta mudança,
      // não pode regredir: quem cria uma etiqueta no meio de um card normalmente quer usá-la ali.
      onEtiquetasChanged([...etiquetas, etiqueta]);
      onSalvarSelecao([...selecionadas, etiqueta.id]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etiqueta");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-500">Etiquetas</span>

        <Input
          autoFocus
          placeholder="Buscar etiqueta..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 text-sm"
        />

        {etiquetas.length === 0 && !busca && (
          <p className="text-sm text-slate-400">Nenhuma etiqueta cadastrada</p>
        )}

        {busca.trim() && filtradas.length === 0 ? (
          <button
            type="button"
            onClick={() => abrirCriacao(busca.trim())}
            className="flex items-center gap-1 self-start text-xs text-blue-600 hover:underline"
          >
            <Plus size={12} />
            Criar etiqueta &quot;{busca.trim()}&quot;
          </button>
        ) : (
          <>
            {filtradas.length > 0 && (
              <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
                {filtradas.map((e) =>
                  editandoId === e.id ? (
                    <div
                      key={e.id}
                      className="flex flex-col gap-1.5 rounded px-1.5 py-1.5"
                      onBlur={(ev) => {
                        if (ignorarProximoBlurRef.current) {
                          ignorarProximoBlurRef.current = false;
                          return;
                        }
                        // Clicar num swatch dispara blur no input ANTES do click do próprio
                        // swatch — só confirma/fecha quando o foco sai do grupo inteiro (input +
                        // swatches), não quando só migra pra um swatch dentro do mesmo grupo.
                        if (ev.currentTarget.contains(ev.relatedTarget as Node)) return;
                        confirmarEdicao();
                      }}
                    >
                      <Input
                        autoFocus
                        onFocus={(ev) => ev.target.select()}
                        value={nomeEdicao}
                        onChange={(ev) => setNomeEdicao(ev.target.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.preventDefault();
                            confirmarEdicao();
                          } else if (ev.key === "Escape") {
                            // Precisa parar a propagação: este popover não é Radix, então um Esc
                            // que borbulhasse seria capturado pelo Dialog Radix do card e
                            // fecharia o card inteiro junto (mesmo motivo do popover não tratar
                            // Esc pra se fechar sozinho).
                            ev.preventDefault();
                            ev.stopPropagation();
                            cancelarEdicao();
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <div className="flex flex-wrap gap-1.5 pl-0.5">
                        {CORES_ETIQUETA.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCorEdicao(c)}
                            aria-label={`Usar cor ${c}`}
                            className={cn(
                              "h-5 w-5 rounded-full",
                              corEdicao === c && "ring-2 ring-slate-900 ring-offset-1"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={e.id}
                      className="group flex items-center gap-1 rounded px-1.5 py-1.5 hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => aoClicarLinha(e.id)}
                        onDoubleClick={() => aoDarDuploClique(e)}
                        aria-pressed={selecionadas.includes(e.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: e.cor }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                          {e.nome}
                        </span>
                        {selecionadas.includes(e.id) && (
                          <Check size={14} className="shrink-0 text-blue-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEtiquetaParaExcluir(e)}
                        aria-label={`Excluir etiqueta ${e.nome}`}
                        className="shrink-0 text-slate-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => abrirCriacao("")}
              className="flex items-center gap-1 self-start text-xs text-blue-600 hover:underline"
            >
              <Plus size={12} />
              Criar nova etiqueta
            </button>
          </>
        )}
      </div>

      <EtiquetaFormModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        nomeInicial={nomeParaCriar}
        onSalvar={criar}
      />

      <Dialog
        open={etiquetaParaExcluir !== null}
        onOpenChange={(o) => !o && setEtiquetaParaExcluir(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Excluir etiqueta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            {etiquetaParaExcluir && (
              <p className="text-sm text-slate-600">
                A etiqueta{" "}
                <span className="font-semibold" style={{ color: etiquetaParaExcluir.cor }}>
                  {etiquetaParaExcluir.nome}
                </span>{" "}
                é usada em{" "}
                <span className="font-semibold">
                  {contagemUso.get(etiquetaParaExcluir.id) ?? 0}{" "}
                  {(contagemUso.get(etiquetaParaExcluir.id) ?? 0) === 1 ? "card" : "cards"}
                </span>{" "}
                atualmente. Ela será removida de todos eles — os cards não serão apagados.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEtiquetaParaExcluir(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmarExclusao}>
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
