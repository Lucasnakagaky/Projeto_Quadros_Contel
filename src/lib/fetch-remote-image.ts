import { promises as dns } from "dns";
import net from "net";

// Download server-side de uma imagem embutida como URL remota (http/https) num HTML colado na
// Descrição da Demanda — o fetch() do navegador, usado pra data:/blob:, não serve aqui porque a
// maioria dos hosts reais (SharePoint, páginas web, e-mail) não envia cabeçalho CORS permissivo
// pra imagens, então o fetch client-side falharia silenciosamente pra praticamente todo mundo.
// Do lado do servidor não há CORS, mas o alvo é uma URL controlada pelo conteúdo colado pelo
// usuário — então valida host/protocolo antes de buscar (defesa contra SSRF: nada de acessar
// serviços internos, loopback ou endpoints de metadados de nuvem via um paste).

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB
const TIMEOUT_MS = 10_000;

const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
};

function erroComStatus(mensagem: string, status: number): Error & { status: number } {
  const err = new Error(mensagem) as Error & { status: number };
  err.status = status;
  return err;
}

function ipPrivadoOuReservado(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // inclui endpoint de metadados de nuvem (169.254.169.254)
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalizado = ip.toLowerCase();
    if (normalizado === "::1") return true;
    if (normalizado.startsWith("fe80:") || normalizado.startsWith("fc") || normalizado.startsWith("fd")) return true;
    if (normalizado.startsWith("::ffff:")) return ipPrivadoOuReservado(normalizado.slice("::ffff:".length));
    return false;
  }
  return true; // formato de IP não reconhecido — bloqueia por segurança
}

async function lerComLimite(stream: ReadableStream<Uint8Array>, limiteBytes: number): Promise<Buffer> {
  const leitor = stream.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > limiteBytes) throw erroComStatus("Imagem remota excede o tamanho máximo permitido", 413);
      pedacos.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  return Buffer.concat(pedacos);
}

export async function baixarImagemRemota(
  urlBruta: string
): Promise<{ buffer: Buffer; ext: string; tipo: string }> {
  let url: URL;
  try {
    url = new URL(urlBruta);
  } catch {
    throw erroComStatus("URL de imagem inválida", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw erroComStatus("Apenas URLs http/https são aceitas para imagem remota", 400);
  }

  const enderecos = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (enderecos.length === 0 || enderecos.some((e) => ipPrivadoOuReservado(e.address))) {
    throw erroComStatus("Host da imagem remota não permitido", 400);
  }

  let resposta: Response;
  try {
    resposta = await fetch(url.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw erroComStatus("Não foi possível baixar a imagem remota", 502);
  }

  if (resposta.status >= 300 && resposta.status < 400) {
    throw erroComStatus("Imagem remota redirecionou — não seguido por segurança", 400);
  }
  if (!resposta.ok) {
    throw erroComStatus(`Falha ao baixar imagem remota (status ${resposta.status})`, 502);
  }

  const contentLength = Number(resposta.headers.get("content-length") ?? "0");
  if (contentLength > TAMANHO_MAXIMO_BYTES) {
    throw erroComStatus("Imagem remota excede o tamanho máximo permitido", 413);
  }

  const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXTENSAO_POR_TIPO[tipo];
  if (!ext) {
    throw erroComStatus("URL remota não aponta para uma imagem suportada", 415);
  }
  if (!resposta.body) {
    throw erroComStatus("Resposta da imagem remota sem conteúdo", 502);
  }

  const buffer = await lerComLimite(resposta.body, TAMANHO_MAXIMO_BYTES);
  return { buffer, ext, tipo };
}
