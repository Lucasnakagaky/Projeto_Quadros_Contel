"use client";

import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Inbox, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react";
import { Campo, Card, CardRelacionado, Etiqueta, Fase, Usuario } from "@/lib/types";
import { CardChip } from "./card-chip";
import { FaseHeaderPopover } from "./fase-header-popover";
import { NovaFaseModal, NovaFaseValues } from "./nova-fase-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { textoSobre } from "@/lib/cor-fase";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1";

export function FaseColumn({
  fase,
  cards,
  campos,
  etiquetas,
  usuarios,
  filhosPorCard,
  paisPorCard,
  isDropTarget = false,
  filtroAtivo = false,
  animarEntrada = false,
  indice = 0,
  onOpenCard,
  onCreateCard,
  onUpdateFase,
  onDeleteFase,
  onFiltrarEtiqueta,
}: {
  fase: Fase;
  cards: Card[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  filhosPorCard: Record<string, CardRelacionado[]>;
  paisPorCard: Record<string, CardRelacionado[]>;
  isDropTarget?: boolean;
  /** Há um filtro de pesquisa ativo no quadro — muda só a mensagem de coluna vazia. */
  filtroAtivo?: boolean;
  /** Só é true no primeiro render do quadro — ver `animarEntrada` no pipe-board. */
  animarEntrada?: boolean;
  /** Posição da coluna no quadro, usada só para escalonar a entrada. */
  indice?: number;
  onOpenCard: (id: string) => void;
  onCreateCard: (faseId: string) => void;
  onUpdateFase: (faseId: string, patch: Partial<NovaFaseValues> & { cor?: string }) => void;
  onDeleteFase: (faseId: string) => void;
  onFiltrarEtiqueta?: (nome: string) => void;
}) {
  const [configurando, setConfigurando] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `fase-${fase.id}`,
    data: { type: "fase" },
  });
  const { setNodeRef: setDroppableRef } = useDroppable({ id: fase.id });

  // `--fase` / `--fase-texto` alimentam todo o visual da coluna e dos cards (globals.css, gdt-*).
  // Só leitura de fase.cor: nada aqui altera o dado.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    "--fase": fase.cor,
    "--fase-texto": textoSobre(fase.cor),
    ...(animarEntrada ? { animationDelay: `${Math.min(indice, 6) * 45}ms` } : null),
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // gdt-coluna-vidro: material de vidro (blur moderado) só nas colunas do Kanban.
        "gdt-coluna gdt-coluna-vidro flex h-full w-[280px] shrink-0 flex-col",
        isDropTarget && "gdt-coluna-alvo",
        animarEntrada && "anim-coluna-entra",
        isDragging && "opacity-50"
      )}
    >
      <div className="gdt-coluna-topo shrink-0" />

      <div className="group flex h-11 shrink-0 items-center gap-1 px-3">
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab touch-none rounded-md p-1 text-slate-400 transition-colors duration-(--duracao-rapida) hover:bg-white/70 hover:text-slate-600 active:cursor-grabbing",
            FOCUS_RING
          )}
          aria-label="Arrastar fase"
        >
          <GripVertical size={16} />
        </button>

        <FaseHeaderPopover
          fase={fase}
          onSave={(patch) => onUpdateFase(fase.id, patch)}
          onConfigurar={() => setConfigurando(true)}
        />

        <span className="gdt-contador ml-auto">{cards.length}</span>

        <div className="flex items-center opacity-0 transition-opacity duration-(--duracao-rapida) focus-within:opacity-100 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[rgb(75,88,99)] transition-colors duration-(--duracao-rapida) hover:bg-white/70",
                  FOCUS_RING
                )}
                aria-label={`Mais opções da fase ${fase.nome}`}
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setConfigurando(true)}>
                <Settings2 size={14} />
                Configurar fase
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDeleteFase(fase.id)}
                className="text-red-600 data-[highlighted]:bg-red-50"
              >
                <Trash2 size={14} />
                Excluir fase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {fase.permiteCriarCards && (
            <button
              onClick={() => onCreateCard(fase.id)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[rgb(75,88,99)] transition-colors duration-(--duracao-rapida) hover:bg-white/70",
                FOCUS_RING
              )}
              aria-label={`Criar novo card na fase ${fase.nome}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-[19px]">
        {fase.permiteCriarCards && (
          <div className="shrink-0 px-3 pb-3 pt-1">
            <Button
              onClick={() => onCreateCard(fase.id)}
              size="pill"
              style={{ color: "var(--fase-texto)" }}
              // transition-[...] substitui o `transition-colors` do Button, que impediria animar
              // a elevação/glow do .gdt-botao-fase no hover.
              className={cn(
                "gdt-botao-fase w-full gap-1.5 rounded-xl font-semibold transition-[translate,box-shadow,filter] duration-(--duracao-rapida)",
                FOCUS_RING
              )}
            >
              <Plus size={16} />
              Criar novo card
            </Button>
          </div>
        )}

        <div
          ref={setDroppableRef}
          className="scrollbar-fina flex min-h-[8px] flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3 pt-0"
        >
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card, i) => (
              <CardChip
                key={card.id}
                card={card}
                campos={campos}
                etiquetas={etiquetas}
                usuarios={usuarios}
                filhos={filhosPorCard[card.id] ?? []}
                pai={(paisPorCard[card.id] ?? [])[0]}
                onOpen={() => onOpenCard(card.id)}
                onOpenCard={onOpenCard}
                onFiltrarEtiqueta={onFiltrarEtiqueta}
                animarEntrada={animarEntrada}
                indice={i}
              />
            ))}
          </SortableContext>

          {cards.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
              <Inbox size={20} className="text-slate-300" />
              <p className="text-[13px] text-slate-500">
                {filtroAtivo ? "Nenhum card nesta fase com esse filtro." : "Nenhum card nesta fase."}
              </p>
            </div>
          )}
        </div>

        {/* Descrição da fase como rodapé fixo (padrão Pipefy). Antes ela só aparecia
            quando a coluna estava vazia, então sumia justamente quando havia trabalho. */}
        {fase.descricao && (
          <p className="shrink-0 border-t border-[color-mix(in_srgb,var(--fase)_18%,white)] px-3 py-2.5 text-center text-[11px] leading-4 text-slate-500">
            {fase.descricao}
          </p>
        )}
      </div>

      <NovaFaseModal
        open={configurando}
        onOpenChange={setConfigurando}
        mode="editar"
        initial={{ nome: fase.nome, ehFinal: fase.ehFinal, permiteCriarCards: fase.permiteCriarCards }}
        onSubmit={(values) => onUpdateFase(fase.id, values)}
        onDelete={() => onDeleteFase(fase.id)}
      />
    </div>
  );
}
