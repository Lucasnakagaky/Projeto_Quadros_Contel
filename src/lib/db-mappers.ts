// Conversão linha do Postgres (snake_case) <-> objeto do app (camelCase).
// Colunas jsonb (valores_campos, historico, config, itens, responsavel_ids)
// mantêm a forma interna intacta — o app lê essas chaves como estão.

import type {
  Anexo,
  Campo,
  CampoConfig,
  Card,
  CardLink,
  Checklist,
  Comentario,
  Conexao,
  Etiqueta,
  EventoHistorico,
  Fase,
  ItemChecklist,
  Pipe,
  TipoCampo,
  Usuario,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// ---------- Usuário ----------
export const rowToUsuario = (r: Row): Usuario => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  corAvatar: r.cor_avatar,
});

// ---------- Pipe ----------
export const rowToPipe = (r: Row): Pipe => ({
  id: r.id,
  nome: r.nome,
  criadoEm: r.criado_em,
});

// ---------- Fase ----------
export const rowToFase = (r: Row): Fase => ({
  id: r.id,
  pipeId: r.pipe_id,
  nome: r.nome,
  cor: r.cor,
  ordem: r.ordem,
  ehFinal: r.eh_final,
  permiteCriarCards: r.permite_criar_cards,
  descricao: r.descricao ?? "",
  responsavelIds: (r.responsavel_ids ?? []) as string[],
});
export const faseToRow = (f: Partial<Fase>): Row => ({
  ...(f.id !== undefined && { id: f.id }),
  ...(f.pipeId !== undefined && { pipe_id: f.pipeId }),
  ...(f.nome !== undefined && { nome: f.nome }),
  ...(f.cor !== undefined && { cor: f.cor }),
  ...(f.ordem !== undefined && { ordem: f.ordem }),
  ...(f.ehFinal !== undefined && { eh_final: f.ehFinal }),
  ...(f.permiteCriarCards !== undefined && { permite_criar_cards: f.permiteCriarCards }),
  ...(f.descricao !== undefined && { descricao: f.descricao }),
  ...(f.responsavelIds !== undefined && { responsavel_ids: f.responsavelIds }),
});

// ---------- Campo ----------
export const rowToCampo = (r: Row): Campo => ({
  id: r.id,
  pipeId: r.pipe_id,
  tipo: r.tipo as TipoCampo,
  titulo: r.titulo,
  obrigatorio: r.obrigatorio,
  descricao: r.descricao ?? "",
  textoAjuda: r.texto_ajuda ?? "",
  visualizacaoCompacta: r.visualizacao_compacta,
  editavelEmOutrasFases: r.editavel_em_outras_fases,
  valorUnico: r.valor_unico,
  validacaoCustomizada: r.validacao_customizada ?? "",
  arquivado: r.arquivado,
  ordem: r.ordem,
  config: (r.config ?? {}) as CampoConfig,
});
export const campoToRow = (c: Partial<Campo>): Row => ({
  ...(c.id !== undefined && { id: c.id }),
  ...(c.pipeId !== undefined && { pipe_id: c.pipeId }),
  ...(c.tipo !== undefined && { tipo: c.tipo }),
  ...(c.titulo !== undefined && { titulo: c.titulo }),
  ...(c.obrigatorio !== undefined && { obrigatorio: c.obrigatorio }),
  ...(c.descricao !== undefined && { descricao: c.descricao }),
  ...(c.textoAjuda !== undefined && { texto_ajuda: c.textoAjuda }),
  ...(c.visualizacaoCompacta !== undefined && { visualizacao_compacta: c.visualizacaoCompacta }),
  ...(c.editavelEmOutrasFases !== undefined && { editavel_em_outras_fases: c.editavelEmOutrasFases }),
  ...(c.valorUnico !== undefined && { valor_unico: c.valorUnico }),
  ...(c.validacaoCustomizada !== undefined && { validacao_customizada: c.validacaoCustomizada }),
  ...(c.arquivado !== undefined && { arquivado: c.arquivado }),
  ...(c.ordem !== undefined && { ordem: c.ordem }),
  ...(c.config !== undefined && { config: c.config }),
});

// ---------- Card ----------
export const rowToCard = (r: Row): Card => ({
  id: r.id,
  pipeId: r.pipe_id,
  faseId: r.fase_id,
  titulo: r.titulo,
  valoresCampos: (r.valores_campos ?? {}) as Record<string, unknown>,
  criadoPorId: r.criado_por_id,
  criadoEm: r.criado_em,
  atualizadoEm: r.atualizado_em,
  historico: (r.historico ?? []) as EventoHistorico[],
  ordem: r.ordem,
  excluido: r.excluido,
  excluidoEm: r.excluido_em ?? null,
});
export const cardToRow = (c: Partial<Card>): Row => ({
  ...(c.id !== undefined && { id: c.id }),
  ...(c.pipeId !== undefined && { pipe_id: c.pipeId }),
  ...(c.faseId !== undefined && { fase_id: c.faseId }),
  ...(c.titulo !== undefined && { titulo: c.titulo }),
  ...(c.valoresCampos !== undefined && { valores_campos: c.valoresCampos }),
  ...(c.criadoPorId !== undefined && { criado_por_id: c.criadoPorId }),
  ...(c.criadoEm !== undefined && { criado_em: c.criadoEm }),
  ...(c.atualizadoEm !== undefined && { atualizado_em: c.atualizadoEm }),
  ...(c.historico !== undefined && { historico: c.historico }),
  ...(c.ordem !== undefined && { ordem: c.ordem }),
  ...(c.excluido !== undefined && { excluido: c.excluido }),
  ...(c.excluidoEm !== undefined && { excluido_em: c.excluidoEm }),
});

// ---------- Etiqueta ----------
export const rowToEtiqueta = (r: Row): Etiqueta => ({
  id: r.id,
  pipeId: r.pipe_id,
  nome: r.nome,
  cor: r.cor,
});

// ---------- Comentario ----------
export const rowToComentario = (r: Row): Comentario => ({
  id: r.id,
  cardId: r.card_id,
  autorId: r.autor_id,
  texto: r.texto,
  criadoEm: r.criado_em,
});

// ---------- Anexo ----------
export const rowToAnexo = (r: Row): Anexo => ({
  id: r.id,
  cardId: r.card_id,
  nome: r.nome,
  tipo: r.tipo,
  tamanho: r.tamanho,
  url: r.url,
  criadoEm: r.criado_em,
});

// ---------- Checklist ----------
export const rowToChecklist = (r: Row): Checklist => ({
  id: r.id,
  cardId: r.card_id,
  titulo: r.titulo,
  itens: (r.itens ?? []) as ItemChecklist[],
});

// ---------- Conexao ----------
export const rowToConexao = (r: Row): Conexao => ({
  id: r.id,
  campoId: r.campo_id,
  cardPaiId: r.card_pai_id,
  cardFilhoId: r.card_filho_id,
  criadoEm: r.criado_em,
});

// ---------- CardLink ----------
export const rowToCardLink = (r: Row): CardLink => ({
  id: r.id,
  campoId: r.campo_id,
  cardOrigemId: r.card_origem_id,
  cardDestinoId: r.card_destino_id,
  criadoEm: r.criado_em,
});
