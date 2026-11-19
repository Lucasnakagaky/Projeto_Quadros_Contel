// Colar conteúdo do ClickUp / Bitrix (texto + imagens por URL) na Descrição.
// O HTML dos testes reproduz o formato que esses sistemas põem no clipboard: imagens como
// <img src=URL> absolutas, títulos, links, tabelas e imagens "lazy". A API é simulada: nenhuma
// rede real, nenhum Supabase.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/api-client", () => ({ api: { post: vi.fn() } }));

import { api } from "@/lib/api-client";
import { RichTextEditor } from "./rich-text-editor";

function clipboardDataFake(html: string) {
  return {
    items: [] as DataTransferItem[],
    getData: (formato: string) => (formato === "text/html" ? html : ""),
  };
}

function anexoFake(n: string) {
  return {
    id: `anexo-${n}`,
    cardId: "card-1",
    nome: "imagem-colada.png",
    tipo: "image/png",
    tamanho: 10,
    url: `/uploads/card-1/img-${n}.png`,
    criadoEm: "2026-01-01T00:00:00.000Z",
  };
}

describe("RichTextEditor - colar do ClickUp/Bitrix (texto + imagens remotas)", () => {
  let contador = 0;

  beforeEach(() => {
    contador = 0;
    vi.mocked(toast.error).mockClear();
    vi.mocked(api.post).mockReset();
    // anexo remoto -> devolve um anexo "já no Storage" (/uploads/ é aceito pelo sanitizador)
    vi.mocked(api.post).mockImplementation(async () => {
      contador += 1;
      return anexoFake(String(contador));
    });
  });

  function colar(html: string) {
    const onSalvar = vi.fn();
    render(<RichTextEditor cardId="card-1" valorInicial="" onSalvar={onSalvar} onCancelar={() => {}} />);
    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    editor.focus();
    fireEvent.paste(editor, { clipboardData: clipboardDataFake(html) });
    return { editor, onSalvar };
  }

  async function salvarEPegarHtml(onSalvar: ReturnType<typeof vi.fn>) {
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    await userEvent.setup().click(screen.getByRole("button", { name: "Salvar" }));
    return onSalvar.mock.calls[0][0] as string;
  }

  it("ClickUp: texto + 2 imagens por URL — baixa cada uma, troca o src e mantém título/negrito", async () => {
    const { editor, onSalvar } = colar(
      "<meta charset='utf-8'><div>" +
        "<h2>Título da tarefa</h2>" +
        "<p>Descrição <strong>importante</strong> do card</p>" +
        '<img src="https://t123.p.clickup-attachments.com/t123/aaa/print1.png" alt="print 1">' +
        "<p>Mais um parágrafo</p>" +
        '<img src="https://t123.p.clickup-attachments.com/t123/bbb/print2.png">' +
        "</div>"
    );

    await waitFor(() => {
      const srcs = Array.from(editor.querySelectorAll("img")).map((i) => i.getAttribute("src"));
      expect(srcs).toEqual(["/uploads/card-1/img-1.png", "/uploads/card-1/img-2.png"]);
    });

    // cada URL remota foi enviada ao endpoint de anexos (que usa a Edge Function)
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post).toHaveBeenNthCalledWith(1, "/api/cards/card-1/attachments", {
      url: "https://t123.p.clickup-attachments.com/t123/aaa/print1.png",
    });
    expect(api.post).toHaveBeenNthCalledWith(2, "/api/cards/card-1/attachments", {
      url: "https://t123.p.clickup-attachments.com/t123/bbb/print2.png",
    });
    expect(toast.error).not.toHaveBeenCalled();

    const html = await salvarEPegarHtml(onSalvar);
    expect(html).toContain('src="/uploads/card-1/img-1.png"');
    expect(html).toContain('src="/uploads/card-1/img-2.png"');
    expect(html).not.toContain("clickup");
    expect(html).toContain("<strong>importante</strong>");
    // o título (h2) não some nem gruda no texto seguinte: vira um bloco próprio em negrito
    expect(html).toContain("<strong>Título da tarefa</strong>");
    expect(editor.textContent).toContain("Mais um parágrafo");
  });

  it("Bitrix: imagem dentro de link, imagem lazy (data-src), //host e tabela — todas importadas", async () => {
    const { editor, onSalvar } = colar(
      "<div>" +
        "<h3>Requisito</h3>" +
        '<a href="https://contel.bitrix24.com.br/disk/x"><img src="https://contel.bitrix24.com.br/disk/showFile/1?ts=1" data-bx-image="1" width="400"></a>' +
        '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="https://contel.bitrix24.com.br/upload/lazy.jpg">' +
        '<img src="//cdn.contel.example/imagem.png">' +
        "<table><tr><td>Campo</td><td>Valor</td></tr><tr><td>Prazo</td><td>10/10</td></tr></table>" +
        "</div>"
    );

    await waitFor(() => expect(editor.querySelectorAll('img[src^="/uploads/"]').length).toBe(3));

    const urlsEnviadas = vi.mocked(api.post).mock.calls.map((c) => (c[1] as { url: string }).url);
    expect(urlsEnviadas).toEqual([
      "https://contel.bitrix24.com.br/disk/showFile/1?ts=1",
      "https://contel.bitrix24.com.br/upload/lazy.jpg", // veio de data-src, não do placeholder gif
      "https://cdn.contel.example/imagem.png", // //host -> https
    ]);

    const html = await salvarEPegarHtml(onSalvar);
    expect(html).not.toContain("<a");
    expect(html).not.toContain("bitrix");
    // células da tabela não colam ("CampoValor"): ficam separadas
    expect(editor.textContent).toContain("Campo Valor");
    expect(editor.textContent).toContain("Prazo 10/10");
  });

  it("falha de download (ex.: imagem exige login): remove só a imagem, mantém o texto e mostra UM aviso", async () => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockRejectedValue(
      new Error("Não foi possível importar a imagem colada: A imagem exige login")
    );

    const { editor, onSalvar } = colar(
      '<p>Texto que deve sobreviver</p><img src="https://privado.exemplo.com/a.png"><p>Fim</p><img src="https://privado.exemplo.com/b.png">'
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    const aviso = String(vi.mocked(toast.error).mock.calls[0][0]);
    expect(aviso).toContain("2 imagens não foram importadas");
    expect(aviso).toContain("exige login");
    expect(editor.querySelectorAll("img").length).toBe(0);
    expect(editor.textContent).toContain("Texto que deve sobreviver");
    expect(editor.textContent).toContain("Fim");

    const html = await salvarEPegarHtml(onSalvar);
    expect(html).toContain("Texto que deve sobreviver");
    expect(html).not.toContain("privado.exemplo.com");
  });

  it("uma imagem que falha e outra que funciona: a boa fica, a ruim sai, aviso singular", async () => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post)
      .mockRejectedValueOnce(new Error("A imagem remota respondeu 404"))
      .mockResolvedValueOnce({ ...anexoFake("ok"), url: "/uploads/card-1/ok.png" });

    const { editor } = colar('<img src="https://x.example/quebrada.png"><img src="https://x.example/boa.png">');

    await waitFor(() => expect(editor.querySelectorAll('img[src="/uploads/card-1/ok.png"]').length).toBe(1));
    expect(editor.querySelectorAll("img").length).toBe(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe("A imagem remota respondeu 404");
  });

  it("imagem que já é do nosso /uploads/ não é reenviada", async () => {
    colar('<p>oi</p><img src="/uploads/card-1/ja-existe.png">');
    // dá tempo do fluxo assíncrono rodar e confirma que nada foi enviado
    await new Promise((r) => setTimeout(r, 50));
    expect(api.post).not.toHaveBeenCalled();
  });
});
