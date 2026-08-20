import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextEditor } from "./rich-text-editor";

describe("RichTextEditor - colar texto + imagem embutida", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("faz upload real da imagem colada como data: no HTML e mantém o src após Salvar", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("data:")) {
        return { ok: true, blob: async () => new Blob(["fake"], { type: "image/png" }) } as Response;
      }
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: "anexo-1", url: "/uploads/card-1/imagem.png" }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSalvar = vi.fn();
    render(<RichTextEditor cardId="card-1" valorInicial="" onSalvar={onSalvar} onCancelar={() => {}} />);

    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    // jsdom não executa a inserção nativa do paste do navegador, então simulamos aqui o
    // resultado dela: texto formatado + imagem embutida como data: URI, exatamente como chega
    // ao colar "texto + imagem" juntos de fontes como Word/Docs (sem item image/* separado no
    // clipboard, que é o caso já coberto por handlePaste antes desse fix).
    editor.innerHTML = '<p>Texto <b>negrito</b></p><img src="data:image/png;base64,AAAA">';
    fireEvent.paste(editor, { clipboardData: { items: [], getData: () => "" } });

    await waitFor(() => {
      expect(editor.querySelector("img")?.getAttribute("src")).toBe("/uploads/card-1/imagem.png");
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSalvar).toHaveBeenCalledTimes(1);
    const htmlSalvo = onSalvar.mock.calls[0][0] as string;
    expect(htmlSalvo).toContain('src="/uploads/card-1/imagem.png"');
    expect(htmlSalvo).not.toContain("data:image");
    expect(htmlSalvo).toContain("<b>negrito</b>");
  });
});

function clipboardDataFake(overrides: { html?: string; text?: string }) {
  return {
    items: [] as DataTransferItem[],
    getData: (formato: string) => {
      if (formato === "text/html") return overrides.html ?? "";
      if (formato === "text/plain") return overrides.text ?? "";
      return "";
    },
  };
}

describe("RichTextEditor - sanitização no momento do paste", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("remove estilo/classe de HTML sujo já ao colar, preservando negrito/itálico", () => {
    render(<RichTextEditor cardId="card-1" valorInicial="" onSalvar={() => {}} onCancelar={() => {}} />);
    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    editor.focus();

    fireEvent.paste(editor, {
      clipboardData: clipboardDataFake({
        html: '<span style="color:red" class="c">Vermelho</span> <b>negrito</b> <i>itálico</i>',
      }),
    });

    expect(editor.innerHTML).not.toContain("style=");
    expect(editor.innerHTML).not.toContain("class=");
    expect(editor.innerHTML).toContain("Vermelho");
    expect(editor.innerHTML).toContain("<b>negrito</b>");
    expect(editor.innerHTML).toContain("<i>itálico</i>");
  });

  it("sem text/html no clipboard, cai para text/plain preservando quebras de linha como <br> e escapando HTML", () => {
    render(<RichTextEditor cardId="card-1" valorInicial="" onSalvar={() => {}} onCancelar={() => {}} />);
    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    editor.focus();

    fireEvent.paste(editor, {
      clipboardData: clipboardDataFake({ text: "linha1\nlinha2 <script>" }),
    });

    expect(editor.innerHTML).toContain("linha1<br>linha2");
    expect(editor.innerHTML).toContain("&lt;script&gt;");
    expect(editor.querySelector("script")).toBeNull();
  });

  it("com os dois formatos vazios, não mexe no conteúdo do editor", () => {
    render(<RichTextEditor cardId="card-1" valorInicial="<p>Original</p>" onSalvar={() => {}} onCancelar={() => {}} />);
    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    editor.focus();

    fireEvent.paste(editor, { clipboardData: clipboardDataFake({}) });

    expect(editor.innerHTML).toBe("<p>Original</p>");
  });

  it("cola itens de lista soltos dentro de uma <ul> existente sem quebrar a estrutura", () => {
    render(
      <RichTextEditor
        cardId="card-1"
        valorInicial="<ul><li>Item existente</li></ul>"
        onSalvar={() => {}}
        onCancelar={() => {}}
      />
    );
    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    const li = editor.querySelector("li")!;
    const textNode = li.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, textNode.textContent!.length);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(editor, {
      clipboardData: clipboardDataFake({ html: "<li>Item colado</li>" }),
    });

    expect(editor.querySelectorAll("ul")).toHaveLength(1);
    const itens = Array.from(editor.querySelectorAll("li")).map((el) => el.textContent);
    expect(itens).toEqual(["Item existente", "Item colado"]);
  });
});

describe("RichTextEditor - lightbox no modo de edição", () => {
  it("clicar numa imagem ainda em edição (antes de salvar) abre o lightbox, sem entrar no fluxo de edição de texto", async () => {
    render(
      <RichTextEditor
        cardId="card-1"
        valorInicial='<img src="/uploads/card-1/foto.png" alt="foto">'
        onSalvar={() => {}}
        onCancelar={() => {}}
      />
    );
    const editor = screen.getByRole("textbox", { name: "Editor de atividades" });
    const img = editor.querySelector("img")!;

    const user = userEvent.setup();
    await user.click(img);

    expect(await screen.findByRole("dialog", { name: "foto" })).toBeInTheDocument();
    // o editor continua montado e com o conteúdo intacto por trás do lightbox — só fica
    // aria-hidden enquanto o modal é a superfície ativa (comportamento correto do Radix Dialog),
    // então a busca precisa incluir elementos ocultos pra ARIA aqui.
    const editorPorTras = screen.getByRole("textbox", { name: "Editor de atividades", hidden: true });
    expect(editorPorTras).toBeInTheDocument();
    expect(editorPorTras.querySelector("img")).not.toBeNull();
  });
});
