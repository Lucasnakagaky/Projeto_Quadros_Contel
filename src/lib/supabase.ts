import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Só existe no servidor (sem prefixo NEXT_PUBLIC_ = nunca entra no bundle do
// browser). Usada durante a transição: as rotas de API ainda chamam o store.ts
// e não têm sessão de login, então precisam contornar o RLS. Quando o cliente
// passar a falar direto com o Supabase (com a sessão do login), some.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Defina em .env.local (dev) e nos secrets do GitHub Actions (build)."
  );
}

const noServidor = typeof window === "undefined";

/**
 * Cliente Supabase do app.
 *  - browser: chave `anon` + sessão do login (RLS aplica).
 *  - servidor (rotas de API, durante a migração): `service_role` para
 *    contornar o RLS enquanto não há autenticação nesse caminho.
 */
export const supabase: SupabaseClient =
  noServidor && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(url, anonKey);
