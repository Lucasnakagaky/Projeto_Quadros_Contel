"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 cursor-pointer",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        <Check size={12} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
