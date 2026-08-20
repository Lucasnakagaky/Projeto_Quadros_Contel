/**
 * Sanitização mínima para o HTML produzido pelo editor de texto formatado
 * (campo "texto_formatado"). Mantém apenas as tags de formatação básica
 * (negrito, itálico, listas, parágrafos/quebras, imagem) e permite, por tag,
 * só os atributos estritamente necessários — evita persistir/renderizar
 * markup capaz de executar script (ex.: um <script>, um atributo onClick ou
 * um href/src com "javascript:"/"data:").
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

const ATRIBUTOS_PERMITIDOS: Record<string, Set<string>> = {
  IMG: new Set(["src", "alt"]),
};

export interface SanitizeHtmlOpts {
  /** Aceita "data:"/"blob:" em img[src] além de "/uploads/" — usado só no momento do
   * paste, antes do upload assíncrono trocar o src pela URL real do arquivo. */
  permitirImagemTemporaria?: boolean;
}

// O "src" da imagem só é aceito se apontar para um upload local do próprio app (ou, com
// permitirImagemTemporaria, para um blob local temporário) — bloqueia "javascript:" e hosts
// externos, que é a garantia anti-XSS que este arquivo protege.
function srcValido(valor: string, opts?: SanitizeHtmlOpts): boolean {
  if (valor.startsWith("/uploads/")) return true;
  if (opts?.permitirImagemTemporaria && (valor.startsWith("data:") || valor.startsWith("blob:"))) return true;
  return false;
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
      // Sanitiza recursivamente ANTES de decidir descartar a tag: se ela for
      // removida (unwrap), os filhos promovidos para o nível acima já saem limpos.
      sanitizarNo(el, opts);
      if (!TAGS_PERMITIDAS.has(el.tagName)) {
        // Tag não permitida: descarta a tag mas preserva o conteúdo (já sanitizado).
        const pai = el.parentNode;
        if (!pai) continue;
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
