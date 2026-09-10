"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `scroll-behavior: smooth` no CSS ignora a preferência do sistema por menos movimento,
 * então a decisão fica aqui, no momento do clique.
 */
function comportamentoScroll(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Pixels por frame no hover contínuo (~600px/s a 60fps). */
const VELOCIDADE_HOVER = 10;

const CLASSE_SETA =
  "pointer-events-auto absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-opacity duration-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1";

export function ScrollFade({
  children,
  className,
  fadeFrom = "from-white",
  passoScroll,
}: {
  children: ReactNode;
  className?: string;
  fadeFrom?: string;
  /** Pixels por clique nas setas de navegação. Sem esta prop, as setas não são renderizadas. */
  passoScroll?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pararRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(el, { childList: true, subtree: true });
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  function rolar(direcao: -1 | 1) {
    if (!passoScroll) return;
    ref.current?.scrollBy({ left: direcao * passoScroll, behavior: comportamentoScroll() });
  }

  // Rolagem contínua enquanto o ponteiro está sobre a seta. Usa incremento direto por frame em
  // vez de scrollBy({behavior:"smooth"}) repetido, que brigaria com a animação em voo.
  function iniciarRolagemContinua(direcao: -1 | 1) {
    if (!passoScroll || pararRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const passo = () => {
      const el = ref.current;
      if (!el) return;
      el.scrollLeft += direcao * VELOCIDADE_HOVER;
      // A seta desabilitada recebe pointer-events-none e some sob o cursor, então o
      // pointerleave pode nunca disparar — parar aqui evita o laço girando à toa.
      const chegouAoFim =
        direcao === 1 ? el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 : el.scrollLeft <= 0;
      if (chegouAoFim) return pararRolagemContinua();
      rafRef.current = requestAnimationFrame(passo);
    };

    pararRef.current = true;
    rafRef.current = requestAnimationFrame(passo);
  }

  function pararRolagemContinua() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    pararRef.current = false;
  }

  useEffect(() => pararRolagemContinua, []);

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <div ref={ref} className={cn("scrollbar-fina h-full overflow-x-auto", className)}>
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-200",
          fadeFrom,
          canScrollLeft && "opacity-100"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent opacity-0 transition-opacity duration-200",
          fadeFrom,
          canScrollRight && "opacity-100"
        )}
      />

      {passoScroll && (
        <>
          <button
            type="button"
            onClick={() => rolar(-1)}
            onPointerEnter={() => iniciarRolagemContinua(-1)}
            onPointerLeave={pararRolagemContinua}
            onBlur={pararRolagemContinua}
            disabled={!canScrollLeft}
            aria-label="Rolar quadro para a esquerda"
            className={cn(CLASSE_SETA, "left-2", !canScrollLeft && "pointer-events-none opacity-0")}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => rolar(1)}
            onPointerEnter={() => iniciarRolagemContinua(1)}
            onPointerLeave={pararRolagemContinua}
            onBlur={pararRolagemContinua}
            disabled={!canScrollRight}
            aria-label="Rolar quadro para a direita"
            className={cn(CLASSE_SETA, "right-2", !canScrollRight && "pointer-events-none opacity-0")}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}
