import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("remove estilo/classe de spans e tags não suportadas, preservando o texto", () => {
    const sujo = '<span style="color:red" class="foo">texto</span> <b>negrito</b> <i>itálico</i>';
    const limpo = sanitizeHtml(sujo);
    expect(limpo).not.toContain("style=");
    expect(limpo).not.toContain("class=");
    expect(limpo).toContain("texto");
    expect(limpo).toContain("<b>negrito</b>");
    expect(limpo).toContain("<i>itálico</i>");
  });

  it("mantém ul/ol/li intactos", () => {
    const html = "<ul><li>um</li><li>dois</li></ul>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("remove <font> preservando o texto (tag fora da whitelist é desembrulhada)", () => {
    const limpo = sanitizeHtml('<font color="red" face="Arial">texto colorido</font>');
    expect(limpo).not.toContain("<font");
    expect(limpo).toContain("texto colorido");
  });

  it("não vaza o CSS de um <style> num documento completo colado do Word", () => {
    const documentoWord =
      "<html><head><meta charset='utf-8'>" +
      "<style>p.MsoNormal{margin:0;color:red;} span{font-family:Calibri;}</style>" +
      "</head><body><p class='MsoNormal'><span>Texto do Word</span></p></body></html>";
    const limpo = sanitizeHtml(documentoWord);
    expect(limpo).not.toContain("MsoNormal");
    expect(limpo).not.toContain("Calibri");
    expect(limpo).not.toContain("font-family");
    expect(limpo).not.toContain("<style");
    expect(limpo).toContain("Texto do Word");
  });

  it("não vaza o texto de <script>/<title> embutidos no HTML colado", () => {
    const html =
      "<script>alert('xss')</script><title>Documento sem título</title><p>Conteúdo real</p>";
    const limpo = sanitizeHtml(html);
    expect(limpo).not.toContain("alert");
    expect(limpo).not.toContain("Documento sem título");
    expect(limpo).not.toContain("<script");
    expect(limpo).not.toContain("<title");
    expect(limpo).toContain("Conteúdo real");
  });

  it("remove img sem src válido (javascript:, http externo)", () => {
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).not.toContain("<img");
    expect(sanitizeHtml('<img src="https://evil.example/x.png">')).not.toContain("<img");
  });

  it("mantém img[src] apontando para /uploads/ (padrão, sem opções)", () => {
    const limpo = sanitizeHtml('<img src="/uploads/card-1/foto.png" alt="foto">');
    expect(limpo).toContain('src="/uploads/card-1/foto.png"');
    expect(limpo).toContain('alt="foto"');
  });

  describe("permitirImagemTemporaria", () => {
    it("sem a opção, remove img com src data:/blob: (comportamento padrão preservado)", () => {
      expect(sanitizeHtml('<img src="data:image/png;base64,AAAA">')).not.toContain("<img");
      expect(sanitizeHtml('<img src="blob:http://localhost/abc-123">')).not.toContain("<img");
    });

    it("com a opção, mantém img com src data:/blob:", () => {
      const comData = sanitizeHtml('<img src="data:image/png;base64,AAAA">', {
        permitirImagemTemporaria: true,
      });
      expect(comData).toContain('src="data:image/png;base64,AAAA"');

      const comBlob = sanitizeHtml('<img src="blob:http://localhost/abc-123">', {
        permitirImagemTemporaria: true,
      });
      expect(comBlob).toContain('src="blob:http://localhost/abc-123"');
    });

    it("com a opção, ainda bloqueia javascript:", () => {
      expect(sanitizeHtml('<img src="javascript:alert(1)">', { permitirImagemTemporaria: true })).not.toContain(
        "<img"
      );
    });

    it("com a opção, permite http(s) temporariamente (imagem remota embutida no HTML colado)", () => {
      const comHttps = sanitizeHtml('<img src="https://cdn.example.com/x.png">', {
        permitirImagemTemporaria: true,
      });
      expect(comHttps).toContain('src="https://cdn.example.com/x.png"');

      const comHttp = sanitizeHtml('<img src="http://cdn.example.com/x.png">', {
        permitirImagemTemporaria: true,
      });
      expect(comHttp).toContain('src="http://cdn.example.com/x.png"');
    });

    it("sem a opção, continua bloqueando http(s) (garantia preservada no Salvar/renderização)", () => {
      expect(sanitizeHtml('<img src="https://evil.example/x.png">')).not.toContain("<img");
    });
  });

  describe("conteúdo colado do ClickUp/Bitrix/Docs", () => {
    it("títulos viram bloco em negrito (não colam no texto seguinte)", () => {
      const limpo = sanitizeHtml("<h1>Título</h1><p>Texto</p>");
      expect(limpo).toBe("<div><strong>Título</strong></div><p>Texto</p>");
    });

    it("blocos (blockquote, section, pre) viram div e preservam a quebra de linha", () => {
      const limpo = sanitizeHtml("<section>um</section><blockquote>dois</blockquote><pre>três</pre>");
      expect(limpo).toBe("<div>um</div><div>dois</div><div>três</div>");
    });

    it("células de tabela ficam separadas por espaço; linhas viram blocos", () => {
      const limpo = sanitizeHtml("<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>");
      expect(limpo).toContain("A B");
      expect(limpo).toContain("C D");
      expect(limpo).not.toContain("<td");
      expect(limpo).not.toContain("<tr");
    });

    it("o <div> gerado nunca herda atributos (style/onclick) da tag original", () => {
      const limpo = sanitizeHtml('<h2 style="color:red" onclick="x()" class="c">Oi</h2>');
      expect(limpo).toBe("<div><strong>Oi</strong></div>");
    });

    it("link <a> é desembrulhado: mantém o texto, perde o href", () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">clique</a>')).toBe("clique");
    });

    describe("imagens no paste (permitirImagemTemporaria)", () => {
      const opts = { permitirImagemTemporaria: true };

      it("//host/img.png vira https://host/img.png", () => {
        expect(sanitizeHtml('<img src="//cdn.ex.com/a.png">', opts)).toContain('src="https://cdn.ex.com/a.png"');
      });

      it("lazy-load: usa data-src quando o src é um placeholder data:", () => {
        const limpo = sanitizeHtml(
          '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="https://cdn.ex.com/real.jpg">',
          opts
        );
        expect(limpo).toContain('src="https://cdn.ex.com/real.jpg"');
        expect(limpo).not.toContain("R0lGOD");
        expect(limpo).not.toContain("data-src");
      });

      it("sem src: usa a primeira URL do srcset", () => {
        const limpo = sanitizeHtml('<img srcset="https://cdn.ex.com/1x.png 1x, https://cdn.ex.com/2x.png 2x">', opts);
        expect(limpo).toContain('src="https://cdn.ex.com/1x.png"');
        expect(limpo).not.toContain("srcset");
      });

      it("não troca um src http(s) que já é válido por data-src", () => {
        const limpo = sanitizeHtml('<img src="https://a.ex.com/ok.png" data-src="https://b.ex.com/outro.png">', opts);
        expect(limpo).toContain('src="https://a.ex.com/ok.png"');
        expect(limpo).not.toContain("b.ex.com");
      });

      it("data-src com javascript:/data: não vira src", () => {
        expect(sanitizeHtml('<img data-src="javascript:alert(1)">', opts)).not.toContain("<img");
      });

      it("sem a opção (Salvar/renderização), data-src/srcset/// não são promovidos", () => {
        expect(sanitizeHtml('<img data-src="https://cdn.ex.com/real.jpg">')).not.toContain("<img");
        expect(sanitizeHtml('<img src="//cdn.ex.com/a.png">')).not.toContain("<img");
      });
    });
  });
});
