"use client";

import { Columns3 } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { COLUNAS, ColunaId } from "./colunas";

export function ColumnVisibilityPopover({
  colunasVisiveis,
  onToggle,
}: {
  colunasVisiveis: ColunaId[];
  onToggle: (id: ColunaId) => void;
}) {
  return (
    <Popover
      align="end"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Columns3 size={14} />
          Colunas
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-xs font-semibold text-slate-500">Colunas visíveis</span>
          {COLUNAS.map((coluna) => (
            <label
              key={coluna.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Checkbox
                checked={colunasVisiveis.includes(coluna.id)}
                onCheckedChange={() => onToggle(coluna.id)}
              />
              <coluna.icon size={13} className="text-slate-400" />
              {coluna.label}
            </label>
          ))}
        </div>
      )}
    </Popover>
  );
}
