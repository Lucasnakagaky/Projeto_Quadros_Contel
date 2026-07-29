"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { Anexo } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({
  cardId,
  anexos,
  onChanged,
}: {
  cardId: string;
  anexos: Anexo[];
  onChanged: (anexos: Anexo[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function upload(file: File) {
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const anexo = await api.post<Anexo>(`/api/cards/${cardId}/attachments`, formData);
      onChanged([...anexos, anexo]);
      toast.success("Anexo adicionado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar anexo");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    try {
      await api.delete(`/api/attachments/${id}`);
      onChanged(anexos.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover anexo");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Anexos</Label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 py-4 text-sm text-slate-400 hover:border-slate-400",
          dragOver && "border-blue-400 bg-blue-50"
        )}
      >
        <UploadCloud size={20} />
        <span>{enviando ? "Enviando..." : "Anexe ou arraste um arquivo"}</span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {anexos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {anexos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            >
              <Paperclip size={14} className="shrink-0 text-slate-400" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-blue-600 hover:underline"
              >
                {a.nome}
              </a>
              <span className="text-xs text-slate-400">{formatBytes(a.tamanho)}</span>
              <button
                onClick={() => remover(a.id)}
                className="text-slate-400 hover:text-red-600"
                aria-label="Remover anexo"
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
