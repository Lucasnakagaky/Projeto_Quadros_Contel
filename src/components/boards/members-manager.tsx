"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { Board, Usuario } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api-client";

export function MembersManager({
  board,
  membrosIniciais,
}: {
  board: Board;
  membrosIniciais: Usuario[];
}) {
  const [membros, setMembros] = useState(membrosIniciais);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe o e-mail do membro");
      return;
    }
    setLoading(true);
    try {
      const usuario = await api.post<Usuario>(`/api/boards/${board.id}/members`, {
        nome,
        email,
      });
      setMembros((prev) =>
        prev.some((m) => m.id === usuario.id) ? prev : [...prev, usuario]
      );
      setNome("");
      setEmail("");
      toast.success("Membro adicionado ao quadro");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar membro");
    } finally {
      setLoading(false);
    }
  }

  async function remover(userId: string) {
    if (userId === board.ownerId) {
      toast.error("Não é possível remover o dono do quadro");
      return;
    }
    try {
      await api.delete(`/api/boards/${board.id}/members?userId=${userId}`);
      setMembros((prev) => prev.filter((m) => m.id !== userId));
      toast.success("Membro removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover membro");
    }
  }

  return (
    <div>
      <Link
        href={`/boards/${board.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Voltar ao quadro
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-slate-900">Membros do Quadro</h1>
      <p className="mb-6 text-sm text-slate-500">{board.nome}</p>

      <form
        onSubmit={adicionar}
        className="mb-8 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="member-nome">Nome</Label>
          <Input
            id="member-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do membro"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="member-email">E-mail</Label>
          <Input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          <UserPlus size={16} />
          Convidar
        </Button>
      </form>

      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {membros.map((usuario) => (
          <li key={usuario.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar nome={usuario.nome} cor={usuario.corAvatar} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">
                {usuario.nome}
                {usuario.id === board.ownerId && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                    Dono
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">{usuario.email}</p>
            </div>
            {usuario.id !== board.ownerId && (
              <button
                onClick={() => remover(usuario.id)}
                className="text-slate-400 hover:text-red-600"
                aria-label="Remover membro"
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
