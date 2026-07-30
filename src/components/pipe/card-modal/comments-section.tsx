"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { Comentario } from "@/lib/types";

export function CommentsSection({
  cardId,
  comentarios,
  onChanged,
}: {
  cardId: string;
  comentarios: Comentario[];
  onChanged: (comentarios: Comentario[]) => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const comentario = await api.post<Comentario>(`/api/cards/${cardId}/comments`, {
        texto,
      });
      onChanged([...comentarios, comentario]);
      setTexto("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar comentário");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    try {
      await api.delete(`/api/comments/${id}`);
      onChanged(comentarios.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover comentário");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-500">Comentários</span>

      <div className="flex flex-col gap-2">
        <Textarea
          rows={2}
          placeholder="Escreva um comentário..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button size="sm" className="self-end" onClick={enviar} disabled={enviando}>
          Enviar
        </Button>
      </div>

      {comentarios.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum comentário ainda</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comentarios.map((c) => (
            <li
              key={c.id}
              className="group flex items-start justify-between gap-2 rounded-md bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm text-slate-700">{c.texto}</p>
                <span className="text-xs text-slate-400">
                  {new Date(c.criadoEm).toLocaleString("pt-BR")}
                </span>
              </div>
              <button
                onClick={() => remover(c.id)}
                className="text-slate-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                aria-label="Remover comentário"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
