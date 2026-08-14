"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

const BOTOES_FORMATACAO = [
  { comando: "bold", label: "Negrito", Icone: Bold },
  { comando: "italic", label: "Itálico", Icone: Italic },
  { comando: "insertUnorderedList", label: "Lista com marcadores", Icone: List },
  { comando: "insertOrderedList", label: "Lista numerada", Icone: ListOrdered },
] as const;

/**
 * Editor de texto com formatação básica (negrito, itálico, listas), sem
 * depender de uma biblioteca externa. Usa contentEditable + execCommand:
 * é uma API depreciada, mas ainda suportada em todos os navegadores atuais
 * e suficiente para o conjunto mínimo de formatação exigido aqui. Se o
 * campo evoluir para precisar de mais recursos (links, imagens, undo
 * consistente, etc.), vale migrar para uma lib dedicada (ex.: Tiptap).
 */
export function RichTextEditor({
  valorInicial,
  onSalvar,
  onCancelar,
}: {
  valorInicial: string;
  onSalvar: (html: string) => void;
  onCancelar: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = valorInicial;
    }
    editorRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só preenche o valor inicial ao montar
  }, []);

  function formatar(comando: string) {
    editorRef.current?.focus();
    document.execCommand(comando);
  }

  function salvar() {
    onSalvar(sanitizeHtml(editorRef.current?.innerHTML ?? ""));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="toolbar"
        aria-label="Formatação de texto"
        className="flex items-center gap-0.5 rounded-t-md border border-b-0 border-slate-200 bg-slate-50 p-1"
      >
        {BOTOES_FORMATACAO.map(({ comando, label, Icone }) => (
          <button
            key={comando}
            type="button"
            aria-label={label}
            title={label}
            // evita que o botão roube o foco do editor (perderia a seleção de texto)
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => formatar(comando)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Icone size={14} />
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Editor de atividades"
        className={cn(
          "min-h-[96px] rounded-b-md border border-slate-200 p-2 text-sm text-slate-700",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        )}
      />

      <div className="flex gap-2">
        <Button size="sm" onClick={salvar}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
