// Carrega o .env.local no process.env do runner de e2e (Playwright não faz isso
// sozinho). Assim o store.ts importado pelos helpers acha as credenciais do
// Supabase, e o setup consegue usar a service_role.
import { readFileSync } from "fs";
import { join } from "path";

let carregado = false;

export function carregarEnvLocal() {
  if (carregado) return;
  carregado = true;
  try {
    const texto = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const linha of texto.split("\n")) {
      const t = linha.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const chave = t.slice(0, i).trim();
      const valor = t.slice(i + 1).trim();
      if (!(chave in process.env)) process.env[chave] = valor;
    }
  } catch {
    // Em CI as variáveis já vêm do ambiente; sem .env.local tudo bem.
  }

  for (const req of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[req]) throw new Error(`e2e: falta a variável ${req} (defina no .env.local ou no ambiente)`);
  }
}
