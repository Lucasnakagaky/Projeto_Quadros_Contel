"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { Pipe } from "@/lib/types";

export default function NewPipePage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do pipe");
      return;
    }
    setLoading(true);
    try {
      const pipe = await api.post<Pipe>("/api/pipes", { nome });
      toast.success("Pipe criado com sucesso!");
      router.push(`/pipes/${pipe.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pipe");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Novo Pipe</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Suporte ao Cliente, Vendas, Onboarding..."
            autoFocus
            required
          />
        </div>

        <p className="text-sm text-slate-500">
          O pipe será criado com as fases padrão: Caixa de entrada, Fazendo e Concluído.
        </p>

        <div className="mt-4 flex justify-end gap-3">
          <Link href="/pipes">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar Pipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
