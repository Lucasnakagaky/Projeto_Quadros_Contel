// Layout do segmento dinâmico [pipeId]. No export estático, uma rota dinâmica
// precisa de generateStaticParams. Rodamos no BUILD com a service_role (que fica
// no ambiente do CI, nunca no bundle do site) só para listar os ids de pipe.
// dynamicParams = false: só os pipes conhecidos no build viram páginas — criar
// um pipe novo pede um novo deploy (aceitável para uso single-user).

export const dynamicParams = false;

export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.from("pipes").select("id");
  return (data ?? []).map((p) => ({ pipeId: p.id as string }));
}

export default function PipeIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
