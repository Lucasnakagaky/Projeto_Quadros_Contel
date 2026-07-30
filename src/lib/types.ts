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
  | "conexao_database";

export interface CampoConfig {
  // selecao_lista / selecao_unica
  opcoes?: string[];
  // conexao_pipe
  nomeConexao?: string;
  pipeDestinoId?: string;
  modoConexao?: "criar" | "pesquisar_criar";
  cardinalidade?: "unico" | "varios";
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

export interface Conexao {
  id: string;
  campoId: string;
  cardPaiId: string;
  cardFilhoId: string;
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

export const TIPOS_CAMPO: { tipo: TipoCampo; label: string }[] = [
  { tipo: "texto_curto", label: "Texto curto" },
  { tipo: "texto_longo", label: "Texto longo" },
  { tipo: "conteudo_dinamico", label: "Conteúdo dinâmico" },
  { tipo: "anexo", label: "Anexo" },
  { tipo: "checkbox", label: "Checkbox" },
  { tipo: "responsavel", label: "Responsável" },
  { tipo: "data", label: "Data" },
  { tipo: "data_hora", label: "Data e hora" },
  { tipo: "data_vencimento", label: "Data de vencimento" },
  { tipo: "etiquetas", label: "Etiquetas" },
  { tipo: "email", label: "Email" },
  { tipo: "telefone", label: "Número de telefone" },
  { tipo: "selecao_lista", label: "Seleção de lista" },
  { tipo: "selecao_unica", label: "Seleção de única opção" },
  { tipo: "tempo", label: "Tempo" },
  { tipo: "numerico", label: "Numérico" },
  { tipo: "moeda", label: "Moeda" },
  { tipo: "documentos", label: "Documentos" },
  { tipo: "id", label: "ID" },
  { tipo: "conexao_pipe", label: "Conexão de pipe" },
  { tipo: "conexao_database", label: "Conexão de database" },
];
