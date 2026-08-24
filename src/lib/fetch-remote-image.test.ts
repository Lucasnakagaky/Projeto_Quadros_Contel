import { afterEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.fn();
vi.mock("dns", () => {
  const promises = { lookup: (...args: unknown[]) => lookupMock(...args) };
  return { promises, default: { promises } };
});

const { baixarImagemRemota } = await import("./fetch-remote-image");

function streamDe(bytes: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

function respostaFake(opts: {
  status?: number;
  contentType?: string;
  contentLength?: string;
  bytes?: number[];
}) {
  const status = opts.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({
      ...(opts.contentType ? { "content-type": opts.contentType } : {}),
      ...(opts.contentLength ? { "content-length": opts.contentLength } : {}),
    }),
    body: streamDe(opts.bytes ?? [1, 2, 3]),
  } as Response;
}

describe("baixarImagemRemota", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    lookupMock.mockReset();
  });

  it("rejeita protocolo que não seja http/https", async () => {
    await expect(baixarImagemRemota("ftp://exemplo.com/x.png")).rejects.toThrow(
      /http\/https/
    );
  });

  it("rejeita URL malformada", async () => {
    await expect(baixarImagemRemota("não é uma url")).rejects.toThrow(/inválida/);
  });

  it("rejeita host que resolve para IP privado/loopback (SSRF)", async () => {
    lookupMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    await expect(baixarImagemRemota("http://interno.exemplo.test/x.png")).rejects.toThrow(
      /não permitido/
    );
  });

  it("rejeita host que resolve para endpoint de metadados de nuvem (169.254.169.254)", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    await expect(baixarImagemRemota("http://interno.exemplo.test/x.png")).rejects.toThrow(
      /não permitido/
    );
  });

  it("rejeita host que resolve para faixa privada 192.168.x.x", async () => {
    lookupMock.mockResolvedValue([{ address: "192.168.1.10", family: 4 }]);
    await expect(baixarImagemRemota("http://interno.exemplo.test/x.png")).rejects.toThrow(
      /não permitido/
    );
  });

  it("rejeita quando a resolução DNS falha", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(baixarImagemRemota("http://naoexiste.exemplo.test/x.png")).rejects.toThrow(
      /não permitido/
    );
  });

  it("baixa com sucesso uma imagem de host público com content-type suportado", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const bytes = [137, 80, 78, 71, 1, 2, 3];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respostaFake({ contentType: "image/png", contentLength: String(bytes.length), bytes })
      )
    );

    const resultado = await baixarImagemRemota("https://cdn.exemplo.test/logo.png");
    expect(resultado.ext).toBe("png");
    expect(resultado.tipo).toBe("image/png");
    expect(Array.from(resultado.buffer)).toEqual(bytes);
  });

  it("rejeita content-type que não seja uma imagem suportada", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respostaFake({ contentType: "text/html", bytes: [1] }))
    );
    await expect(baixarImagemRemota("https://cdn.exemplo.test/pagina.html")).rejects.toThrow(
      /não aponta para uma imagem/
    );
  });

  it("rejeita quando o content-length declarado excede o limite", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respostaFake({ contentType: "image/png", contentLength: String(20 * 1024 * 1024) })
      )
    );
    await expect(baixarImagemRemota("https://cdn.exemplo.test/enorme.png")).rejects.toThrow(
      /tamanho máximo/
    );
  });

  it("rejeita resposta de redirecionamento (3xx) em vez de segui-lo", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respostaFake({ status: 302, contentType: "image/png" }))
    );
    await expect(baixarImagemRemota("https://cdn.exemplo.test/redireciona.png")).rejects.toThrow(
      /redirecionou/
    );
  });

  it("rejeita status de erro HTTP (ex.: 404)", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaFake({ status: 404 })));
    await expect(baixarImagemRemota("https://cdn.exemplo.test/quebrada.png")).rejects.toThrow(
      /Falha ao baixar/
    );
  });

  it("rejeita quando o fetch falha (erro de rede)", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(baixarImagemRemota("https://cdn.exemplo.test/x.png")).rejects.toThrow(
      /Não foi possível baixar/
    );
  });
});
