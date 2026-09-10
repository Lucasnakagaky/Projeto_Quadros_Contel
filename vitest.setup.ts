import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// src/lib/supabase.ts lança se essas faltam. Nos testes, valores fictícios —
// o cliente é construído mas nenhuma chamada de rede real acontece (os testes
// que tocam o store mockam o cliente; os demais nem chegam a usá-lo).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://teste.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "chave-anon-de-teste";

// @testing-library/react só se auto-registra pra limpar o DOM entre testes quando detecta um
// `afterEach` global — este projeto não usa `test.globals: true` no vitest.config.mts (os hooks
// são importados explicitamente em cada arquivo), então sem isso aqui cada render() vazava pro
// próximo teste do mesmo arquivo.
afterEach(() => {
  cleanup();
});
