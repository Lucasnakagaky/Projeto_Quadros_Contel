// Utilitários puros para derivar cores a partir de `fase.cor` (hex vindo do banco).
// Só leitura/visual: nada aqui grava ou altera a cor da fase.

const ESCURO = "#0f172a";
const CLARO = "#ffffff";

function hexParaRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function canal(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (WCAG) de um hex. Hex inválido → 0. */
export function luminancia(hex: string): number {
  const rgb = hexParaRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
}

/** Razão de contraste (1–21) entre um hex e branco. */
export function contrasteComBranco(hex: string): number {
  return 1.05 / (luminancia(hex) + 0.05);
}

/**
 * Cor de texto legível sobre um fundo `hex`: branco quando o contraste com branco
 * é >= 3 (texto semibold), senão azul-ardósia escuro. Hex inválido → branco.
 */
export function textoSobre(hex: string): string {
  if (!hexParaRgb(hex)) return CLARO;
  return contrasteComBranco(hex) >= 3 ? CLARO : ESCURO;
}
