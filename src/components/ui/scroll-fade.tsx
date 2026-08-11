"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScrollFade({
  children,
  className,
  fadeFrom = "from-white",
}: {
  children: ReactNode;
  className?: string;
  fadeFrom?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <div className="relative min-w-0 flex-1">
      <div ref={ref} className={cn("h-full overflow-x-auto", className)}>
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
    </div>
  );
}
