"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddColumnForm({ onAdd }: { onAdd: (nome: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState("");

  function submit() {
    if (!nome.trim()) return;
    onAdd(nome.trim());
    setNome("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex h-10 w-72 shrink-0 items-center gap-1.5 rounded-lg bg-slate-100/70 px-3 text-sm font-medium text-slate-500 hover:bg-slate-200 cursor-pointer"
      >
        <Plus size={16} />
        Adicionar Status
      </button>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-slate-100 p-2">
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do status..."
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit}>
          Adicionar
        </Button>
        <button
          onClick={() => {
            setEditing(false);
            setNome("");
          }}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-200"
          aria-label="Cancelar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
