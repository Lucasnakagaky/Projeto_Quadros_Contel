"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArchiveRestore,
  Copy,
  GripVertical,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Campo, TIPOS_CAMPO, TipoCampo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampoIcon } from "../card-modal/campo-icon";
import { CampoConfigModal, CampoFormValues } from "./campo-config-modal";

function PaletteItem({ tipo, label, onAdd }: { tipo: TipoCampo; label: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `paleta-${tipo}`,
    data: { type: "paleta", tipo },
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      onClick={onAdd}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/60 active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <CampoIcon tipo={tipo} size={15} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Canvas({ vazio, isOver, setNodeRef, children }: {
  vazio: boolean;
  isOver: boolean;
  setNodeRef: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[220px] flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-3 transition-colors",
        vazio ? "items-center justify-center text-center" : "border-transparent p-0",
        isOver && "border-blue-400 bg-blue-50/60"
      )}
    >
      {children}
    </div>
  );
}

function CampoRow({
  campo,
  onEdit,
  onDuplicar,
  onArquivar,
  onExcluir,
}: {
  campo: Campo;
  onEdit: () => void;
  onDuplicar: () => void;
  onArquivar: () => void;
  onExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: campo.id,
    data: { type: "campo" },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5",
        isDragging && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        aria-label={`Arrastar campo ${campo.titulo}`}
      >
        <GripVertical size={16} />
      </button>
      <CampoIcon tipo={campo.tipo} size={16} />
      <span className="flex-1 truncate text-sm font-medium text-slate-700">
        {campo.titulo}
        {campo.obrigatorio && (
          <span className="ml-1 text-red-500" aria-label="obrigatório">
            *
          </span>
        )}
      </span>
      <button
        onClick={onEdit}
        className="text-slate-300 hover:text-slate-600"
        aria-label={`Editar campo ${campo.titulo}`}
      >
        <Pencil size={14} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-slate-300 hover:text-slate-600"
            aria-label={`Mais ações para o campo ${campo.titulo}`}
          >
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled title="Em breve">
            Dependências do campo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicar}>
            <Copy size={14} />
            Duplicar campo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onArquivar}>
            <Archive size={14} />
            Arquivar campo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onExcluir} className="text-red-600 data-[highlighted]:bg-red-50">
            <Trash2 size={14} />
            Excluir campo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FormBuilder({
  pipeId,
  campos,
  onCamposChanged,
}: {
  pipeId: string;
  campos: Campo[];
  onCamposChanged: (campos: Campo[]) => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [campoEditando, setCampoEditando] = useState<Campo | undefined>(undefined);
  const [arquivadosAbertos, setArquivadosAbertos] = useState(false);
  const [paletaArrastando, setPaletaArrastando] = useState<{ tipo: TipoCampo; label: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { setNodeRef: setCanvasRef, isOver: canvasIsOver } = useDroppable({ id: "canvas-dropzone" });

  const ativos = campos.filter((c) => !c.arquivado);
  const arquivados = campos.filter((c) => c.arquivado);
  const tiposCampo = TIPOS_CAMPO.filter((t) => t.grupo === "campo");
  const tiposConexao = TIPOS_CAMPO.filter((t) => t.grupo === "conexao");

  function abrirCriacao() {
    setCampoEditando(undefined);
    setModalAberto(true);
  }

  function abrirEdicao(campo: Campo) {
    setCampoEditando(campo);
    setModalAberto(true);
  }

  async function salvar(values: CampoFormValues) {
    try {
      if (campoEditando) {
        const atualizado = await api.patch<Campo>(
          `/api/pipes/${pipeId}/campos/${campoEditando.id}`,
          values
        );
        onCamposChanged(campos.map((c) => (c.id === atualizado.id ? atualizado : c)));
        toast.success("Campo atualizado");
      } else {
        const criado = await api.post<Campo>(`/api/pipes/${pipeId}/campos`, values);
        onCamposChanged([...campos, criado]);
        toast.success("Campo criado");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar campo");
    }
  }

  async function adicionarTipo(tipo: TipoCampo, label: string) {
    try {
      const criado = await api.post<Campo>(`/api/pipes/${pipeId}/campos`, {
        tipo,
        titulo: label,
      });
      onCamposChanged([...campos, criado]);
      toast.success(`Campo "${label}" adicionado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar campo");
    }
  }

  async function duplicar(campo: Campo) {
    try {
      const criado = await api.post<Campo>(`/api/pipes/${pipeId}/campos`, {
        tipo: campo.tipo,
        titulo: `${campo.titulo} (cópia)`,
        obrigatorio: campo.obrigatorio,
        descricao: campo.descricao,
        textoAjuda: campo.textoAjuda,
        visualizacaoCompacta: campo.visualizacaoCompacta,
        editavelEmOutrasFases: campo.editavelEmOutrasFases,
        valorUnico: campo.valorUnico,
        validacaoCustomizada: campo.validacaoCustomizada,
        config: campo.config,
      });
      onCamposChanged([...campos, criado]);
      toast.success("Campo duplicado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar campo");
    }
  }

  async function arquivar(campo: Campo) {
    try {
      const atualizado = await api.patch<Campo>(`/api/pipes/${pipeId}/campos/${campo.id}`, {
        arquivado: true,
      });
      onCamposChanged(campos.map((c) => (c.id === atualizado.id ? atualizado : c)));
      toast.success("Campo arquivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar campo");
    }
  }

  async function restaurar(campo: Campo) {
    try {
      const atualizado = await api.patch<Campo>(`/api/pipes/${pipeId}/campos/${campo.id}`, {
        arquivado: false,
      });
      onCamposChanged(campos.map((c) => (c.id === atualizado.id ? atualizado : c)));
      toast.success("Campo restaurado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar campo");
    }
  }

  async function excluir(campo: Campo) {
    if (
      !confirm(
        `Excluir permanentemente o campo "${campo.titulo}"? Os valores já preenchidos nos cards serão perdidos.`
      )
    )
      return;
    try {
      await api.delete(`/api/pipes/${pipeId}/campos/${campo.id}`);
      onCamposChanged(campos.filter((c) => c.id !== campo.id));
      toast.success("Campo excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir campo");
    }
  }

  async function persistirOrdem(reordenados: Campo[]) {
    try {
      await api.post(`/api/pipes/${pipeId}/campos/reorder`, {
        orderedIds: reordenados.map((c) => c.id),
      });
    } catch {
      toast.error("Erro ao reordenar campos");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "paleta") {
      const tipo = data.tipo as TipoCampo;
      setPaletaArrastando({ tipo, label: TIPOS_CAMPO.find((t) => t.tipo === tipo)?.label ?? "" });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setPaletaArrastando(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "paleta") {
      const tipo = active.data.current.tipo as TipoCampo;
      const label = TIPOS_CAMPO.find((t) => t.tipo === tipo)?.label ?? tipo;
      adicionarTipo(tipo, label);
      return;
    }

    if (active.id === over.id) return;
    const oldIndex = ativos.findIndex((c) => c.id === active.id);
    const newIndex = ativos.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordenados = arrayMove(ativos, oldIndex, newIndex);
    onCamposChanged([...reordenados, ...arquivados]);
    persistirOrdem(reordenados);
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex w-full shrink-0 flex-col gap-4 lg:w-56">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tipos de campo
              </span>
              <div className="flex flex-col gap-1.5">
                {tiposCampo.map((t) => (
                  <PaletteItem
                    key={t.tipo}
                    tipo={t.tipo}
                    label={t.label}
                    onAdd={() => adicionarTipo(t.tipo, t.label)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Campos de conexão
                </span>
                <span className="text-[11px] text-slate-400">
                  Adicione esses tipos de campo para trocar dados entre pipes e databases
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {tiposConexao.map((t) => (
                  <PaletteItem
                    key={t.tipo}
                    tipo={t.tipo}
                    label={t.label}
                    onAdd={() => adicionarTipo(t.tipo, t.label)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Campos ativos
              </span>
              <Button size="sm" variant="outline" onClick={abrirCriacao}>
                <Plus size={14} />
                Adicionar campo
              </Button>
            </div>

            <SortableContext items={ativos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <Canvas vazio={ativos.length === 0} isOver={canvasIsOver} setNodeRef={setCanvasRef}>
                {ativos.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 text-sm text-slate-400">
                    <LayoutGrid size={22} className="text-slate-300" />
                    Arraste e solte campos aqui, ou clique num tipo ao lado
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {ativos.map((campo) => (
                      <CampoRow
                        key={campo.id}
                        campo={campo}
                        onEdit={() => abrirEdicao(campo)}
                        onDuplicar={() => duplicar(campo)}
                        onArquivar={() => arquivar(campo)}
                        onExcluir={() => excluir(campo)}
                      />
                    ))}
                  </div>
                )}
              </Canvas>
            </SortableContext>

            {arquivados.length > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
                <button
                  onClick={() => setArquivadosAbertos((v) => !v)}
                  aria-expanded={arquivadosAbertos}
                  className="flex items-center gap-1.5 text-left text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  <Archive size={13} />
                  Campos arquivados ({arquivados.length})
                </button>
                {arquivadosAbertos &&
                  arquivados.map((campo) => (
                    <div
                      key={campo.id}
                      className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2"
                    >
                      <CampoIcon tipo={campo.tipo} size={16} />
                      <span className="flex-1 truncate text-sm text-slate-500">{campo.titulo}</span>
                      <button
                        onClick={() => restaurar(campo)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                      >
                        <ArchiveRestore size={13} />
                        Restaurar
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {paletaArrastando ? (
            <div className="flex items-center gap-2 rounded-md border border-blue-300 bg-white px-2.5 py-2 text-sm text-slate-700 shadow-lg">
              <CampoIcon tipo={paletaArrastando.tipo} size={15} />
              {paletaArrastando.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CampoConfigModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        pipeId={pipeId}
        campo={campoEditando}
        onSalvar={salvar}
      />
    </div>
  );
}
