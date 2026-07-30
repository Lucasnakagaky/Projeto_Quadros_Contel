"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export const VIEWS = [
  { value: "mapa", label: "Mapa" },
  { value: "fluxo", label: "Fluxo" },
  { value: "kanban", label: "Kanban" },
  { value: "lista", label: "Lista" },
  { value: "relatorios", label: "Relatórios" },
  { value: "formulario", label: "Formulário" },
  { value: "emails", label: "Emails" },
  { value: "paineis", label: "Painéis" },
] as const;

export type ViewValue = (typeof VIEWS)[number]["value"];

export function ViewTabs() {
  return (
    <TabsList className="border-b border-slate-200 px-6 py-2">
      {VIEWS.map((v) => (
        <TabsTrigger key={v.value} value={v.value}>
          {v.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
