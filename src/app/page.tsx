"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/ui/app-link";

// `redirect()` do servidor não existe no export estático. Aqui a raiz só
// rebate para /pipes no cliente (o AuthProvider manda para /login se não
// houver sessão).
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pipes");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-400">
      Redirecionando para{" "}
      <Link href="/pipes" className="ml-1 text-blue-600 hover:underline">
        seus pipes
      </Link>
      …
    </div>
  );
}
