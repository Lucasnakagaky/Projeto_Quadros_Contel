"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { ArrowLeft, Maximize2, Minimize2, Pencil, X } from "lucide-react";
import { Fase, Usuario } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function ProcessOverviewDrawer({
  open,
  onOpenChange,
  fase,
  usuarios,
  podeVoltar,
  onVoltar,
  onSalvarDescricao,
  onAbrirMembros,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fase: Fase | null;
  usuarios: Usuario[];
  podeVoltar: boolean;
  onVoltar: () => void;
  onSalvarDescricao: (descricao: string) => void;
  onAbrirMembros: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [editandoDescricao, setEditandoDescricao] = useState(false);
  const [rascunho, setRascunho] = useState(fase?.descricao ?? "");

  const [faseIdAnterior, setFaseIdAnterior] = useState(fase?.id);
  if (fase?.id !== faseIdAnterior) {
    setFaseIdAnterior(fase?.id);
    setEditandoDescricao(false);
    setRascunho(fase?.descricao ?? "");
  }

  const responsaveis = fase
    ? fase.responsavelIds.map((id) => usuarios.find((u) => u.id === id)).filter((u): u is Usuario => Boolean(u))
    : [];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full flex-col bg-white shadow-2xl focus:outline-none",
            expandido ? "w-[640px]" : "w-96"
          )}
        >
          <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-2.5">
            <button
              onClick={onVoltar}
              disabled={!podeVoltar}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              aria-label="Fase anterior"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="flex-1" />
            <button
              onClick={() => setExpandido((v) => !v)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Expandir painel"
            >
              {expandido ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <DialogPrimitive.Close
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <DialogPrimitive.Title className="flex items-center gap-2 text-xl font-bold text-slate-900">
              {fase && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: fase.cor }} />}
              {fase?.nome}
            </DialogPrimitive.Title>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Descrição
                </span>
                {!editandoDescricao && (
                  <button
                    onClick={() => setEditandoDescricao(true)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Editar descrição"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              {editandoDescricao ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    rows={3}
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onSalvarDescricao(rascunho);
                        setEditandoDescricao(false);
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRascunho(fase?.descricao ?? "");
                        setEditandoDescricao(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  {fase?.descricao || "Adicione contexto para ajudar sua equipe a entender o propósito desta fase."}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Pessoas
                </span>
                <button
                  onClick={onAbrirMembros}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Editar pessoas"
                >
                  <Pencil size={13} />
                </button>
              </div>
              {responsaveis.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {responsaveis.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Avatar nome={u.nome} cor={u.corAvatar} size={22} />
                      <span className="text-sm text-slate-700">{u.nome}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Ninguém foi designado para esta fase. Atribua responsáveis para organizar o trabalho.
                </p>
              )}
            </section>

            <button
              onClick={() => toast("Enviar feedback — em breve")}
              className="mt-auto self-start text-xs text-blue-600 hover:underline"
            >
              Enviar feedback
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
