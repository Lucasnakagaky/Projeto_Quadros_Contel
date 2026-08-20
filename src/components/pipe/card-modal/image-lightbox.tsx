"use client";

import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type ImagemAmpliada = { src: string; alt: string } | null;

/**
 * Visualização em tamanho grande de uma imagem da descrição (campo "texto_formatado"). Reaproveita
 * o Dialog do projeto (Radix) — ESC e clique fora já fecham de graça, só sobrescreve a moldura
 * padrão (branca, com cantos arredondados) por um visualizador sem fundo, com um botão de fechar
 * com contraste próprio (a imagem por trás pode ser clara ou escura).
 */
export function ImageLightbox({
  imagem,
  onOpenChange,
}: {
  imagem: ImagemAmpliada;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={imagem !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="max-h-none w-fit max-w-[92vw] overflow-visible border-none bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{imagem?.alt || "Imagem ampliada"}</DialogTitle>
        {imagem && (
          // eslint-disable-next-line @next/next/no-img-element -- src é local (/uploads/...), sem otimização do next/image necessária aqui
          <img
            src={imagem.src}
            alt={imagem.alt}
            className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain"
          />
        )}
        <DialogClose
          aria-label="Fechar"
          className="absolute -right-3 -top-3 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <X size={18} />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
