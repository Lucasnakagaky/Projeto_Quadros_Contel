import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react só se auto-registra pra limpar o DOM entre testes quando detecta um
// `afterEach` global — este projeto não usa `test.globals: true` no vitest.config.mts (os hooks
// são importados explicitamente em cada arquivo), então sem isso aqui cada render() vazava pro
// próximo teste do mesmo arquivo.
afterEach(() => {
  cleanup();
});
