import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceStrict, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normaliza texto para busca: sem acentos, minúsculo e sem espaços nas pontas
 *  ("Manutenção" -> "manutencao"), para que a pesquisa ignore acento e caixa. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
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

const REGEX_DATA_PURA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Interpreta um valor de data "solto" (sem instância real de servidor por trás, como
 *  data/data_vencimento) sempre no fuso do navegador — nunca em UTC.
 *
 *  `new Date("2026-09-25")` (data pura, sem hora) é tratado pela especificação do JS
 *  como meia-noite em UTC, não meia-noite local. Formatar esse instante com
 *  `toLocaleDateString` no fuso do navegador derruba a data em 1 dia em qualquer fuso
 *  atrás de UTC (Brasil, -3). Aqui, uma data pura é montada com o construtor de
 *  componentes (`new Date(ano, mes, dia)`), que é sempre local — sem essa armadilha.
 *
 *  Um valor com horário (`YYYY-MM-DDTHH:mm`, formato nativo de `<input type="datetime-local">`)
 *  já não tem esse problema: sem `Z`/offset, o parser nativo do `Date` já interpreta como
 *  hora local. Passa direto para `new Date()`. */
export function parseDataSolta(valor: string): Date {
  const m = REGEX_DATA_PURA.exec(valor);
  if (m) {
    const [, ano, mes, dia] = m;
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }
  return new Date(valor);
}

/** Formata um valor de vencimento pra exibição: só a data para valores legados (sem
 *  horário, formato antigo `YYYY-MM-DD`) e "data às hora" para os que já têm horário. */
export function formatarVencimento(valor: string): string {
  const d = parseDataSolta(valor);
  if (Number.isNaN(d.getTime())) return "";
  const dataFmt = d.toLocaleDateString("pt-BR");
  if (REGEX_DATA_PURA.test(valor)) return dataFmt;
  const horaFmt = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dataFmt} às ${horaFmt}`;
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
