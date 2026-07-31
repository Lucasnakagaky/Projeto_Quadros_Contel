"use client";

import { Campo, Card, Etiqueta, Usuario } from "@/lib/types";
import { CampoValueRow } from "./campo-value-row";

export function CampoValueList({
  campos,
  card,
  pipeId,
  etiquetas,
  usuarios,
  onSalvarValor,
  onEtiquetaCriada,
  onEtiquetaAtualizada,
  onEtiquetaExcluida,
}: {
  campos: Campo[];
  card: Card;
  pipeId: string;
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  onSalvarValor: (campoId: string, valor: unknown) => void;
  onEtiquetaCriada: (etiqueta: Etiqueta) => void;
  onEtiquetaAtualizada: (etiqueta: Etiqueta) => void;
  onEtiquetaExcluida: (etiquetaId: string) => void;
}) {
  const visiveis = campos.filter((c) => c.tipo !== "conexao_pipe");

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {visiveis.map((campo) => (
        <CampoValueRow
          key={campo.id}
          campo={campo}
          cardId={card.id}
          pipeId={pipeId}
          valor={card.valoresCampos[campo.id]}
          etiquetas={etiquetas}
          usuarios={usuarios}
          onSave={(valor) => onSalvarValor(campo.id, valor)}
          onEtiquetaCriada={onEtiquetaCriada}
          onEtiquetaAtualizada={onEtiquetaAtualizada}
          onEtiquetaExcluida={onEtiquetaExcluida}
        />
      ))}
    </div>
  );
}
