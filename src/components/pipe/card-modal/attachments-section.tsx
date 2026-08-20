"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip, Plus, Trash2, UploadCloud } from "lucide-react";
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

  async function upload(files: FileList | File[]) {
    const lista = Array.from(files);
    if (lista.length === 0) return;

    setEnviando(true);
    let atuais = anexos;
    let sucesso = 0;
    let falhas = 0;
    for (const file of lista) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const anexo = await api.post<Anexo>(`/api/cards/${cardId}/attachments`, formData);
        atuais = [...atuais, anexo];
        onChanged(atuais);
        sucesso++;
      } catch (err) {
        falhas++;
        toast.error(err instanceof Error ? err.message : `Erro ao enviar "${file.name}"`);
      }
    }
    setEnviando(false);

    if (sucesso > 1) {
      toast.success(`${sucesso} anexos adicionados`);
    } else if (sucesso === 1 && falhas === 0) {
      toast.success("Anexo adicionado");
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

  const temAnexos = anexos.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-500">Anexos</span>

      {/* Input escondido único, compartilhado pela dropzone (sem anexos) e pelo link
          "+ Adicionar anexo" (com anexos) — mesma lógica de upload de antes. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />

      {temAnexos ? (
        <>
          <ul className="flex flex-col gap-1">
            {anexos.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                {a.tipo.startsWith("image/") ? (
                  <img
                    src={a.url}
                    alt={a.nome}
                    width={36}
                    height={36}
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded object-cover"
                  />
                ) : (
                  <Paperclip size={14} className="shrink-0 text-slate-400" />
                )}
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

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="flex w-fit items-center gap-1 self-start text-xs text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={12} />
            {enviando ? "Enviando..." : "Adicionar anexo"}
          </button>
        </>
      ) : (
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
            if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-400",
            dragOver && "border-blue-400 bg-blue-50"
          )}
        >
          <UploadCloud size={16} className="shrink-0" />
          <span>{enviando ? "Enviando..." : "Anexe ou arraste um arquivo"}</span>
        </div>
      )}
    </div>
  );
}
