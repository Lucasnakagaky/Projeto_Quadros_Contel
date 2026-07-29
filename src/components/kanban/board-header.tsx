"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Share2, MoreHorizontal, ArrowLeft } from "lucide-react";
import { Board, Usuario } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";
import { BoardSettingsDialog } from "./board-settings-dialog";

export function BoardHeader({
  board,
  currentUser,
  onBoardUpdated,
}: {
  board: Board;
  currentUser: Usuario;
  onBoardUpdated: (board: Board) => void;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function renomear() {
    const novoNome = prompt("Novo nome do quadro:", board.nome);
    if (!novoNome || !novoNome.trim() || novoNome.trim() === board.nome) return;
    try {
      const atualizado = await api.patch<Board>(`/api/boards/${board.id}`, {
        nome: novoNome.trim(),
      });
      onBoardUpdated(atualizado);
      toast.success("Quadro renomeado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renomear quadro");
    }
  }

  async function arquivar() {
    if (!confirm(`Arquivar o quadro "${board.nome}"?`)) return;
    try {
      await api.patch(`/api/boards/${board.id}`, { arquivado: true });
      toast.success("Quadro arquivado");
      router.push("/boards");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar quadro");
    }
  }

  async function excluir() {
    if (
      !confirm(
        `Excluir permanentemente o quadro "${board.nome}"? Essa ação não pode ser desfeita.`
      )
    )
      return;
    try {
      await api.delete(`/api/boards/${board.id}`);
      toast.success("Quadro excluído");
      router.push("/boards");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir quadro");
    }
  }

  return (
    <header
      className="flex shrink-0 items-center gap-3 px-6 py-3 shadow-sm"
      style={{ backgroundColor: board.cor }}
    >
      <Link
        href="/boards"
        className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
        aria-label="Voltar aos quadros"
      >
        <ArrowLeft size={18} />
      </Link>

      <h1 className="mr-auto truncate text-lg font-semibold text-white">
        {board.nome}
      </h1>

      <Avatar nome={currentUser.nome} cor={currentUser.corAvatar} size={30} />

      <Link href={`/boards/${board.id}/members`}>
        <Button variant="secondary" size="sm">
          <Share2 size={14} />
          Compartilhar
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Menu do quadro"
          >
            <MoreHorizontal size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={renomear}>Renomear</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/boards/${board.id}/members`}>Gerenciar Membros</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={arquivar}>Arquivar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 data-[highlighted]:bg-red-50"
            onSelect={excluir}
          >
            Excluir Quadro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BoardSettingsDialog
        board={board}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={onBoardUpdated}
      />
    </header>
  );
}
