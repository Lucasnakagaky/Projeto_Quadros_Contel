import { iniciais } from "@/lib/utils";

export function Avatar({
  nome,
  cor,
  size = 28,
}: {
  nome: string;
  cor?: string;
  size?: number;
}) {
  return (
    <div
      title={nome}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: cor ?? "#64748b",
      }}
    >
      {iniciais(nome)}
    </div>
  );
}
