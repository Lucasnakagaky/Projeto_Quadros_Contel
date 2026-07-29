export interface Usuario {
  id: string;
  nome: string;
  email: string;
  corAvatar: string;
}

export interface ItemChecklist {
  id: string;
  texto: string;
  concluido: boolean;
}

export interface Checklist {
  id: string;
  cardId: string;
  titulo: string;
  itens: ItemChecklist[];
}

export interface Comentario {
  id: string;
  cardId: string;
  autorId: string;
  texto: string;
  criadoEm: string;
}

export interface Anexo {
  id: string;
  cardId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  criadoEm: string;
}

export interface Etiqueta {
  id: string;
  boardId: string;
  nome: string;
  cor: string;
}

export interface Card {
  id: string;
  listId: string;
  boardId: string;
  titulo: string;
  descricao: string;
  concluido: boolean;
  dataInicio: string | null;
  duracaoHoras: number | null;
  duracaoDias: number | null;
  dataEntregaPrevista: string | null;
  ordem: number;
  etiquetaIds: string[];
  responsavelIds: string[];
  predecessorIds: string[];
  criadoEm: string;
}

export interface Lista {
  id: string;
  boardId: string;
  nome: string;
  ordem: number;
}

export interface Board {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  arquivado: boolean;
  ownerId: string;
  membroIds: string[];
  criadoEm: string;
}

export interface Template {
  id: string;
  nome: string;
  titulo: string;
  descricao: string;
}

export interface DbSchema {
  usuarios: Usuario[];
  boards: Board[];
  listas: Lista[];
  cards: Card[];
  checklists: Checklist[];
  comentarios: Comentario[];
  anexos: Anexo[];
  etiquetas: Etiqueta[];
  templates: Template[];
}

export const CORES_QUADRO = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#0d9488",
  "#475569",
];

export const CORES_ETIQUETA = [
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#3b82f6",
  "#14b8a6",
  "#64748b",
];
