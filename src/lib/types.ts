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
  pipeId: string;
  nome: string;
  cor: string;
}

export type TipoCampo =
  | "texto_curto"
  | "texto_longo"
  | "texto_formatado"
  | "conteudo_dinamico"
  | "anexo"
  | "checkbox"
  | "responsavel"
  | "data"
  | "data_hora"
  | "data_vencimento"
  | "etiquetas"
  | "email"
  | "telefone"
  | "selecao_lista"
  | "selecao_unica"
  | "tempo"
  | "numerico"
  | "moeda"
  | "documentos"
  | "id"
  | "conexao_pipe"
  | "conexao_database"
  | "cards_vinculados";

export interface CampoConfig {
  // selecao_lista / selecao_unica
  opcoes?: string[];
  // conexao_pipe
  nomeConexao?: string;
  pipeDestinoId?: string;
  modoConexao?: "criar" | "pesquisar_criar";
  cardinalidade?: "unico" | "varios";
  // moeda
  moeda?: string;
  // conexao_database
  identificadorDatabase?: string;
  campoIdentificador?: string;
  // cards_vinculados — reaproveita `cardinalidade` acima (único/vários).
  // Quando true (padrão), o vínculo aparece nos dois cards; quando false, só no card de origem.
  bidirecional?: boolean;
}

export interface Campo {
  id: string;
  pipeId: string;
  tipo: TipoCampo;
  titulo: string;
  obrigatorio: boolean;
  descricao: string;
  textoAjuda: string;
  visualizacaoCompacta: boolean;
  /** Metadado hoje sem efeito de renderização — só existe um formulário compartilhado por pipe; passa a valer quando houver formulários por fase. */
  editavelEmOutrasFases: boolean;
  valorUnico: boolean;
  /** Regex opcional; string vazia = sem validação customizada. */
  validacaoCustomizada: string;
  arquivado: boolean;
  ordem: number;
  config: CampoConfig;
}

export interface Fase {
  id: string;
  pipeId: string;
  nome: string;
  cor: string;
  ordem: number;
  ehFinal: boolean;
  permiteCriarCards: boolean;
  descricao: string;
  responsavelIds: string[];
}

export interface Pipe {
  id: string;
  nome: string;
  criadoEm: string;
}

export interface EventoHistorico {
  id: string;
  faseId: string;
  faseNome: string;
  entradaEm: string;
}

/** Referência leve a um card relacionado (pai ou filho), usada para exibir o nome real na face do card no Kanban. */
export interface CardRelacionado {
  id: string;
  titulo: string;
}

export interface Conexao {
  id: string;
  campoId: string;
  cardPaiId: string;
  cardFilhoId: string;
  criadoEm: string;
}

/**
 * Vínculo entre dois cards do mesmo pipe (campo "Cards Vinculados"), sem relação de
 * hierarquia (diferente de Conexao, que é pai/filho e pode cruzar pipes). Guardamos uma
 * única linha por par de cards — quando `campo.config.bidirecional` é true, o vínculo é
 * resolvido nos dois sentidos na leitura (ver listCardLinksByCard em store.ts), então não
 * há necessidade de duplicar a linha para cada direção.
 */
export interface CardLink {
  id: string;
  campoId: string;
  cardOrigemId: string;
  cardDestinoId: string;
  criadoEm: string;
}

export interface Card {
  id: string;
  pipeId: string;
  faseId: string;
  titulo: string;
  valoresCampos: Record<string, unknown>;
  criadoPorId: string;
  criadoEm: string;
  atualizadoEm: string;
  historico: EventoHistorico[];
  ordem: number;
  excluido: boolean;
  excluidoEm: string | null;
}

export interface DbSchema {
  usuarios: Usuario[];
  pipes: Pipe[];
  fases: Fase[];
  campos: Campo[];
  cards: Card[];
  conexoes: Conexao[];
  cardLinks: CardLink[];
  etiquetas: Etiqueta[];
  checklists: Checklist[];
  comentarios: Comentario[];
  anexos: Anexo[];
}

export const CORES_FASE = [
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#F43F5E",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#10B981",
  "#64748B",
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

export type GrupoTipoCampo = "campo" | "conexao";

export const TIPOS_CAMPO: { tipo: TipoCampo; label: string; grupo: GrupoTipoCampo }[] = [
  { tipo: "texto_curto", label: "Texto curto", grupo: "campo" },
  { tipo: "texto_longo", label: "Texto longo", grupo: "campo" },
  { tipo: "texto_formatado", label: "Texto formatado", grupo: "campo" },
  { tipo: "conteudo_dinamico", label: "Conteúdo dinâmico", grupo: "campo" },
  { tipo: "anexo", label: "Anexo", grupo: "campo" },
  { tipo: "checkbox", label: "Checkbox", grupo: "campo" },
  { tipo: "responsavel", label: "Responsável", grupo: "campo" },
  { tipo: "data", label: "Data", grupo: "campo" },
  { tipo: "data_hora", label: "Data e hora", grupo: "campo" },
  { tipo: "data_vencimento", label: "Data de vencimento", grupo: "campo" },
  { tipo: "etiquetas", label: "Etiquetas", grupo: "campo" },
  { tipo: "email", label: "Email", grupo: "campo" },
  { tipo: "telefone", label: "Número de telefone", grupo: "campo" },
  { tipo: "selecao_lista", label: "Seleção de lista", grupo: "campo" },
  { tipo: "selecao_unica", label: "Seleção de única opção", grupo: "campo" },
  { tipo: "tempo", label: "Tempo", grupo: "campo" },
  { tipo: "numerico", label: "Numérico", grupo: "campo" },
  { tipo: "moeda", label: "Moeda", grupo: "campo" },
  { tipo: "documentos", label: "Documentos", grupo: "campo" },
  { tipo: "id", label: "ID", grupo: "campo" },
  { tipo: "conexao_pipe", label: "Conexão de pipe", grupo: "conexao" },
  { tipo: "conexao_database", label: "Conexão de database", grupo: "conexao" },
  { tipo: "cards_vinculados", label: "Cards vinculados", grupo: "conexao" },
];
