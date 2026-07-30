import { Sparkles } from "lucide-react";

export function EmBrevePanel({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
      <Sparkles size={28} />
      <p className="text-sm font-medium">{titulo} — em breve</p>
    </div>
  );
}
