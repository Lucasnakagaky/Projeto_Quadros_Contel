import { defineConfig } from "@playwright/test";
import { carregarEnvLocal } from "./e2e/env";

// Mesmo caminho usado em e2e/global.setup.ts ao salvar a sessão.
const STORAGE_STATE = ".e2e-auth.json";

// Precisa rodar antes de qualquer spec/helper importar o store.ts (que lê as
// credenciais do Supabase no load). O Playwright reavalia este config em cada
// worker, então isto cobre os workers também.
carregarEnvLocal();

const PORT = Number(process.env.E2E_PORT || 4173);
const BASE_URL = `http://localhost:${PORT}/Projeto_Quadros_Contel/`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "e2e",
      testIgnore: /global\.setup\.ts/,
      dependencies: ["setup"],
      use: { storageState: STORAGE_STATE },
    },
  ],
  webServer: {
    command: "node e2e/serve-static.mjs",
    url: BASE_URL + "login/",
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
