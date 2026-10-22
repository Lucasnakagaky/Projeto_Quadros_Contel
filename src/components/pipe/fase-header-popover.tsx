"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Fase } from "@/lib/types";
import { CORES_FASE } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FaseHeaderPopover({
  fase,
  onSave,
  onConfigurar,
}: {
  fase: Fase;
  onSave: (patch: { nome?: string; cor?: string }) => void;
  onConfigurar: () => void;
}) {
  return (
    <Popover
      wrapperClassName="min-w-0 flex-1"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="gdt-focus block w-full cursor-pointer truncate text-left text-sm font-medium text-slate-800 hover:underline"
        >
          {fase.nome}
        </button>
      )}
    >
      {({ close }) => (
        <Conteudo
          fase={fase}
          onSave={onSave}
          onClose={close}
          onConfigurar={() => {
            close();
            onConfigurar();
          }}
        />
      )}
    </Popover>
  );
}

function Conteudo({
  fase,
  onSave,
  onClose,
  onConfigurar,
}: {
  fase: Fase;
  onSave: (patch: { nome?: string; cor?: string }) => void;
  onClose: () => void;
  onConfigurar: () => void;
}) {
  const [nome, setNome] = useState(fase.nome);

  function submitNome() {
    if (nome.trim() && nome.trim() !== fase.nome) {
      onSave({ nome: nome.trim() });
    } else {
      setNome(fase.nome);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">Nome da fase</span>
        <Input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={submitNome}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNome();
            if (e.key === "Escape") {
              setNome(fase.nome);
              onClose();
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">Cor</span>
        <div className="grid grid-cols-6 gap-1.5">
          {CORES_FASE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSave({ cor: c })}
              className={cn(
                "h-6 w-6 rounded-full",
                fase.cor === c && "ring-2 ring-slate-900 ring-offset-1"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onConfigurar}>
        <Settings size={14} />
        Configurar fase
      </Button>
    </div>
  );
}
