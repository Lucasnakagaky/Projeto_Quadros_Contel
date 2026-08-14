/**
 * Sanitização mínima para o HTML produzido pelo editor de texto formatado
 * (campo "texto_formatado"). Mantém apenas as tags de formatação básica
 * (negrito, itálico, listas, parágrafos/quebras) e remove qualquer atributo
 * — evita persistir/renderizar markup capaz de executar script (ex.: um
 * <script>, um atributo onClick ou um href com "javascript:").
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
]);

function sanitizarNo(no: Node): void {
  const filhos = Array.from(no.childNodes);
  for (const filho of filhos) {
    if (filho.nodeType === Node.ELEMENT_NODE) {
      const el = filho as HTMLElement;
      // Sanitiza recursivamente ANTES de decidir descartar a tag: se ela for
      // removida (unwrap), os filhos promovidos para o nível acima já saem limpos.
      sanitizarNo(el);
      if (!TAGS_PERMITIDAS.has(el.tagName)) {
        // Tag não permitida: descarta a tag mas preserva o conteúdo (já sanitizado).
        const pai = el.parentNode;
        if (!pai) continue;
        while (el.firstChild) pai.insertBefore(el.firstChild, el);
        pai.removeChild(el);
        continue;
      }
      // Remove todos os atributos (inclui href, src, style e handlers on*).
      Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
    } else if (filho.nodeType !== Node.TEXT_NODE) {
      // Remove comentários e outros tipos de nó que não sejam texto.
      no.removeChild(filho);
    }
  }
}

export function sanitizeHtml(html: string): string {
  // Sem DOM disponível (ex.: uma renderização no servidor): não há como usar o
  // parser do navegador, então cai para o modo seguro de descartar todas as
  // tags em vez de arriscar devolver o HTML bruto sem sanitizar.
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizarNo(template.content);
  return template.innerHTML;
}
