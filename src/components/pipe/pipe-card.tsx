import Link from "next/link";
import { Pipe } from "@/lib/types";

export function PipeCard({ pipe, faseCount }: { pipe: Pipe; faseCount: number }) {
  return (
    <Link
      href={`/pipes/${pipe.id}`}
      className="group flex h-32 flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 className="truncate text-lg font-bold text-slate-900">{pipe.nome}</h3>
      <span className="text-xs font-medium text-slate-400">
        {faseCount} {faseCount === 1 ? "fase" : "fases"}
      </span>
    </Link>
  );
}
