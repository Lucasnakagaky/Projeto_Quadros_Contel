"use client";

import { CalendarPlus } from "lucide-react";
import { Campo, Card, Usuario } from "@/lib/types";
import { formatarData } from "@/lib/utils";
import { CampoValueRow } from "./campo-value-row";

export function CampoValueList({
  campos,
  card,
  usuarios,
  onSalvarValor,
}: {
  campos: Campo[];
  card: Card;
  usuarios: Usuario[];
  onSalvarValor: (campoId: string, valor: unknown) => void;
}) {
  const visiveis = campos.filter(
    (c) =>
      c.tipo !== "conexao_pipe" &&
      c.tipo !== "cards_vinculados" &&
      c.tipo !== "etiquetas" &&
      // "Descrição da Demanda" mudou pra coluna "Fase atual" (card-detail-modal.tsx) — exclui
      // aqui pra não duplicar o id do campo no DOM. Checagem dupla (tipo + título) porque
      // "texto_formatado" é um tipo genérico que o usuário pode reaproveitar em outro campo.
      !(c.tipo === "texto_formatado" && c.titulo === "Descrição da Demanda") &&
      !c.arquivado
  );

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {visiveis.map((campo) =>
        campo.tipo === "data_vencimento" ? (
          <div key={campo.id} className="grid grid-cols-2 gap-2">
            <div className="flex items-start gap-2 py-1">
              <div className="mt-1">
                <CalendarPlus size={14} className="shrink-0 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-slate-500">Criação do card</span>
                <span className="text-sm text-slate-700">{formatarData(card.criadoEm)}</span>
              </div>
            </div>
            <CampoValueRow
              campo={campo}
              cardId={card.id}
              usuarios={usuarios}
              valor={card.valoresCampos[campo.id]}
              onSave={(valor) => onSalvarValor(campo.id, valor)}
            />
          </div>
        ) : (
          <CampoValueRow
            key={campo.id}
            campo={campo}
            cardId={card.id}
            usuarios={usuarios}
            valor={card.valoresCampos[campo.id]}
            onSave={(valor) => onSalvarValor(campo.id, valor)}
          />
        )
      )}
    </div>
  );
}
