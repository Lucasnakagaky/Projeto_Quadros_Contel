import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceStrict, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function tempoRelativo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `há ${formatDistanceToNow(d, { locale: ptBR })}`;
}

/** Duração decorrida desde `iso` até agora, ex.: "2 horas", "3 dias" (sem prefixo). */
export function duracao(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceStrict(d, new Date(), { locale: ptBR });
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Duração humana entre duas datas, ex.: "4 minutos", "2 horas", "3 dias". */
export function duracaoEntre(inicio: Date, fim: Date): string {
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return "";
  return formatDistanceStrict(inicio, fim, { locale: ptBR });
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Data curta no formato "jul 30". */
export function dataCurta(data: Date): string {
  if (Number.isNaN(data.getTime())) return "";
  return `${MESES_ABREV[data.getMonth()]} ${data.getDate()}`;
}

const MESES_EXTENSO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Data por extenso no formato "30 de Julho de 2026". */
export function dataPorExtenso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} de ${MESES_EXTENSO[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Escolhe uma cor da paleta de forma determinística a partir de um id (mesmo id = mesma cor sempre). */
export function corDeterministica(id: string, paleta: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return paleta[hash % paleta.length];
}
