// Servidor estático para o e2e: serve `out/` sob o basePath /Projeto_Quadros_Contel,
// exatamente como o GitHub Pages faz. Sem dependências externas.
//
// Roda `next build` só se `out/` não existir (ou se E2E_REBUILD=1). Para forçar um
// build novo depois de mexer no app:  E2E_REBUILD=1 npm run test:e2e
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const BASE_PATH = "/Projeto_Quadros_Contel";
const PORT = Number(process.env.E2E_PORT || 4173);

if (!existsSync(OUT) || process.env.E2E_REBUILD === "1") {
  console.log("[e2e] gerando build estático (next build)…");
  const r = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, cwd: ROOT });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function acharArquivo(urlPath) {
  let p = urlPath.split("?")[0];
  if (p === BASE_PATH) p = "/";
  else if (p.startsWith(BASE_PATH + "/")) p = p.slice(BASE_PATH.length);
  else if (p === "/" || p === "") p = "/";
  else return null; // fora do basePath
  p = decodeURIComponent(p);

  const candidatos = p.endsWith("/")
    ? [join(OUT, p, "index.html")]
    : [join(OUT, p), join(OUT, p + ".html"), join(OUT, p, "index.html")];

  for (const c of candidatos) {
    try {
      if ((await stat(c)).isFile()) return c;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const arquivo = await acharArquivo(req.url || "/");
    if (arquivo) {
      const body = await readFile(arquivo);
      res.writeHead(200, { "content-type": MIME[extname(arquivo)] || "application/octet-stream" });
      res.end(body);
      return;
    }
    // fallback: 404.html do próprio Next
    try {
      const body = await readFile(join(OUT, "404.html"));
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("404");
    }
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("500 " + (e?.message ?? e));
  }
});

server.listen(PORT, () => {
  console.log(`[e2e] servindo out/ em http://localhost:${PORT}${BASE_PATH}/`);
});

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
