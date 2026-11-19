// Supabase Edge Function (Deno) — baixa uma imagem remota por URL, com proteção
// contra SSRF, e devolve { base64, tipo, nome }. Substitui o antigo
// src/lib/fetch-remote-image.ts (que rodava no servidor Next).
//
// Deploy:  supabase functions deploy baixar-imagem-remota --project-ref <ref>
// Chamada: supabase.functions.invoke("baixar-imagem-remota", { body: { url } })
//
// Usada ao colar conteúdo com imagens (ClickUp, e-mail, páginas web): o HTML colado traz o
// <img> apontando para a URL original, e o navegador não consegue baixá-la por causa do CORS.

const TAMANHO_MAXIMO = 15 * 1024 * 1024; // 15 MB
const TIMEOUT_MS = 10_000;
const MAX_REDIRECIONAMENTOS = 4;

const EXT_POR_TIPO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
};

// Tipos "genéricos" que CDNs/anexos costumam devolver para imagens: nesses casos o tipo real é
// descoberto pelos primeiros bytes do arquivo (não pelo cabeçalho).
const TIPOS_GENERICOS = new Set(["", "application/octet-stream", "binary/octet-stream"]);

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

// Valida protocolo e host (resolve DNS e checa cada IP). Devolve a mensagem de erro, ou null se ok.
// Roda a cada salto de redirecionamento: um host público não pode apontar pra rede interna.
async function validarDestino(url: URL): Promise<string | null> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Só http(s) é permitido";
  try {
    const registros = await Deno.resolveDns(url.hostname, "A").catch(() => [] as string[]);
    const registros6 = await Deno.resolveDns(url.hostname, "AAAA").catch(() => [] as string[]);
    const todos = [...registros, ...registros6];
    if (todos.length === 0 || todos.some(ipPrivadoOuReservado)) {
      return "Host da imagem remota não permitido";
    }
  } catch {
    return "Não foi possível resolver o host da imagem";
  }
  return null;
}

// Descobre o tipo de imagem pelos primeiros bytes (assinatura do arquivo).
function detectarTipo(b: Uint8Array): string | null {
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  return null;
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

  // Busca seguindo redirecionamentos MANUALMENTE (até MAX_REDIRECIONAMENTOS), revalidando o
  // destino de cada salto — links de anexo (ClickUp, CDNs, S3 assinado) costumam redirecionar.
  let resp: Response | null = null;
  for (let salto = 0; salto <= MAX_REDIRECIONAMENTOS; salto++) {
    const problema = await validarDestino(url);
    if (problema) return erro(400, problema);

    try {
      resp = await fetch(url.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // alguns hosts recusam requisições sem User-Agent/Accept de navegador
          "User-Agent": "Mozilla/5.0 (compatible; GestaoDemandasTI/1.0; +imagem-colada)",
          Accept: "image/*,*/*;q=0.8",
        },
      });
    } catch {
      return erro(502, "Falha ao buscar a imagem remota");
    }

    if (resp.status >= 300 && resp.status < 400) {
      const destino = resp.headers.get("location");
      if (!destino) return erro(502, "Redirecionamento inválido da imagem remota");
      if (salto === MAX_REDIRECIONAMENTOS) return erro(400, "Imagem remota com redirecionamentos demais");
      try {
        url = new URL(destino, url);
      } catch {
        return erro(502, "Redirecionamento inválido da imagem remota");
      }
      continue;
    }
    break;
  }
  if (!resp) return erro(502, "Falha ao buscar a imagem remota");
  if (!resp.ok) {
    return erro(
      502,
      resp.status === 401 || resp.status === 403
        ? "A imagem exige login/permissão no site de origem — anexe o arquivo diretamente"
        : `A imagem remota respondeu ${resp.status}`
    );
  }

  const tipoHeader = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const tamanhoHeader = Number(resp.headers.get("content-length") ?? "0");
  if (tamanhoHeader > TAMANHO_MAXIMO) return erro(413, "Imagem maior que 15 MB");

  // Só baixa o corpo se o tipo declarado é imagem suportada ou genérico (aí confere pelos bytes).
  if (!EXT_POR_TIPO[tipoHeader] && !TIPOS_GENERICOS.has(tipoHeader)) {
    return erro(415, "A URL não aponta para uma imagem suportada");
  }

  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.byteLength > TAMANHO_MAXIMO) return erro(413, "Imagem maior que 15 MB");

  const tipo = EXT_POR_TIPO[tipoHeader] ? tipoHeader : detectarTipo(buf);
  if (!tipo || !EXT_POR_TIPO[tipo]) return erro(415, "A URL não aponta para uma imagem suportada");

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
