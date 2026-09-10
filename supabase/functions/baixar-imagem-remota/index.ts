// Supabase Edge Function (Deno) — baixa uma imagem remota por URL, com proteção
// contra SSRF, e devolve { base64, tipo, nome }. Substitui o antigo
// src/lib/fetch-remote-image.ts (que rodava no servidor Next).
//
// Deploy:  supabase functions deploy baixar-imagem-remota
// Chamada: supabase.functions.invoke("baixar-imagem-remota", { body: { url } })

const TAMANHO_MAXIMO = 15 * 1024 * 1024; // 15 MB
const TIMEOUT_MS = 10_000;

const EXT_POR_TIPO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function erro(status: number, mensagem: string): Response {
  return new Response(JSON.stringify({ error: mensagem }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// IP privado / reservado / loopback / link-local / metadados de nuvem.
function ipPrivadoOuReservado(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // inclui 169.254.169.254
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reservado
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return ipPrivadoOuReservado(lower.slice(7));
  if (!lower.includes(":") && !v4) return true; // formato desconhecido -> bloqueia
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro(405, "Use POST");

  let urlBruta: string;
  try {
    urlBruta = (await req.json()).url;
  } catch {
    return erro(400, "Corpo inválido");
  }
  if (typeof urlBruta !== "string" || !urlBruta) return erro(400, "URL da imagem não enviada");

  let url: URL;
  try {
    url = new URL(urlBruta);
  } catch {
    return erro(400, "URL de imagem inválida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return erro(400, "Só http(s) é permitido");
  }

  // Resolve o host e checa cada IP.
  try {
    const registros = await Deno.resolveDns(url.hostname, "A").catch(() => [] as string[]);
    const registros6 = await Deno.resolveDns(url.hostname, "AAAA").catch(() => [] as string[]);
    const todos = [...registros, ...registros6];
    if (todos.length === 0 || todos.some(ipPrivadoOuReservado)) {
      return erro(400, "Host da imagem remota não permitido");
    }
  } catch {
    return erro(400, "Não foi possível resolver o host da imagem");
  }

  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return erro(502, "Falha ao buscar a imagem remota");
  }
  if (resp.status >= 300 && resp.status < 400) {
    return erro(400, "Imagem remota redirecionou — não seguido por segurança");
  }
  if (!resp.ok) return erro(502, `A imagem remota respondeu ${resp.status}`);

  const tipo = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!EXT_POR_TIPO[tipo]) return erro(415, "A URL não aponta para uma imagem suportada");

  const tamanhoHeader = Number(resp.headers.get("content-length") ?? "0");
  if (tamanhoHeader > TAMANHO_MAXIMO) return erro(413, "Imagem maior que 15 MB");

  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.byteLength > TAMANHO_MAXIMO) return erro(413, "Imagem maior que 15 MB");

  // base64 sem estourar a pilha em imagens grandes
  let bin = "";
  for (let i = 0; i < buf.length; i += 8192) {
    bin += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  const base64 = btoa(bin);

  return new Response(
    JSON.stringify({ base64, tipo, nome: `imagem-colada.${EXT_POR_TIPO[tipo]}` }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
