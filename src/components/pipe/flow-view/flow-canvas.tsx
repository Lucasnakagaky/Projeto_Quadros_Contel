"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Campo, Fase, Usuario } from "@/lib/types";
import { StartFormCard } from "./start-form-card";
import { PhaseCard } from "./phase-card";
import { FlowConnector } from "./flow-connector";
import { ZoomControls } from "./zoom-controls";
import { ProcessOverviewDrawer } from "./process-overview-drawer";
import { AtribuirMembrosModal } from "./atribuir-membros-modal";

type FasePatch = Partial<
  Pick<Fase, "nome" | "cor" | "ehFinal" | "permiteCriarCards" | "descricao" | "responsavelIds">
>;

export function FlowCanvas({
  fases,
  campos,
  usuarios,
  onReorderFases,
  onUpdateFase,
  onAbrirCampos,
}: {
  fases: Fase[];
  campos: Campo[];
  usuarios: Usuario[];
  onReorderFases: (reordered: Fase[]) => Promise<void>;
  onUpdateFase: (faseId: string, patch: FasePatch) => Promise<void>;
  onAbrirCampos: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(
    null
  );

  const [drawerFaseId, setDrawerFaseId] = useState<string | null>(null);
  const [membrosFaseId, setMembrosFaseId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const faseIds = fases.map((f) => `fase-${f.id}`);

  useEffect(() => {
    if (!arrastando) return;
    function handleMouseMove(e: MouseEvent) {
      if (!panRef.current) return;
      setPan({
        x: panRef.current.startPanX + (e.clientX - panRef.current.startX),
        y: panRef.current.startPanY + (e.clientY - panRef.current.startY),
      });
    }
    function handleMouseUp() {
      setArrastando(false);
      panRef.current = null;
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando]);

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return;
    panRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    setArrastando(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fases.findIndex((f) => `fase-${f.id}` === active.id);
    const newIndex = fases.findIndex((f) => `fase-${f.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderFases(arrayMove(fases, oldIndex, newIndex));
  }

  const faseDrawer = fases.find((f) => f.id === drawerFaseId) ?? null;
  const indiceDrawer = fases.findIndex((f) => f.id === drawerFaseId);
  const faseMembros = fases.find((f) => f.id === membrosFaseId) ?? null;

  function voltarFase() {
    if (indiceDrawer > 0) setDrawerFaseId(fases[indiceDrawer - 1].id);
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="flex items-center justify-end px-6 py-3">
        <Button
          variant="outline"
          className="rounded-full border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={() => setDrawerFaseId(fases[0]?.id ?? null)}
        >
          Visão geral do processo
        </Button>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        style={{ cursor: arrastando ? "grabbing" : "grab" }}
      >
        <div
          onMouseDown={handleCanvasMouseDown}
          className="flex h-full w-full items-center gap-0 px-16"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 50%",
          }}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <StartFormCard quantidadeCampos={campos.length} onAbrirCampos={onAbrirCampos} />
            <FlowConnector />
            <SortableContext items={faseIds} strategy={horizontalListSortingStrategy}>
              {fases.map((fase, i) => (
                <div key={fase.id} className="flex items-center">
                  <PhaseCard
                    fase={fase}
                    onAbrir={() => setDrawerFaseId(fase.id)}
                    onAdicionarCampos={onAbrirCampos}
                    onAtribuirMembros={() => setMembrosFaseId(fase.id)}
                  />
                  {i < fases.length - 1 && <FlowConnector />}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <ZoomControls
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
          onZoomOut={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
          onReset={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        />
      </div>

      <ProcessOverviewDrawer
        open={Boolean(faseDrawer)}
        onOpenChange={(open) => !open && setDrawerFaseId(null)}
        fase={faseDrawer}
        usuarios={usuarios}
        podeVoltar={indiceDrawer > 0}
        onVoltar={voltarFase}
        onSalvarDescricao={(descricao) => {
          if (drawerFaseId) onUpdateFase(drawerFaseId, { descricao });
        }}
        onAbrirMembros={() => faseDrawer && setMembrosFaseId(faseDrawer.id)}
      />

      <AtribuirMembrosModal
        open={Boolean(faseMembros)}
        onOpenChange={(open) => !open && setMembrosFaseId(null)}
        fase={faseMembros}
        usuarios={usuarios}
        onSalvar={(responsavelIds) => {
          if (membrosFaseId) onUpdateFase(membrosFaseId, { responsavelIds });
        }}
      />
    </div>
  );
}
