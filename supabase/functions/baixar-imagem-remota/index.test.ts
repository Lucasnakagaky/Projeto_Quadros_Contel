// @vitest-environment node
// Testa a lógica da Edge Function `baixar-imagem-remota` rodando-a no Node com `Deno` e `fetch`
// simulados: nenhuma rede real, nenhum DNS real. Cobre o fluxo do "colar do ClickUp/Bitrix":
// imagem direta, redirecionamento, tipo genérico (octet-stream), login exigido e SSRF.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (req: Request) => Promise<Response>;
let handler: Handler;

// hosts "públicos" e "internos" do cenário (o DNS é simulado)
const DNS: Record<string, string[]> = {
  "cdn.publico.test": ["93.184.216.34"],
  "outro.publico.test": ["93.184.216.35"],
  "interno.test": ["10.0.0.5"],
  "metadata.test": ["169.254.169.254"],
  "loopback.test": ["127.0.0.1"],
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1]);
const BMP = new Uint8Array([0x42, 0x4d, 1, 2, 3]);

// tabela de respostas por URL; o fetch simulado consulta aqui
let respostas: Record<string, () => Response>;
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  const r = respostas[url];
  if (!r) throw new Error("sem rota simulada: " + url);
  return r();
});

function binario(bytes: Uint8Array, contentType: string, status = 200, extra: Record<string, string> = {}) {
  return () => new Response(bytes as BodyInit, { status, headers: { "content-type": contentType, ...extra } });
}
const redireciona = (para: string, status = 302) => () => new Response(null, { status, headers: { location: para } });

async function chamar(url: unknown, metodo = "POST") {
  const req = new Request("https://fn.test/baixar-imagem-remota", {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: metodo === "POST" ? JSON.stringify({ url }) : undefined,
  });
  const resp = await handler(req);
  const corpo = await resp.json().catch(() => null);
  return { status: resp.status, corpo };
}

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    serve: (h: Handler) => {
      handler = h;
    },
    resolveDns: async (host: string, tipo: string) => {
      if (tipo === "AAAA") return [];
      const r = DNS[host];
      if (!r) throw new Error("NXDOMAIN");
      return r;
    },
  };
  vi.stubGlobal("fetch", fetchMock);
  await import("./index");
});

beforeEach(() => {
  fetchMock.mockClear();
  respostas = {};
});

describe("baixar-imagem-remota (Edge Function)", () => {
  it("imagem direta (PNG com content-type image/png)", async () => {
    respostas["https://cdn.publico.test/a.png"] = binario(PNG, "image/png");
    const { status, corpo } = await chamar("https://cdn.publico.test/a.png");
    expect(status).toBe(200);
    expect(corpo.tipo).toBe("image/png");
    expect(corpo.nome).toBe("imagem-colada.png");
    expect(Buffer.from(corpo.base64, "base64").equals(Buffer.from(PNG))).toBe(true);
  });

  it("segue redirecionamento (CDN/S3 assinado) até a imagem", async () => {
    respostas["https://cdn.publico.test/anexo/1"] = redireciona("https://outro.publico.test/final.jpg");
    respostas["https://outro.publico.test/final.jpg"] = binario(JPG, "image/jpeg");
    const { status, corpo } = await chamar("https://cdn.publico.test/anexo/1");
    expect(status).toBe(200);
    expect(corpo.tipo).toBe("image/jpeg");
    expect(corpo.nome).toBe("imagem-colada.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("segue redirecionamento relativo (Location: /caminho)", async () => {
    respostas["https://cdn.publico.test/r"] = redireciona("/real.gif", 301);
    respostas["https://cdn.publico.test/real.gif"] = binario(GIF, "image/gif");
    const { status, corpo } = await chamar("https://cdn.publico.test/r");
    expect(status).toBe(200);
    expect(corpo.tipo).toBe("image/gif");
  });

  it("SSRF: redirecionamento para host interno é bloqueado no salto (não busca a rede interna)", async () => {
    respostas["https://cdn.publico.test/x"] = redireciona("http://interno.test/segredo.png");
    const { status, corpo } = await chamar("https://cdn.publico.test/x");
    expect(status).toBe(400);
    expect(corpo.error).toMatch(/não permitido/);
    expect(fetchMock).toHaveBeenCalledTimes(1); // só o 1º salto foi buscado
  });

  it("SSRF: hosts que resolvem p/ rede privada, loopback e metadados de nuvem são recusados", async () => {
    for (const host of ["interno.test", "metadata.test", "loopback.test"]) {
      const { status, corpo } = await chamar(`http://${host}/a.png`);
      expect(status).toBe(400);
      expect(corpo.error).toMatch(/não permitido/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("host que não resolve é recusado com mensagem clara", async () => {
    const { status, corpo } = await chamar("https://nao-existe.test/a.png");
    expect(status).toBe(400);
    expect(corpo.error).toMatch(/não permitido|resolver/);
  });

  it("redirecionamentos demais (loop) param no limite", async () => {
    respostas["https://cdn.publico.test/l"] = redireciona("https://cdn.publico.test/l");
    const { status, corpo } = await chamar("https://cdn.publico.test/l");
    expect(status).toBe(400);
    expect(corpo.error).toMatch(/redirecionamentos demais/);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("content-type genérico (octet-stream) é aceito se os bytes forem de imagem (PNG/JPEG/GIF/WebP/BMP)", async () => {
    const casos: [Uint8Array, string][] = [
      [PNG, "image/png"],
      [JPG, "image/jpeg"],
      [GIF, "image/gif"],
      [WEBP, "image/webp"],
      [BMP, "image/bmp"],
    ];
    for (const [bytes, esperado] of casos) {
      respostas["https://cdn.publico.test/g"] = binario(bytes, "application/octet-stream");
      const { status, corpo } = await chamar("https://cdn.publico.test/g");
      expect(status).toBe(200);
      expect(corpo.tipo).toBe(esperado);
    }
    // sem content-type nenhum também
    respostas["https://cdn.publico.test/g"] = () => new Response(PNG as BodyInit, { status: 200 });
    expect((await chamar("https://cdn.publico.test/g")).corpo.tipo).toBe("image/png");
  });

  it("octet-stream com bytes que NÃO são imagem é recusado (415)", async () => {
    respostas["https://cdn.publico.test/h"] = binario(new TextEncoder().encode("<html>login</html>"), "application/octet-stream");
    const { status } = await chamar("https://cdn.publico.test/h");
    expect(status).toBe(415);
  });

  it("página HTML (ex.: tela de login) não vira imagem, mesmo que o corpo pareça PNG", async () => {
    respostas["https://cdn.publico.test/login"] = binario(PNG, "text/html");
    const { status } = await chamar("https://cdn.publico.test/login");
    expect(status).toBe(415);
  });

  it("401/403: mensagem diz que a imagem exige login (caso Bitrix privado)", async () => {
    for (const st of [401, 403]) {
      respostas["https://cdn.publico.test/p"] = binario(new Uint8Array(), "text/plain", st);
      const { status, corpo } = await chamar("https://cdn.publico.test/p");
      expect(status).toBe(502);
      expect(corpo.error).toMatch(/exige login/);
    }
  });

  it("outros erros HTTP aparecem com o código (ex.: 404)", async () => {
    respostas["https://cdn.publico.test/n"] = binario(new Uint8Array(), "text/plain", 404);
    const { corpo } = await chamar("https://cdn.publico.test/n");
    expect(corpo.error).toBe("A imagem remota respondeu 404");
  });

  it("imagem maior que 15 MB é recusada (header e corpo)", async () => {
    respostas["https://cdn.publico.test/big"] = binario(PNG, "image/png", 200, { "content-length": String(16 * 1024 * 1024) });
    expect((await chamar("https://cdn.publico.test/big")).status).toBe(413);
    respostas["https://cdn.publico.test/big2"] = binario(new Uint8Array(15 * 1024 * 1024 + 1), "image/png");
    expect((await chamar("https://cdn.publico.test/big2")).status).toBe(413);
  });

  it("valida a entrada: método, corpo, URL e protocolo", async () => {
    expect((await chamar("https://cdn.publico.test/a.png", "GET")).status).toBe(405);
    expect((await chamar(undefined)).status).toBe(400);
    expect((await chamar("não é url")).status).toBe(400);
    const ftp = await chamar("ftp://cdn.publico.test/a.png");
    expect(ftp.status).toBe(400);
    expect(ftp.corpo.error).toMatch(/http/);
    const file = await chamar("file:///etc/passwd");
    expect(file.status).toBe(400);
  });

  it("OPTIONS (preflight CORS) responde ok com cabeçalhos CORS", async () => {
    const resp = await handler(new Request("https://fn.test/x", { method: "OPTIONS" }));
    expect(resp.status).toBe(200);
    expect(resp.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("falha de rede ao buscar vira 502 com mensagem", async () => {
    respostas["https://cdn.publico.test/t"] = () => {
      throw new Error("timeout");
    };
    const { status, corpo } = await chamar("https://cdn.publico.test/t");
    expect(status).toBe(502);
    expect(corpo.error).toMatch(/Falha ao buscar/);
  });
});
