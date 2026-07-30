"use client";

import { toast } from "sonner";
import { Sparkles, Workflow, Users, ListPlus } from "lucide-react";

export function PhaseActionsList({
  onAdicionarCampos,
  onAtribuirMembros,
}: {
  onAdicionarCampos: () => void;
  onAtribuirMembros: () => void;
}) {
  const acoes = [
    {
      label: "Adicionar agente de IA",
      icon: Sparkles,
      cor: "text-violet-500",
      onClick: () => toast("Agentes de IA — em breve"),
    },
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
          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
        >
          <acao.icon size={15} className={acao.cor} />
          {acao.label}
        </button>
      ))}
    </div>
  );
}
