// api-client: importação de imagem remota (colar do ClickUp/Bitrix). Sem rede, sem Supabase:
// o cliente Supabase, o Storage e o store são simulados.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const upload = vi.fn(async () => ({ error: null }));
const addAttachment = vi.fn(async (a: Record<string, unknown>) => ({ id: "anexo-1", ...a }));

vi.mock("./supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => upload(...(args as [])),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://sb.test/storage/v1/object/public/uploads/${path}` } }),
      }),
    },
  },
}));
vi.mock("./store", () => ({ addAttachment: (a: Record<string, unknown>) => addAttachment(a) }));

import { api } from "./api-client";

const PNG_BASE64 = "iVBORw0KGgo="; // 8 bytes qualquer; o conteúdo não importa no teste

describe("api-client — anexo por URL (imagem remota)", () => {
  beforeEach(() => {
    invoke.mockReset();
    upload.mockClear();
    addAttachment.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caminho principal: Edge Function devolve a imagem e ela sobe pro Storage", async () => {
    invoke.mockResolvedValue({ data: { base64: PNG_BASE64, tipo: "image/png", nome: "imagem-colada.png" }, error: null });
    const anexo = (await api.post("/api/cards/card-1/attachments", { url: "https://t1.clickup-attachments.com/a.png" })) as {
      url: string;
      nome: string;
    };
    expect(invoke).toHaveBeenCalledWith("baixar-imagem-remota", { body: { url: "https://t1.clickup-attachments.com/a.png" } });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(anexo.nome).toBe("imagem-colada.png");
    expect(anexo.url).toContain("/storage/v1/object/public/uploads/card-1/");
  });

  it("função indisponível (ex.: não publicada): cai pro download direto no navegador", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Failed to send a request to the Edge Function") });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["x"], { type: "image/png" }),
      })) as unknown as typeof fetch
    );
    const anexo = (await api.post("/api/cards/card-1/attachments", { url: "https://cdn.ok/a.png" })) as { nome: string };
    expect(upload).toHaveBeenCalledTimes(1);
    expect(anexo.nome).toBe("imagem-colada.png");
  });

  it("função indisponível e navegador bloqueado (CORS): erro claro, sem o texto genérico do Supabase", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Failed to send a request to the Edge Function") });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch);
    await expect(api.post("/api/cards/card-1/attachments", { url: "https://sem-cors.example/a.png" })).rejects.toThrow(
      /Não foi possível importar uma imagem colada/
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("função recusa (ex.: exige login): mostra o motivo que veio no corpo da resposta", async () => {
    const corpo = new Response(JSON.stringify({ error: "A imagem exige login/permissão no site de origem" }), { status: 502 });
    invoke.mockResolvedValue({ data: null, error: Object.assign(new Error("Edge Function returned a non-2xx status code"), { context: corpo }) });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch);
    await expect(api.post("/api/cards/card-1/attachments", { url: "https://privado.example/a.png" })).rejects.toThrow(
      "Não foi possível importar a imagem colada: A imagem exige login/permissão no site de origem"
    );
  });

  it("download direto que devolve algo que não é imagem (ex.: página de login) é descartado", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("falhou") });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, blob: async () => new Blob(["<html>"], { type: "text/html" }) })) as unknown as typeof fetch
    );
    await expect(api.post("/api/cards/card-1/attachments", { url: "https://login.example/x" })).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });
});
