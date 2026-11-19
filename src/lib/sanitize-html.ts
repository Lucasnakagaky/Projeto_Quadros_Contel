/**
 * Sanitização mínima para o HTML produzido pelo editor de texto formatado
 * (campo "texto_formatado"). Mantém apenas as tags de formatação básica
 * (negrito, itálico, listas, parágrafos/quebras, imagem) e permite, por tag,
 * só os atributos estritamente necessários — evita persistir/renderizar
 * markup capaz de executar script (ex.: um <script>, um atributo onClick ou
 * um href/src com "javascript:"). No conteúdo persistido/renderizado, um
 * img[src] só sobrevive se apontar para um upload local do próprio app
 * ("/uploads/") — data:/blob:/http(s) só são aceitos temporariamente, durante
 * a janela de edição de um paste, via permitirImagemTemporaria.
 */
const TAGS_PERMITIDAS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "UL",
  "OL",
  "LI",
  "BR",
  "P",
  "DIV",
  "SPAN",
  "IMG",
]);

// Tags cujo conteúdo textual bruto (CSS, JS, título de documento) nunca deve virar texto
// visível — ao contrário das tags fora de TAGS_PERMITIDAS acima, estas são removidas por
// inteiro (com todo o subtree), não "desembrulhadas". Necessário porque um paste de
// Word/Office normalmente vem como documento completo (<html><head><style>...) — sem essa
// denylist, desembrulhar <style>/<script> vazaria o CSS/JS cru como texto no editor.
const TAGS_REMOVER_POR_INTEIRO = new Set(["STYLE", "SCRIPT", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE"]);

// Blocos que, ao serem descartados, NÃO podem simplesmente sumir (desembrulhar juntaria o texto de
// dois parágrafos numa linha só): viram <div> sem atributos, preservando a quebra de linha. É o que
// acontece ao colar do ClickUp/Bitrix/Notion/Google Docs: títulos, citações, seções, tabelas, etc.
const TAGS_BLOCO_VIRAM_DIV = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE", "HEADER", "FOOTER",
  "ASIDE", "MAIN", "NAV", "FIGURE", "FIGCAPTION", "DL", "DT", "DD", "ADDRESS", "CAPTION", "DETAILS",
  "SUMMARY", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "HR",
]);
const TAGS_TITULO = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
// Células de tabela: viram o texto seguido de um espaço (não de uma quebra), p/ não colar "A" "B" em "AB".
const TAGS_CELULA = new Set(["TD", "TH"]);

// Atributos onde sites com "lazy load" guardam a URL real quando o src é só um placeholder.
const ATRIBUTOS_SRC_ALTERNATIVOS = ["data-src", "data-original", "data-lazy-src", "data-actualsrc"];

const ATRIBUTOS_PERMITIDOS: Record<string, Set<string>> = {
  IMG: new Set(["src", "alt"]),
};

export interface SanitizeHtmlOpts {
  /** Aceita "data:"/"blob:"/"http(s):" em img[src] além de "/uploads/" — usado só no momento
   * do paste, antes do upload assíncrono trocar o src pela URL real do arquivo. Uma imagem
   * embutida em HTML colado (Word, página web, SharePoint, e-mail) nem sempre vem como
   * data:/blob: — muitas fontes preservam uma URL remota http(s) apontando pro host original.
   * Aceitar isso só nesta janela temporária permite que enviarImagensColadasEmbutidas() baixe e
   * reenvie a imagem como anexo real logo em seguida; o sanitizeHtml do Salvar (sem esta opção)
   * volta a bloquear http(s), então uma URL remota nunca sobrevive ao conteúdo persistido nem é
   * renderizada fora dessa janela fugaz. */
  permitirImagemTemporaria?: boolean;
}

// Host público do Supabase Storage (onde os anexos moram desde a migração). O prefixo
// vem do NEXT_PUBLIC_SUPABASE_URL para não cravar o id do projeto no código.
const PREFIXO_STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/`
  : null;

// O "src" da imagem só é aceito se apontar para um upload do próprio app (Storage do
// Supabase, ou o antigo "/uploads/" para HTML legado), ou (com permitirImagemTemporaria)
// para uma imagem temporária ainda não enviada — bloqueia sempre "javascript:", que é a
// garantia anti-XSS que este arquivo protege.
function srcValido(valor: string, opts?: SanitizeHtmlOpts): boolean {
  if (valor.startsWith("/uploads/")) return true;
  if (PREFIXO_STORAGE && valor.startsWith(PREFIXO_STORAGE)) return true;
  if (opts?.permitirImagemTemporaria) {
    if (valor.startsWith("data:") || valor.startsWith("blob:")) return true;
    if (valor.startsWith("http://") || valor.startsWith("https://")) return true;
  }
  return false;
}

// Só no paste (permitirImagemTemporaria): acha a URL real da imagem quando o src está ausente, é
// só um placeholder (data:image minúsculo / URL inválida) ou é protocol-relative ("//host/x.png").
// Cobre imagens "lazy" (data-src / srcset) que alguns editores/sites geram.
function normalizarSrcImagemColada(img: HTMLElement): void {
  const atual = img.getAttribute("src") ?? "";
  if (atual.startsWith("//")) {
    img.setAttribute("src", "https:" + atual);
    return;
  }
  const atualEhRemoto = atual.startsWith("http:") || atual.startsWith("https:") || atual.startsWith("blob:") || atual.startsWith("/uploads/");
  const atualEhPlaceholder = atual.startsWith("data:") && atual.length < 400;
  if (atual && atualEhRemoto) return;
  if (atual && !atualEhPlaceholder && atual.startsWith("data:")) return; // data: de verdade
  const candidatos: string[] = [];
  for (const nome of ATRIBUTOS_SRC_ALTERNATIVOS) {
    const v = img.getAttribute(nome);
    if (v) candidatos.push(v);
  }
  const srcset = img.getAttribute("srcset");
  if (srcset) {
    const primeira = srcset.split(",")[0]?.trim().split(/\s+/)[0];
    if (primeira) candidatos.push(primeira);
  }
  for (const c of candidatos) {
    const url = c.startsWith("//") ? "https:" + c : c;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.setAttribute("src", url);
      return;
    }
  }
}

function sanitizarNo(no: Node, opts?: SanitizeHtmlOpts): void {
  const filhos = Array.from(no.childNodes);
  for (const filho of filhos) {
    if (filho.nodeType === Node.ELEMENT_NODE) {
      const el = filho as HTMLElement;
      if (TAGS_REMOVER_POR_INTEIRO.has(el.tagName)) {
        no.removeChild(el);
        continue;
      }
      if (el.tagName === "IMG" && opts?.permitirImagemTemporaria) normalizarSrcImagemColada(el);
      // Sanitiza recursivamente ANTES de decidir descartar a tag: se ela for
      // removida (unwrap), os filhos promovidos para o nível acima já saem limpos.
      sanitizarNo(el, opts);
      if (!TAGS_PERMITIDAS.has(el.tagName)) {
        const pai = el.parentNode;
        if (!pai) continue;
        if (TAGS_BLOCO_VIRAM_DIV.has(el.tagName)) {
          // Bloco descartado: vira <div> limpo (mantém a quebra de linha; títulos ficam em negrito).
          const bloco = document.createElement("div");
          const alvo = TAGS_TITULO.has(el.tagName) ? bloco.appendChild(document.createElement("strong")) : bloco;
          while (el.firstChild) alvo.appendChild(el.firstChild);
          pai.replaceChild(bloco, el);
          continue;
        }
        if (TAGS_CELULA.has(el.tagName)) {
          // Célula: conteúdo + um espaço, sem quebra de linha.
          while (el.firstChild) pai.insertBefore(el.firstChild, el);
          pai.replaceChild(document.createTextNode(" "), el);
          continue;
        }
        // Tag não permitida: descarta a tag mas preserva o conteúdo (já sanitizado).
        while (el.firstChild) pai.insertBefore(el.firstChild, el);
        pai.removeChild(el);
        continue;
      }
      // Remove atributos fora da allowlist da própria tag (a maioria das tags não tem
      // nenhum atributo permitido, então perde todos — inclui href, style e handlers on*).
      const permitidos = ATRIBUTOS_PERMITIDOS[el.tagName];
      Array.from(el.attributes).forEach((attr) => {
        if (!permitidos?.has(attr.name) || (attr.name === "src" && !srcValido(attr.value, opts))) {
          el.removeAttribute(attr.name);
        }
      });
      // Imagem sem "src" válido não tem por que existir.
      if (el.tagName === "IMG" && !el.getAttribute("src")) {
        el.parentNode?.removeChild(el);
      }
    } else if (filho.nodeType !== Node.TEXT_NODE) {
      // Remove comentários e outros tipos de nó que não sejam texto.
      no.removeChild(filho);
    }
  }
}

export function sanitizeHtml(html: string, opts?: SanitizeHtmlOpts): string {
  // Sem DOM disponível (ex.: uma renderização no servidor): não há como usar o
  // parser do navegador, então cai para o modo seguro de descartar todas as
  // tags em vez de arriscar devolver o HTML bruto sem sanitizar.
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizarNo(template.content, opts);
  return template.innerHTML;
}

/** Um HTML "vazio" pode ter só `<br>`/markup residual sem texto — inclui imagens sem legenda, que hoje contam como vazio (mesmo comportamento que já valia para a Descrição da Demanda). */
export function htmlEstaVazio(html: unknown): boolean {
  if (typeof html !== "string") return true;
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}
