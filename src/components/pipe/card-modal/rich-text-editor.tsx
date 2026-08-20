"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bold, Image as ImageIcon, Italic, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Anexo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageLightbox, ImagemAmpliada } from "./image-lightbox";

const BOTOES_FORMATACAO = [
  { comando: "bold", label: "Negrito", Icone: Bold },
  { comando: "italic", label: "Itálico", Icone: Italic },
  { comando: "insertUnorderedList", label: "Lista com marcadores", Icone: List },
  { comando: "insertOrderedList", label: "Lista numerada", Icone: ListOrdered },
] as const;

// Escapa texto puro (fallback quando o clipboard só tem text/plain) preservando quebras de
// linha como <br>, pra depois passar pelo mesmo sanitizeHtml usado no caminho de text/html —
// um único ponto de sanitização como boundary de segurança, em vez de dois caminhos distintos.
function textoParaHtmlEscapado(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").split("\n").join("<br>");
}

function elementoContendoNo(no: Node): Element | null {
  return no instanceof Element ? no : no.parentElement;
}

// range.extractContents() entre um nó de texto e seu container pai, no ponto exato do fim do
// texto, devolve um fragmento com um nó de texto vazio (não "nenhum nó") — hasChildNodes()
// sozinho daria falso positivo e criaria um <li></li> fantasma sempre que o cursor estivesse no
// fim do <li> (o caso mais comum de todos).
function fragmentoTemConteudo(frag: DocumentFragment): boolean {
  if (frag.childNodes.length === 0) return false;
  if (frag.childNodes.length === 1 && frag.firstChild?.nodeType === Node.TEXT_NODE) {
    return (frag.firstChild as Text).data !== "";
  }
  return true;
}

// Insere HTML já sanitizado na posição do cursor via Range/Selection (não execCommand —
// depreciado e um no-op em jsdom, o que inviabilizaria testar isso).
function inserirHtmlNoCursor(html: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const frag = range.createContextualFragment(html);

  const liDestino = elementoContendoNo(range.startContainer)?.closest("li");
  const somenteItensDeLista =
    frag.childNodes.length > 0 &&
    Array.from(frag.childNodes).every((no) => no.nodeType === Node.ELEMENT_NODE && (no as Element).tagName === "LI");

  // Colar <li> soltos com o cursor dentro de um <li> já existente: Range.insertNode() sozinho
  // encaixaria os itens colados como FILHOS do <li> atual (a API não sabe que <li> não pode
  // conter <li>), quebrando a estrutura da lista. Em vez disso, divide o <li> de destino no
  // ponto do cursor e insere os itens colados como IRMÃOS dele dentro da mesma <ul>/<ol> — o
  // que sobrar depois do cursor no <li> original vira um novo <li> final ("split" do item).
  if (liDestino?.parentElement && somenteItensDeLista) {
    const listaPai = liDestino.parentElement;
    const proximoIrmao = liDestino.nextSibling;

    const restoRange = document.createRange();
    restoRange.setStart(range.startContainer, range.startOffset);
    restoRange.setEnd(liDestino, liDestino.childNodes.length);
    const resto = restoRange.extractContents();

    const ultimoItemColado = frag.lastChild;
    listaPai.insertBefore(frag, proximoIrmao);
    if (fragmentoTemConteudo(resto)) {
      const novoLi = document.createElement("li");
      novoLi.appendChild(resto);
      listaPai.insertBefore(novoLi, proximoIrmao);
    }
    if (ultimoItemColado) {
      const novoRange = document.createRange();
      novoRange.setStartAfter(ultimoItemColado);
      novoRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(novoRange);
    }
    return;
  }

  const lastNode = frag.lastChild;
  range.insertNode(frag);
  if (!lastNode) return;
  const novoRange = document.createRange();
  novoRange.setStartAfter(lastNode);
  novoRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(novoRange);
}

/**
 * Editor de texto com formatação básica (negrito, itálico, listas, imagem), sem
 * depender de uma biblioteca externa. Usa contentEditable + execCommand: é uma
 * API depreciada, mas ainda suportada em todos os navegadores atuais e
 * suficiente para o conjunto mínimo de formatação exigido aqui. Se o campo
 * evoluir para precisar de mais recursos (links, undo consistente, etc.),
 * vale migrar para uma lib dedicada (ex.: Tiptap).
 */
export function RichTextEditor({
  cardId,
  valorInicial,
  onSalvar,
  onCancelar,
}: {
  cardId: string;
  valorInicial: string;
  onSalvar: (html: string) => void;
  onCancelar: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState<ImagemAmpliada>(null);

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

  // Envia a imagem pelo mesmo endpoint de upload de anexos (arquivo real em disco, sem
  // base64 no HTML) e insere no ponto do cursor — usada tanto pelo botão da toolbar quanto
  // pelo paste de imagem do clipboard.
  async function inserirImagem(file: File) {
    editorRef.current?.focus();
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const anexo = await api.post<Anexo>(`/api/cards/${cardId}/attachments`, formData);
      document.execCommand("insertImage", false, anexo.url);
      editorRef.current?.querySelector(`img[src="${anexo.url}"]`)?.setAttribute("alt", file.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setEnviando(false);
    }
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const imagens = Array.from(e.clipboardData.items).filter((item) => item.type.startsWith("image/"));
    if (imagens.length > 0) {
      e.preventDefault();
      for (const item of imagens) {
        const file = item.getAsFile();
        if (file) await inserirImagem(file);
      }
      return;
    }

    // Sem item de imagem solto no clipboard: em vez de deixar o paste nativo do navegador
    // inserir o HTML "sujo" direto no DOM, sanitiza com a mesma whitelist do Salvar/exibição
    // ANTES de inserir — senão spans com estilo/cor/fonte (ou um documento inteiro colado do
    // Word) aparecem formatados durante a edição e só "somem" de surpresa depois do Salvar.
    e.preventDefault();
    const rawHtml = e.clipboardData.getData("text/html");
    const htmlParaInserir = rawHtml || textoParaHtmlEscapado(e.clipboardData.getData("text/plain"));
    if (htmlParaInserir) {
      // permitirImagemTemporaria: imagem embutida no HTML colado (data:/blob:) ainda não foi
      // enviada — precisa sobreviver a esta sanitização pra enviarImagensColadasEmbutidas achar
      // e trocar pelo upload real logo abaixo; o sanitizeHtml do Salvar (sem essa opção) volta a
      // bloquear data:/blob:, então uma imagem que falhar no upload não escapa pra produção.
      inserirHtmlNoCursor(sanitizeHtml(htmlParaInserir, { permitirImagemTemporaria: true }));
    }

    void enviarImagensColadasEmbutidas();
  }

  async function enviarImagensColadasEmbutidas() {
    const imgs = Array.from(editorRef.current?.querySelectorAll("img") ?? []).filter((img) => {
      const src = img.getAttribute("src") ?? "";
      return src.startsWith("data:") || src.startsWith("blob:");
    });
    if (imgs.length === 0) return;
    setEnviando(true);
    try {
      for (const img of imgs) {
        const src = img.getAttribute("src") ?? "";
        try {
          const blob = await (await fetch(src)).blob();
          const ext = blob.type.split("/")[1] ?? "png";
          const formData = new FormData();
          formData.append("file", new File([blob], `colada.${ext}`, { type: blob.type || "image/png" }));
          const anexo = await api.post<Anexo>(`/api/cards/${cardId}/attachments`, formData);
          img.setAttribute("src", anexo.url);
        } catch (err) {
          // Upload falhou: remove em vez de deixar um src que o sanitizeHtml vai apagar
          // silenciosamente no Salvar (sem essa remoção, o alt/texto ao redor da imagem ficaria
          // com um "buraco" sem explicação).
          img.remove();
          toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem colada");
        }
      }
    } finally {
      setEnviando(false);
    }
  }

  function salvar() {
    onSalvar(sanitizeHtml(editorRef.current?.innerHTML ?? ""));
  }

  // Em contentEditable, o cursor é posicionado no mousedown, não no click — um preventDefault só
  // no onClick já seria tarde demais (o cursor já teria pulado pra cima da imagem). Mesmo padrão
  // que os botões da toolbar já usam aqui pra não roubar o foco/seleção do editor.
  function aoPressionarBotaoMouseNoEditor(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "IMG") {
      e.preventDefault();
    }
  }

  function aoClicarNoEditor(e: React.MouseEvent<HTMLDivElement>) {
    const alvo = e.target as HTMLElement;
    if (alvo.tagName !== "IMG") return;
    e.preventDefault();
    e.stopPropagation();
    const img = alvo as HTMLImageElement;
    setImagemAmpliada({ src: img.src, alt: img.alt });
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
        <button
          type="button"
          aria-label="Inserir imagem"
          title="Inserir imagem"
          disabled={enviando}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageIcon size={14} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) inserirImagem(file);
            e.target.value = "";
          }}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Editor de atividades"
        onPaste={handlePaste}
        onMouseDown={aoPressionarBotaoMouseNoEditor}
        onClick={aoClicarNoEditor}
        className={cn(
          "min-h-[160px] rounded-b-md border border-slate-200 p-2 text-sm text-slate-700",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_img]:max-w-full [&_img]:rounded [&_img]:cursor-zoom-in"
        )}
      />
      <ImageLightbox imagem={imagemAmpliada} onOpenChange={(open) => !open && setImagemAmpliada(null)} />

      <div className="flex gap-2">
        <Button size="sm" onClick={salvar} disabled={enviando}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
