"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  sair: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

/** Acesso à sessão de login. Fora do provider, lança — para não usar por engano. */
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

/**
 * Portão de autenticação. Enquanto carrega a sessão, mostra um placeholder.
 * Sem sessão (e fora de /login), redireciona para /login. A tela de login é a
 * única rota liberada sem sessão.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const naLogin = pathname === "/login" || pathname?.endsWith("/login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session && !naLogin) router.replace("/login");
  }, [loading, session, naLogin, router]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-400">
        Carregando…
      </div>
    );
  }
  if (!session && !naLogin) {
    return null; // o redirect acima cuida da navegação
  }

  return <Ctx.Provider value={{ session, loading, sair }}>{children}</Ctx.Provider>;
}
