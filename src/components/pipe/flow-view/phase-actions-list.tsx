"use client";

import { toast } from "sonner";
import { Workflow, Users, ListPlus } from "lucide-react";

export function PhaseActionsList({
  onAdicionarCampos,
  onAtribuirMembros,
}: {
  onAdicionarCampos: () => void;
  onAtribuirMembros: () => void;
}) {
  const acoes = [
    {
      label: "Adicionar automação",
      icon: Workflow,
      cor: "text-slate-400",
      onClick: () => toast("Automações — em breve"),
    },
    {
      label: "Atribuir membros",
      icon: Users,
      cor: "text-slate-400",
      onClick: onAtribuirMembros,
    },
    {
      label: "Adicionar campos",
      icon: ListPlus,
      cor: "text-slate-400",
      onClick: onAdicionarCampos,
    },
  ];

  return (
    <div className="flex flex-col">
      {acoes.map((acao) => (
        <button
          key={acao.label}
          onClick={(e) => {
            e.stopPropagation();
            acao.onClick();
          }}
          className="gdt-focus flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-slate-600 transition-colors duration-(--duracao-rapida) hover:bg-white/80 hover:text-indigo-700"
        >
          <acao.icon size={15} className={acao.cor} />
          {acao.label}
        </button>
      ))}
    </div>
  );
}
