"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";
import { ImageLightbox, ImagemAmpliada } from "./image-lightbox";

const CLASSES_CONTEUDO =
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded [&_img]:cursor-zoom-in";

/**
 * Exibe HTML sanitizado (negrito/itálico/listas/imagem) com zoom de imagem ao clicar/Enter —
 * usado tanto pela Descrição da Demanda quanto pelos Comentários, pra não duplicar o handler de
 * lightbox e a acessibilidade de teclado nas imagens em cada lugar que precisar dessa exibição.
 */
export function HtmlFormatadoView({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState<ImagemAmpliada>(null);

  // Torna as imagens focáveis/anunciáveis por teclado (o conteúdo vem de
  // dangerouslySetInnerHTML, então não dá pra passar tabIndex/aria-label via JSX direto nelas).
  useEffect(() => {
    ref.current?.querySelectorAll("img").forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", img.alt ? `Ampliar imagem: ${img.alt}` : "Ampliar imagem");
    });
  }, [html]);

  function aoInteragirComImagem(e: React.SyntheticEvent) {
    const alvo = e.target as HTMLElement;
    if (alvo.tagName !== "IMG") return;
    e.preventDefault();
    e.stopPropagation();
    const img = alvo as HTMLImageElement;
    setImagemAmpliada({ src: img.src, alt: img.alt });
  }

  return (
    <>
      <div
        ref={ref}
        className={cn(CLASSES_CONTEUDO, className)}
        // Sanitiza também na exibição (defesa em profundidade): o valor pode ter sido salvo por
        // outro caminho que não passa pelo editor.
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        onClick={aoInteragirComImagem}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") aoInteragirComImagem(e);
        }}
      />
      <ImageLightbox imagem={imagemAmpliada} onOpenChange={(open) => !open && setImagemAmpliada(null)} />
    </>
  );
}
