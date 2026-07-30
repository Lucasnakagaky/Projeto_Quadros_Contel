import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ColumnHeader({
  label,
  icon: Icon,
  ativo,
  direcao,
  onClick,
  className,
}: {
  label: string;
  icon: LucideIcon;
  ativo: boolean;
  direcao: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-slate-600",
        className
      )}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 hover:text-slate-900"
      >
        <Icon size={13} className="shrink-0 text-slate-400" />
        {label}
        {ativo ? (
          direcao === "asc" ? (
            <ArrowUp size={12} className="text-slate-500" />
          ) : (
            <ArrowDown size={12} className="text-slate-500" />
          )
        ) : (
          <ArrowUpDown size={12} className="text-slate-300" />
        )}
      </button>
    </th>
  );
}
