import type { LucideIcon } from "lucide-react";
import { CalendarClock, CalendarPlus, Clock, History, Tag, Type, User, Workflow } from "lucide-react";
import { Campo, Card, Etiqueta, Fase, Usuario } from "@/lib/types";
import { campoPorTipo, stringArray } from "@/lib/campo-utils";

export type ColunaId =
  | "fase"
  | "titulo"
  | "criadoEm"
  | "vencimento"
  | "responsaveis"
  | "etiquetas"
  | "tempoFase"
  | "tempoPipe"
  | "atualizadoEm";

export interface ColunaCtx {
  fases: Fase[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
}

export interface ColunaDef {
  id: ColunaId;
  label: string;
  icon: LucideIcon;
  sortValue: (card: Card, ctx: ColunaCtx) => string | number;
}

export const COLUNAS: ColunaDef[] = [
  {
    id: "fase",
    label: "Fase atual",
    icon: Workflow,
    sortValue: (card, { fases }) => fases.find((f) => f.id === card.faseId)?.ordem ?? 0,
  },
  {
    id: "titulo",
    label: "Título",
    icon: Type,
    sortValue: (card) => card.titulo.toLowerCase(),
  },
  {
    id: "criadoEm",
    label: "Data de criação",
    icon: CalendarPlus,
    sortValue: (card) => new Date(card.criadoEm).getTime(),
  },
  {
    id: "vencimento",
    label: "Data de vencimento",
    icon: CalendarClock,
    sortValue: (card, { campos }) => {
      const campo = campoPorTipo(campos, "data_vencimento");
      const valor = campo ? card.valoresCampos[campo.id] : undefined;
      return typeof valor === "string" ? valor : "";
    },
  },
  {
    id: "responsaveis",
    label: "Responsáveis",
    icon: User,
    sortValue: (card, { campos, usuarios }) => {
      const campo = campoPorTipo(campos, "responsavel");
      const ids = campo ? stringArray(card.valoresCampos[campo.id]) : [];
      return (usuarios.find((u) => u.id === ids[0])?.nome ?? "").toLowerCase();
    },
  },
  {
    id: "etiquetas",
    label: "Etiquetas",
    icon: Tag,
    sortValue: (card, { campos, etiquetas }) => {
      const campo = campoPorTipo(campos, "etiquetas");
      const ids = campo ? stringArray(card.valoresCampos[campo.id]) : [];
      return (etiquetas.find((e) => e.id === ids[0])?.nome ?? "").toLowerCase();
    },
  },
  {
    id: "tempoFase",
    label: "Tempo na fase",
    icon: Clock,
    sortValue: (card) =>
      new Date(card.historico[card.historico.length - 1]?.entradaEm ?? card.criadoEm).getTime(),
  },
  {
    id: "tempoPipe",
    label: "Tempo no Pipe",
    icon: Clock,
    sortValue: (card) => new Date(card.criadoEm).getTime(),
  },
  {
    id: "atualizadoEm",
    label: "Última atualização",
    icon: History,
    sortValue: (card) => new Date(card.atualizadoEm).getTime(),
  },
];
