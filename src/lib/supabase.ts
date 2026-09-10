import { createClient } from "@supabase/supabase-js";

// URL e chave `anon` (pública) vêm do ambiente e são embutidas no bundle pelo
// Next (prefixo NEXT_PUBLIC_). A `anon` PODE ser pública — a proteção dos dados
// é o RLS no Supabase, que libera tudo só para o papel `authenticated`.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Defina em .env.local (dev) e nos secrets do GitHub Actions (build)."
  );
}

/** Cliente Supabase único do app (browser). Mantém a sessão de login no localStorage. */
export const supabase = createClient(url, anonKey);
