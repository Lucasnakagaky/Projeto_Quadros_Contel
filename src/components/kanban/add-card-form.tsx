"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { Template } from "@/lib/types";

export function AddCardForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (titulo: string, descricao?: string) => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");

  useEffect(() => {
    api.get<Template[]>("/api/templates").then(setTemplates).catch(() => {});
  }, []);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setTitulo((prev) => (prev ? prev : tpl.titulo));
  }

  function submit() {
    if (!titulo.trim()) return;
    const tpl = templates.find((t) => t.id === templateId);
    onSubmit(titulo.trim(), tpl?.descricao);
    setTitulo("");
    setTemplateId("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
      <Textarea
        autoFocus
        rows={2}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Digite o título do card..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onCancel();
        }}
      />

      <Select value={templateId || undefined} onValueChange={applyTemplate}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.id}>
              {tpl.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button size="sm" onClick={submit}>
          Adicionar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
