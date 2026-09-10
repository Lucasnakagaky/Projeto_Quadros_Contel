"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export const VIEWS = [
  { value: "fluxo", label: "Fluxo" },
  { value: "kanban", label: "Kanban" },
  { value: "lista", label: "Lista" },
  { value: "relatorios", label: "Relatórios" },
] as const;

export type ViewValue = (typeof VIEWS)[number]["value"];

/**
 * `right` fica ao lado das abas (ex.: o campo de filtro do Kanban). Precisa ser irmão do
 * TabsList, nunca filho: o TabsList do Radix captura setas e digitação para navegar entre
 * as abas, o que atrapalharia um input de texto colocado dentro dele.
 */
export function ViewTabs({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-2">
      <TabsList>
        {VIEWS.map((v) => (
          <TabsTrigger key={v.value} value={v.value}>
            {v.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}
