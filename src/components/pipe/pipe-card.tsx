import Link from "next/link";
import { Boxes, LayoutGrid, Workflow } from "lucide-react";
import { Pipe, CORES_FASE } from "@/lib/types";
import { corDeterministica } from "@/lib/utils";

export function PipeCard({
  pipe,
  faseCount,
  cardCount,
}: {
  pipe: Pipe;
  faseCount: number;
  cardCount: number;
}) {
  const cor = corDeterministica(pipe.id, CORES_FASE);

  return (
    <Link
      href={`/pipes/${pipe.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-1.5 shrink-0" style={{ backgroundColor: cor }} />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${cor}1f`, color: cor }}
          >
            <Boxes size={18} />
          </span>
          <h3 className="truncate text-lg font-bold text-slate-900">{pipe.nome}</h3>
        </div>

        <div className="mt-auto flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <Workflow size={13} className="text-slate-400" />
            {faseCount} {faseCount === 1 ? "fase" : "fases"}
          </span>
          <span className="flex items-center gap-1">
            <LayoutGrid size={13} className="text-slate-400" />
            {cardCount} {cardCount === 1 ? "card" : "cards"}
          </span>
        </div>
      </div>
    </Link>
  );
}
