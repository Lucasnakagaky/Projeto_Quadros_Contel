"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Anexo, Comentario } from "@/lib/types";
import { htmlEstaVazio } from "@/lib/sanitize-html";
import { HtmlFormatadoView } from "./html-formatado-view";
import { RichTextEditor } from "./rich-text-editor";
import { FOCO, TITULO_SECAO } from "./estilos";

export function CommentsSection({
  cardId,
  comentarios,
  onChanged,
  onAnexoCriado,
}: {
  cardId: string;
  comentarios: Comentario[];
  onChanged: (comentarios: Comentario[]) => void;
  /** Repassado ao RichTextEditor da caixa de novo comentário — notifica o pai de um anexo criado
   * a partir de uma imagem colada/enviada no comentário, pra atualizar a aba "Anexos" ao vivo. */
  onAnexoCriado?: (anexo: Anexo) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  // Incrementado a cada envio bem-sucedido pra remontar o editor com uma caixa vazia — o
  // RichTextEditor só copia valorInicial pro DOM uma vez, no mount, então trocar a key é o jeito
  // de "resetar" um contentEditable não controlado sem adicionar um método imperativo a ele.
  const [comporKey, setComporKey] = useState(0);

  async function enviar(html: string) {
    if (htmlEstaVazio(html)) return;
    setEnviando(true);
    try {
      const comentario = await api.post<Comentario>(`/api/cards/${cardId}/comments`, {
        texto: html,
      });
      onChanged([...comentarios, comentario]);
      setComporKey((k) => k + 1);
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
      <span className={TITULO_SECAO}>Comentários</span>

      <RichTextEditor
        key={comporKey}
        cardId={cardId}
        valorInicial=""
        ariaLabel="Novo comentário"
        labelSalvar="Enviar"
        mostrarCancelar={false}
        desabilitado={enviando}
        onSalvar={enviar}
        onCancelar={() => {}}
        onAnexoCriado={onAnexoCriado}
      />

      {comentarios.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum comentário ainda</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comentarios.map((c) => (
            <li
              key={c.id}
              className="group flex items-start justify-between gap-2 rounded-2xl rounded-tl-md border border-slate-200/80 bg-linear-to-b from-white to-slate-50 px-3.5 py-2.5 shadow-(--gdt-sombra-1) transition-shadow duration-(--duracao-rapida) hover:shadow-(--gdt-sombra-2)"
            >
              <div className="min-w-0 flex-1">
                <HtmlFormatadoView html={c.texto} className="text-sm text-slate-700" />
                <span className="mt-1 block text-xs text-slate-400">
                  {new Date(c.criadoEm).toLocaleString("pt-BR")}
                </span>
              </div>
              <button
                onClick={() => remover(c.id)}
                className={`rounded p-0.5 text-slate-300 opacity-0 transition-[opacity,color] duration-(--duracao-rapida) hover:text-red-600 focus-visible:text-red-600 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 ${FOCO}`}
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
