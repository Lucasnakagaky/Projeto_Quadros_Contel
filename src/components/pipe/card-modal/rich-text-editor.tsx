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
  onAnexoCriado,
  ariaLabel = "Editor de atividades",
  labelSalvar = "Salvar",
  mostrarCancelar = true,
  desabilitado = false,
}: {
  cardId: string;
  valorInicial: string;
  onSalvar: (html: string) => void;
  onCancelar: () => void;
  /** Chamado a cada upload bem-sucedido (toolbar, paste de imagem crua ou imagem embutida no
   * HTML colado) — permite ao pai (card-detail-modal) refletir o novo anexo na aba "Anexos" ao
   * vivo, sem precisar fechar/reabrir o card. */
  onAnexoCriado?: (anexo: Anexo) => void;
  /** Nome acessível da área editável. Outros consumidores (ex.: comentários) precisam de um
   * nome próprio — a Descrição da Demanda fica sempre visível fora das abas do card, então os
   * dois editores podem estar montados ao mesmo tempo, e não podem compartilhar o mesmo nome. */
  ariaLabel?: string;
  /** Texto do botão de ação — "Salvar" edita um valor existente, "Enviar" cria algo novo (ex.: comentário). */
  labelSalvar?: string;
  /** Comentários não têm um "estado anterior" pra cancelar (a caixa de compor é sempre vazia). */
  mostrarCancelar?: boolean;
  /** Desabilita o botão de ação além do próprio estado de upload em andamento — usado enquanto o
   * pai está enviando o conteúdo (ex.: POST do comentário). */
  desabilitado?: boolean;
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
      onAnexoCriado?.(anexo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setEnviando(false);
    }
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();

    // Lê TUDO do clipboardData de forma síncrona, antes de qualquer await — o DataTransfer do
    // evento de paste não sobrevive de forma confiável a um retorno ao event loop (alguns
    // navegadores esvaziam o objeto assim que a função async atinge o primeiro await), então os
    // itens de imagem e o texto/HTML precisam ser extraídos aqui em cima, antes de qualquer
    // upload assíncrono.
    const imagens = Array.from(e.clipboardData.items).filter((item) => item.type.startsWith("image/"));
    const arquivosDeImagem = imagens.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
    const rawHtml = e.clipboardData.getData("text/html");
    const rawTexto = e.clipboardData.getData("text/plain");

    // Item(ns) de imagem solta no clipboard (ex.: screenshot copiado, ou "copiar imagem" de um
    // app): envia cada um pelo mesmo caminho do botão da toolbar.
    for (const file of arquivosDeImagem) {
      await inserirImagem(file);
    }

    // Texto/HTML que veio junto no mesmo paste (ex.: "texto + imagem + texto" copiado de um
    // e-mail, página web ou documento) — antes um item de imagem solta fazia a função retornar
    // cedo e descartava esse texto inteiro; agora ele é sempre inserido. Em vez de deixar o
    // paste nativo do navegador inserir o HTML "sujo" direto no DOM, sanitiza com a mesma
    // whitelist do Salvar/exibição ANTES de inserir — senão spans com estilo/cor/fonte (ou um
    // documento inteiro colado do Word) aparecem formatados durante a edição e só "somem" de
    // surpresa depois do Salvar.
    const htmlParaInserir = rawHtml || textoParaHtmlEscapado(rawTexto);
    if (htmlParaInserir) {
      // permitirImagemTemporaria: imagem embutida no HTML colado (data:/blob:/http(s)) ainda não
      // foi enviada — precisa sobreviver a esta sanitização pra enviarImagensColadasEmbutidas
      // achar e trocar pelo upload real logo abaixo; o sanitizeHtml do Salvar (sem essa opção)
      // volta a bloquear, então uma imagem que falhar no upload não escapa pra produção. Se já
      // havia imagem(ns) solta(s) acima, NÃO permite imagem temporária aqui: alguns navegadores
      // trazem tanto um item image/* cru quanto um <img> referenciando a mesma imagem dentro do
      // HTML pra uma única operação de copiar — sem essa guarda, a mesma imagem seria enviada
      // duas vezes (uma por inserirImagem, outra por enviarImagensColadasEmbutidas).
      const opts = arquivosDeImagem.length > 0 ? undefined : { permitirImagemTemporaria: true };
      inserirHtmlNoCursor(sanitizeHtml(htmlParaInserir, opts));
    }

    void enviarImagensColadasEmbutidas();
  }

  // URL pública do Supabase Storage — onde os anexos moram. Um src assim JÁ é o arquivo final.
  const PREFIXO_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/`;

  function precisaReupload(src: string): boolean {
    if (src.startsWith(PREFIXO_STORAGE)) return false; // já é anexo nosso
    return (
      src.startsWith("data:") ||
      src.startsWith("blob:") ||
      src.startsWith("http://") ||
      src.startsWith("https://")
    );
  }

  // Se o src colado já aponta pro próprio Storage (ex.: colou um trecho de OUTRA descrição
  // que já tinha essa imagem) ou pro antigo "/uploads/" relativo, não é imagem nova — mantém
  // como está, sem reenviar (evita duplicar o anexo).
  function resolverUploadProprio(src: string): string | null {
    if (src.startsWith(PREFIXO_STORAGE)) return src;
    try {
      const url = new URL(src, window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith("/uploads/")) {
        return url.pathname;
      }
    } catch {
      // src não é uma URL válida — ignora, segue o fluxo normal
    }
    return null;
  }

  // data:/blob: só existem no próprio navegador (o servidor não tem como buscá-las) — seguem
  // sendo baixadas aqui no cliente e reenviadas como arquivo, como já era. Uma URL http(s) por
  // outro lado é buscada pelo SERVIDOR (ver enviarImagemRemota): a maioria dos hosts reais
  // (SharePoint, páginas web, e-mail) não manda cabeçalho CORS permissivo pra imagens, então um
  // fetch(src) daqui do navegador falharia silenciosamente pra praticamente todo mundo.
  async function enviarImagemEmbutidaLocal(img: HTMLImageElement) {
    const src = img.getAttribute("src") ?? "";
    const blob = await (await fetch(src)).blob();
    const ext = blob.type.split("/")[1] ?? "png";
    const formData = new FormData();
    formData.append("file", new File([blob], `colada.${ext}`, { type: blob.type || "image/png" }));
    return api.post<Anexo>(`/api/cards/${cardId}/attachments`, formData);
  }

  async function enviarImagemRemota(img: HTMLImageElement) {
    const src = img.getAttribute("src") ?? "";
    return api.post<Anexo>(`/api/cards/${cardId}/attachments`, { url: src });
  }

  async function enviarImagensColadasEmbutidas() {
    const candidatas: HTMLImageElement[] = [];
    for (const img of Array.from(editorRef.current?.querySelectorAll("img") ?? [])) {
      const src = img.getAttribute("src") ?? "";
      const uploadProprio = resolverUploadProprio(src);
      if (uploadProprio) {
        img.setAttribute("src", uploadProprio);
        continue;
      }
      if (precisaReupload(src)) candidatas.push(img);
    }
    if (candidatas.length === 0) return;
    setEnviando(true);
    try {
      for (const img of candidatas) {
        const src = img.getAttribute("src") ?? "";
        try {
          const remota = src.startsWith("http://") || src.startsWith("https://");
          const anexo = remota ? await enviarImagemRemota(img) : await enviarImagemEmbutidaLocal(img);
          img.setAttribute("src", anexo.url);
          onAnexoCriado?.(anexo);
        } catch (err) {
          // Upload falhou (rede, host não permitido, imagem exige autenticação etc.): remove em
          // vez de deixar um src que o sanitizeHtml vai apagar silenciosamente no Salvar (sem
          // essa remoção, o texto ao redor da imagem ficaria com um "buraco" sem explicação).
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
        aria-label={ariaLabel}
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
        <Button size="sm" onClick={salvar} disabled={enviando || desabilitado}>
          {labelSalvar}
        </Button>
        {mostrarCancelar && (
          <Button size="sm" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
