"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Popover({
  trigger,
  children,
  align = "start",
  className,
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (state: { close: () => void }) => ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const alvo = e.target as Node;
      if (ref.current?.contains(alvo)) return;
      if (alvo instanceof Element && ref.current) {
        const dialogAncestor = alvo.closest('[role="dialog"]');
        // Um Dialog Radix aberto a partir de dentro do popover (ex.: EtiquetaFormModal) é
        // renderizado via Portal direto em document.body — no DOM real ele NÃO é descendente do
        // ref do popover, mesmo sendo descendente na árvore React. Sem essa checagem, qualquer
        // clique dentro desse modal (inclusive no botão "Salvar") seria lido como "clique fora" e
        // fecharia o popover — e junto o modal — antes do modal processar o próprio clique.
        // Só ignora quando o dialog encontrado NÃO contém este popover — um dialog ancestral
        // (ex.: o modal do card, que contém o próprio popover) ainda deve fechar normalmente.
        if (dialogAncestor && !dialogAncestor.contains(ref.current)) return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
