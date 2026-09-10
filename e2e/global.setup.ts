import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { carregarEnvLocal } from "./env";

carregarEnvLocal();

// Usuário fixo de e2e. O app exige login; os testes reaproveitam esta sessão
// via storageState. Como a RLS libera tudo para qualquer autenticado, este
// usuário enxerga os mesmos dados do usuário real — é só uma credencial de teste.
export const E2E_EMAIL = "e2e@local.test";
export const E2E_SENHA = "e2e-Local!2026";
export const STORAGE_STATE = ".e2e-auth.json";

setup("autentica e salva a sessão", async ({ page }) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (!data.users.some((u) => u.email === E2E_EMAIL)) {
    const r = await admin.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_SENHA,
      email_confirm: true,
    });
    if (r.error) throw r.error;
  }

  await page.goto("login/");
  await page.fill("#email", E2E_EMAIL);
  await page.fill("#senha", E2E_SENHA);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pipes/**", { timeout: 20_000 });
  await expect(page.locator("h1")).toContainText("Meus Pipes");

  await page.context().storageState({ path: STORAGE_STATE });
});
