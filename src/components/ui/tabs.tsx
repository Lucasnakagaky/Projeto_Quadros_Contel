"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("flex flex-wrap gap-1.5", className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 outline-none transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
