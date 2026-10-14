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
    <div className="gdt-barra mx-4 mt-3 flex min-h-[58px] shrink-0 flex-wrap items-center gap-3 px-3 py-2">
      <TabsList>
        {VIEWS.map((v) => (
          // Estilo contextual da Gestão de Demandas: o padrão de ui/tabs (usado também no modal
          // do card) não muda; o cn()/twMerge só sobrepõe estas classes aqui.
          <TabsTrigger
            key={v.value}
            value={v.value}
            className="gdt-focus cursor-pointer px-4 font-semibold text-slate-600 duration-(--duracao-base) hover:bg-white/80 hover:text-indigo-700 data-[state=active]:bg-transparent data-[state=active]:bg-linear-to-r data-[state=active]:from-(--gdt-aba-1) data-[state=active]:via-(--gdt-aba-2) data-[state=active]:to-(--gdt-aba-3) data-[state=active]:text-white data-[state=active]:shadow-(--gdt-aba-sombra)"
          >
            {v.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}
