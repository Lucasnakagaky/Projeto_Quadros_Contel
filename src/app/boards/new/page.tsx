"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { CORES_QUADRO, Board } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NewBoardPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState(CORES_QUADRO[0]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do quadro");
      return;
    }
    setLoading(true);
    try {
      const board = await api.post<Board>("/api/boards", { nome, descricao, cor });
      toast.success("Quadro criado com sucesso!");
      router.push(`/boards/${board.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar quadro");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Novo Quadro</h1>

      <div
        className="mb-6 flex h-24 items-center rounded-lg px-6 shadow-sm transition-colors"
        style={{ backgroundColor: cor }}
      >
        <span className="truncate text-xl font-semibold text-white">
          {nome.trim() || "Nome do quadro"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Projeto Website, Sprint 1, Tarefas Diárias..."
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o propósito deste quadro..."
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cor de Fundo</Label>
          <div className="flex flex-wrap gap-2">
            {CORES_QUADRO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                aria-label={`Selecionar cor ${c}`}
                className={cn(
                  "h-9 w-9 rounded-full ring-offset-2 transition-transform hover:scale-110",
                  cor === c && "ring-2 ring-slate-900"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Link href="/boards">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar Quadro"}
          </Button>
        </div>
      </form>
    </div>
  );
}
