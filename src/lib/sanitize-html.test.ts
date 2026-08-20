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

    it("com a opção, ainda bloqueia javascript: e hosts externos", () => {
      expect(sanitizeHtml('<img src="javascript:alert(1)">', { permitirImagemTemporaria: true })).not.toContain(
        "<img"
      );
      expect(
        sanitizeHtml('<img src="https://evil.example/x.png">', { permitirImagemTemporaria: true })
      ).not.toContain("<img");
    });
  });
});
