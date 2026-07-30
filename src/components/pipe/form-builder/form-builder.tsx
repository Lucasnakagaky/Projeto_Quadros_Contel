"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Campo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CampoIcon } from "../card-modal/campo-icon";
import { CampoConfigModal, CampoFormValues } from "./campo-config-modal";

function CampoRow({
  campo,
  onEdit,
  onDelete,
}: {
  campo: Campo;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: campo.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        aria-label="Arrastar campo"
      >
        <GripVertical size={16} />
      </button>
      <CampoIcon tipo={campo.tipo} size={16} />
      <button onClick={onEdit} className="flex-1 text-left text-sm font-medium text-slate-700 hover:underline">
        {campo.titulo}
        {campo.obrigatorio && <span className="ml-1 text-red-500">*</span>}
      </button>
      <button onClick={onDelete} className="text-slate-300 hover:text-red-600" aria-label="Excluir campo">
        <Trash2 size={14} />
      </button>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  async function excluir(campo: Campo) {
    if (!confirm(`Excluir o campo "${campo.titulo}"?`)) return;
    try {
      await api.delete(`/api/pipes/${pipeId}/campos/${campo.id}`);
      onCamposChanged(campos.filter((c) => c.id !== campo.id));
      toast.success("Campo excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir campo");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = campos.findIndex((c) => c.id === active.id);
    const newIndex = campos.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(campos, oldIndex, newIndex);
    onCamposChanged(reordered);
    try {
      await api.post(`/api/pipes/${pipeId}/campos/reorder`, {
        orderedIds: reordered.map((c) => c.id),
      });
    } catch {
      toast.error("Erro ao reordenar campos");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button onClick={abrirCriacao}>
          <Plus size={16} />
          Adicionar campo
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={campos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {campos.map((campo) => (
              <CampoRow
                key={campo.id}
                campo={campo}
                onEdit={() => abrirEdicao(campo)}
                onDelete={() => excluir(campo)}
              />
            ))}
          </div>
        </SortableContext>
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
