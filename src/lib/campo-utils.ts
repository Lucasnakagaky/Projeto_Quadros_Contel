import { Campo, TipoCampo } from "./types";

export function campoPorTipo(campos: Campo[], tipo: TipoCampo): Campo | undefined {
  return campos.find((c) => c.tipo === tipo);
}

export function valorCampoPorTipo(
  campos: Campo[],
  valoresCampos: Record<string, unknown>,
  tipo: TipoCampo
): unknown {
  const campo = campoPorTipo(campos, tipo);
  if (!campo) return undefined;
  return valoresCampos[campo.id];
}

export function stringArray(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}
