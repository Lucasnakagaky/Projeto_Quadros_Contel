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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
