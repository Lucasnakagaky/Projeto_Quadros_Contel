import { describe, expect, it } from "vitest";
import { contrasteComBranco, luminancia, textoSobre } from "./cor-fase";

describe("cor-fase", () => {
  it("luminância: preto 0, branco 1", () => {
    expect(luminancia("#000000")).toBeCloseTo(0, 5);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
  });

  it("aceita hex curto e sem #", () => {
    expect(luminancia("#fff")).toBeCloseTo(1, 5);
    expect(luminancia("000000")).toBeCloseTo(0, 5);
  });

  it("hex inválido não quebra: luminância 0 e texto branco", () => {
    expect(luminancia("azul")).toBe(0);
    expect(textoSobre("azul")).toBe("#ffffff");
  });

  it("contraste com branco: branco = 1, preto = 21", () => {
    expect(contrasteComBranco("#ffffff")).toBeCloseTo(1, 1);
    expect(contrasteComBranco("#000000")).toBeCloseTo(21, 0);
  });

  it("cores escuras/médias usam texto branco", () => {
    for (const c of ["#3B82F6", "#8B5CF6", "#A855F7", "#EC4899", "#F43F5E", "#64748B", "#6366F1"]) {
      expect(textoSobre(c)).toBe("#ffffff");
    }
  });

  it("cores claras usam texto escuro", () => {
    for (const c of ["#F59E0B", "#84CC16", "#06B6D4", "#10B981", "#F97316"]) {
      expect(textoSobre(c)).toBe("#0f172a");
    }
  });
});
