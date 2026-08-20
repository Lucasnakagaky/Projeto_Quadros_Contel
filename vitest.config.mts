import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // e2e/ roda pelo Playwright Test (`npx playwright test`), não pelo vitest — os dois usam a
    // extensão .spec.ts, então sem essa exclusão o vitest tenta importar test.describe() do
    // Playwright e quebra.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
