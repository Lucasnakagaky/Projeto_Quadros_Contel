import { v4 as uuid } from "uuid";
import { mutateDb, readDb, CURRENT_USER_ID } from "./db";
import {
  Anexo,
  Campo,
  CampoConfig,
  Card,
  Checklist,
  Comentario,
  Conexao,
  Etiqueta,
  Fase,
  ItemChecklist,
  Pipe,
  TipoCampo,
  Usuario,
} from "./types";

function now() {
  return new Date().toISOString();
}

function notFound(entity: string): never {
  const err = new Error(`${entity} não encontrado`);
  (err as Error & { status?: number }).status = 404;
  throw err;
}

function badRequest(message: string): never {
  const err = new Error(message);
  (err as Error & { status?: number }).status = 400;
  throw err;
}

// ---------- Usuários ----------
export async function listUsers(): Promise<Usuario[]> {
  const db = await readDb();
  return db.usuarios;
}

// ---------- Pipes ----------
export async function listPipes(): Promise<Pipe[]> {
  const db = await readDb();
  return db.pipes.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}

export async function getPipe(id: string): Promise<Pipe> {
  const db = await readDb();
  const pipe = db.pipes.find((p) => p.id === id);
  if (!pipe) notFound("Pipe");
  return pipe;
}

export async function createPipe(nome: string): Promise<Pipe> {
  return mutateDb((db) => {
    const pipeId = uuid();
    const pipe: Pipe = { id: pipeId, nome: nome.trim(), criadoEm: now() };
    db.pipes.push(pipe);

    const fases: Fase[] = [
      { id: uuid(), pipeId, nome: "Caixa de entrada", cor: "#06B6D4", ordem: 0, ehFinal: false, permiteCriarCards: true },
      { id: uuid(), pipeId, nome: "Fazendo", cor: "#F97316", ordem: 1, ehFinal: false, permiteCriarCards: false },
      { id: uuid(), pipeId, nome: "Concluído", cor: "#8B5CF6", ordem: 2, ehFinal: true, permiteCriarCards: false },
    ];
    db.fases.push(...fases);

    const campos: Campo[] = [
      { id: uuid(), pipeId, tipo: "responsavel", titulo: "Responsável", obrigatorio: false, descricao: "", textoAjuda: "", visualizacaoCompacta: false, ordem: 0, config: {} },
      { id: uuid(), pipeId, tipo: "data_vencimento", titulo: "Vencimento", obrigatorio: false, descricao: "", textoAjuda: "", visualizacaoCompacta: false, ordem: 1, config: {} },
      { id: uuid(), pipeId, tipo: "etiquetas", titulo: "Etiquetas", obrigatorio: false, descricao: "", textoAjuda: "", visualizacaoCompacta: false, ordem: 2, config: {} },
    ];
    db.campos.push(...campos);

    return pipe;
  });
}

export async function getPipeFull(pipeId: string) {
  const db = await readDb();
  const pipe = db.pipes.find((p) => p.id === pipeId);
  if (!pipe) notFound("Pipe");
  const fases = db.fases.filter((f) => f.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
  const campos = db.campos.filter((c) => c.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
  const cards = db.cards
    .filter((c) => c.pipeId === pipeId && !c.excluido)
    .sort((a, b) => a.ordem - b.ordem);
  const etiquetas = db.etiquetas.filter((e) => e.pipeId === pipeId);
  return { pipe, fases, campos, cards, etiquetas, usuarios: db.usuarios };
}

// ---------- Fases ----------
export async function listFasesByPipe(pipeId: string): Promise<Fase[]> {
  const db = await readDb();
  return db.fases.filter((f) => f.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
}

export async function createFase(
  pipeId: string,
  input: { nome: string; ehFinal?: boolean; permiteCriarCards?: boolean }
): Promise<Fase> {
  return mutateDb((db) => {
    const pipe = db.pipes.find((p) => p.id === pipeId);
    if (!pipe) notFound("Pipe");
    const maxOrdem = db.fases
      .filter((f) => f.pipeId === pipeId)
      .reduce((max, f) => Math.max(max, f.ordem), -1);
    const fase: Fase = {
      id: uuid(),
      pipeId,
      nome: input.nome.trim(),
      cor: "#3B82F6",
      ordem: maxOrdem + 1,
      ehFinal: input.ehFinal ?? false,
      permiteCriarCards: input.permiteCriarCards ?? false,
    };
    db.fases.push(fase);
    return fase;
  });
}

export type FasePatch = Partial<Pick<Fase, "nome" | "cor" | "ehFinal" | "permiteCriarCards">>;

export async function updateFase(id: string, patch: FasePatch): Promise<Fase> {
  return mutateDb((db) => {
    const fase = db.fases.find((f) => f.id === id);
    if (!fase) notFound("Fase");
    if (patch.nome !== undefined) fase.nome = patch.nome.trim();
    if (patch.cor !== undefined) fase.cor = patch.cor;
    if (patch.ehFinal !== undefined) fase.ehFinal = patch.ehFinal;
    if (patch.permiteCriarCards !== undefined) fase.permiteCriarCards = patch.permiteCriarCards;
    return fase;
  });
}

export async function reorderFases(pipeId: string, orderedIds: string[]): Promise<Fase[]> {
  return mutateDb((db) => {
    orderedIds.forEach((id, index) => {
      const fase = db.fases.find((f) => f.id === id && f.pipeId === pipeId);
      if (fase) fase.ordem = index;
    });
    return db.fases.filter((f) => f.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
  });
}

export async function deleteFase(id: string): Promise<void> {
  return mutateDb((db) => {
    const cardIds = db.cards.filter((c) => c.faseId === id).map((c) => c.id);
    db.fases = db.fases.filter((f) => f.id !== id);
    db.cards = db.cards.filter((c) => c.faseId !== id);
    db.checklists = db.checklists.filter((c) => !cardIds.includes(c.cardId));
    db.comentarios = db.comentarios.filter((c) => !cardIds.includes(c.cardId));
    db.anexos = db.anexos.filter((a) => !cardIds.includes(a.cardId));
    db.conexoes = db.conexoes.filter(
      (cx) => !cardIds.includes(cx.cardPaiId) && !cardIds.includes(cx.cardFilhoId)
    );
  });
}

// ---------- Campos ----------
export async function listCamposByPipe(pipeId: string): Promise<Campo[]> {
  const db = await readDb();
  return db.campos.filter((c) => c.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
}

export async function createCampo(
  pipeId: string,
  input: {
    tipo: TipoCampo;
    titulo: string;
    obrigatorio?: boolean;
    descricao?: string;
    textoAjuda?: string;
    visualizacaoCompacta?: boolean;
    config?: CampoConfig;
  }
): Promise<Campo> {
  return mutateDb((db) => {
    const pipe = db.pipes.find((p) => p.id === pipeId);
    if (!pipe) notFound("Pipe");
    const maxOrdem = db.campos
      .filter((c) => c.pipeId === pipeId)
      .reduce((max, c) => Math.max(max, c.ordem), -1);
    const campo: Campo = {
      id: uuid(),
      pipeId,
      tipo: input.tipo,
      titulo: input.titulo.trim(),
      obrigatorio: input.obrigatorio ?? false,
      descricao: input.descricao?.trim() ?? "",
      textoAjuda: input.textoAjuda?.trim() ?? "",
      visualizacaoCompacta: input.visualizacaoCompacta ?? false,
      ordem: maxOrdem + 1,
      config: input.config ?? {},
    };
    db.campos.push(campo);
    return campo;
  });
}

export type CampoPatch = Partial<
  Pick<Campo, "titulo" | "obrigatorio" | "descricao" | "textoAjuda" | "visualizacaoCompacta" | "config">
>;

export async function updateCampo(id: string, patch: CampoPatch): Promise<Campo> {
  return mutateDb((db) => {
    const campo = db.campos.find((c) => c.id === id);
    if (!campo) notFound("Campo");
    if (patch.titulo !== undefined) campo.titulo = patch.titulo.trim();
    if (patch.obrigatorio !== undefined) campo.obrigatorio = patch.obrigatorio;
    if (patch.descricao !== undefined) campo.descricao = patch.descricao;
    if (patch.textoAjuda !== undefined) campo.textoAjuda = patch.textoAjuda;
    if (patch.visualizacaoCompacta !== undefined) campo.visualizacaoCompacta = patch.visualizacaoCompacta;
    if (patch.config !== undefined) campo.config = { ...campo.config, ...patch.config };
    return campo;
  });
}

export async function reorderCampos(pipeId: string, orderedIds: string[]): Promise<Campo[]> {
  return mutateDb((db) => {
    orderedIds.forEach((id, index) => {
      const campo = db.campos.find((c) => c.id === id && c.pipeId === pipeId);
      if (campo) campo.ordem = index;
    });
    return db.campos.filter((c) => c.pipeId === pipeId).sort((a, b) => a.ordem - b.ordem);
  });
}

export async function deleteCampo(id: string): Promise<void> {
  return mutateDb((db) => {
    db.campos = db.campos.filter((c) => c.id !== id);
    db.cards.forEach((card) => {
      delete card.valoresCampos[id];
    });
  });
}

// ---------- Cards ----------
export async function listCardsByPipe(pipeId: string): Promise<Card[]> {
  const db = await readDb();
  return db.cards
    .filter((c) => c.pipeId === pipeId && !c.excluido)
    .sort((a, b) => a.ordem - b.ordem);
}

export async function listTrashByPipe(pipeId: string): Promise<Card[]> {
  const db = await readDb();
  return db.cards
    .filter((c) => c.pipeId === pipeId && c.excluido)
    .sort((a, b) => (a.excluidoEm && b.excluidoEm ? (a.excluidoEm < b.excluidoEm ? 1 : -1) : 0));
}

export async function getCard(id: string): Promise<Card> {
  const db = await readDb();
  const card = db.cards.find((c) => c.id === id);
  if (!card) notFound("Card");
  return card;
}

export async function createCard(input: {
  pipeId: string;
  faseId: string;
  titulo: string;
  valoresCampos?: Record<string, unknown>;
}): Promise<Card> {
  return mutateDb((db) => {
    const fase = db.fases.find((f) => f.id === input.faseId && f.pipeId === input.pipeId);
    if (!fase) notFound("Fase");
    const maxOrdem = db.cards
      .filter((c) => c.faseId === input.faseId)
      .reduce((max, c) => Math.max(max, c.ordem), -1);
    const card: Card = {
      id: uuid(),
      pipeId: input.pipeId,
      faseId: input.faseId,
      titulo: input.titulo.trim() || "Novo card",
      valoresCampos: input.valoresCampos ?? {},
      criadoPorId: CURRENT_USER_ID,
      criadoEm: now(),
      historico: [{ id: uuid(), faseId: fase.id, faseNome: fase.nome, entradaEm: now() }],
      ordem: maxOrdem + 1,
      excluido: false,
      excluidoEm: null,
    };
    db.cards.push(card);
    return card;
  });
}

export type CardPatch = Partial<Pick<Card, "titulo" | "valoresCampos">>;

export async function updateCard(id: string, patch: CardPatch): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === id);
    if (!card) notFound("Card");
    if (patch.titulo !== undefined) card.titulo = patch.titulo.trim() || card.titulo;
    if (patch.valoresCampos !== undefined) {
      card.valoresCampos = { ...card.valoresCampos, ...patch.valoresCampos };
    }
    return card;
  });
}

export async function moveCard(
  cardId: string,
  targetFaseId: string,
  targetIndex: number
): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) notFound("Card");
    const targetFase = db.fases.find((f) => f.id === targetFaseId);
    if (!targetFase) notFound("Fase");

    const mudouFase = card.faseId !== targetFaseId;
    card.faseId = targetFaseId;
    if (mudouFase) {
      card.historico.push({
        id: uuid(),
        faseId: targetFase.id,
        faseNome: targetFase.nome,
        entradaEm: now(),
      });
    }

    const siblings = db.cards
      .filter((c) => c.faseId === targetFaseId && c.id !== cardId)
      .sort((a, b) => a.ordem - b.ordem);

    siblings.splice(targetIndex, 0, card);
    siblings.forEach((c, index) => {
      c.ordem = index;
    });

    return card;
  });
}

export async function reorderCardsWithinFase(
  faseId: string,
  orderedIds: string[]
): Promise<void> {
  return mutateDb((db) => {
    orderedIds.forEach((id, index) => {
      const card = db.cards.find((c) => c.id === id && c.faseId === faseId);
      if (card) card.ordem = index;
    });
  });
}

export async function trashCard(id: string): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === id);
    if (!card) notFound("Card");
    card.excluido = true;
    card.excluidoEm = now();
    return card;
  });
}

export async function restoreCard(id: string): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === id);
    if (!card) notFound("Card");
    card.excluido = false;
    card.excluidoEm = null;
    return card;
  });
}

export async function permanentDeleteCard(id: string): Promise<void> {
  return mutateDb((db) => {
    db.cards = db.cards.filter((c) => c.id !== id);
    db.checklists = db.checklists.filter((c) => c.cardId !== id);
    db.comentarios = db.comentarios.filter((c) => c.cardId !== id);
    db.anexos = db.anexos.filter((a) => a.cardId !== id);
    db.conexoes = db.conexoes.filter((cx) => cx.cardPaiId !== id && cx.cardFilhoId !== id);
  });
}

// ---------- Conexões (pai/filho) ----------
export async function listConexoesFilhos(cardId: string) {
  const db = await readDb();
  const conexoes = db.conexoes.filter((c) => c.cardPaiId === cardId);
  return conexoes.map((cx) => {
    const filho = db.cards.find((c) => c.id === cx.cardFilhoId);
    const fase = filho ? db.fases.find((f) => f.id === filho.faseId) : undefined;
    const pipe = filho ? db.pipes.find((p) => p.id === filho.pipeId) : undefined;
    return { conexao: cx, card: filho, fase, pipe };
  });
}

export async function listConexoesPais(cardId: string) {
  const db = await readDb();
  const conexoes = db.conexoes.filter((c) => c.cardFilhoId === cardId);
  return conexoes.map((cx) => {
    const pai = db.cards.find((c) => c.id === cx.cardPaiId);
    const fase = pai ? db.fases.find((f) => f.id === pai.faseId) : undefined;
    const pipe = pai ? db.pipes.find((p) => p.id === pai.pipeId) : undefined;
    return { conexao: cx, card: pai, fase, pipe };
  });
}

export async function createConexaoComNovoCard(
  campoId: string,
  cardPaiId: string,
  novoCard: { pipeId: string; faseId: string; titulo: string; valoresCampos?: Record<string, unknown> }
): Promise<{ conexao: Conexao; card: Card }> {
  return mutateDb((db) => {
    const pai = db.cards.find((c) => c.id === cardPaiId);
    if (!pai) notFound("Card pai");
    const campo = db.campos.find((c) => c.id === campoId);
    if (!campo) notFound("Campo de conexão");
    const fase = db.fases.find((f) => f.id === novoCard.faseId && f.pipeId === novoCard.pipeId);
    if (!fase) notFound("Fase");

    if (campo.config.cardinalidade === "unico") {
      const jaExiste = db.conexoes.some((c) => c.campoId === campoId && c.cardPaiId === cardPaiId);
      if (jaExiste) badRequest("Esta conexão já possui um card filho (permite apenas um)");
    }

    const maxOrdem = db.cards
      .filter((c) => c.faseId === novoCard.faseId)
      .reduce((max, c) => Math.max(max, c.ordem), -1);
    const card: Card = {
      id: uuid(),
      pipeId: novoCard.pipeId,
      faseId: novoCard.faseId,
      titulo: novoCard.titulo.trim() || "Novo card",
      valoresCampos: novoCard.valoresCampos ?? {},
      criadoPorId: CURRENT_USER_ID,
      criadoEm: now(),
      historico: [{ id: uuid(), faseId: fase.id, faseNome: fase.nome, entradaEm: now() }],
      ordem: maxOrdem + 1,
      excluido: false,
      excluidoEm: null,
    };
    db.cards.push(card);

    const conexao: Conexao = {
      id: uuid(),
      campoId,
      cardPaiId,
      cardFilhoId: card.id,
      criadoEm: now(),
    };
    db.conexoes.push(conexao);

    return { conexao, card };
  });
}

export async function createConexaoComCardExistente(
  campoId: string,
  cardPaiId: string,
  cardFilhoId: string
): Promise<Conexao> {
  return mutateDb((db) => {
    const pai = db.cards.find((c) => c.id === cardPaiId);
    if (!pai) notFound("Card pai");
    const filho = db.cards.find((c) => c.id === cardFilhoId);
    if (!filho) notFound("Card filho");
    const campo = db.campos.find((c) => c.id === campoId);
    if (!campo) notFound("Campo de conexão");
    if (cardPaiId === cardFilhoId) badRequest("Um card não pode ser conectado a si mesmo");

    if (campo.config.cardinalidade === "unico") {
      const jaExiste = db.conexoes.some((c) => c.campoId === campoId && c.cardPaiId === cardPaiId);
      if (jaExiste) badRequest("Esta conexão já possui um card filho (permite apenas um)");
    }

    const duplicada = db.conexoes.some(
      (c) => c.campoId === campoId && c.cardPaiId === cardPaiId && c.cardFilhoId === cardFilhoId
    );
    if (duplicada) badRequest("Este card já está conectado");

    const conexao: Conexao = { id: uuid(), campoId, cardPaiId, cardFilhoId, criadoEm: now() };
    db.conexoes.push(conexao);
    return conexao;
  });
}

export async function removeConexao(id: string): Promise<void> {
  return mutateDb((db) => {
    db.conexoes = db.conexoes.filter((c) => c.id !== id);
  });
}

export async function temFilhos(cardId: string): Promise<boolean> {
  const db = await readDb();
  return db.conexoes.some((c) => c.cardPaiId === cardId);
}

// ---------- Etiquetas ----------
export async function listLabelsByPipe(pipeId: string): Promise<Etiqueta[]> {
  const db = await readDb();
  return db.etiquetas.filter((e) => e.pipeId === pipeId);
}

export async function createLabel(pipeId: string, nome: string, cor: string): Promise<Etiqueta> {
  return mutateDb((db) => {
    const etiqueta: Etiqueta = { id: uuid(), pipeId, nome: nome.trim(), cor };
    db.etiquetas.push(etiqueta);
    return etiqueta;
  });
}

export async function updateLabel(
  id: string,
  patch: Partial<Pick<Etiqueta, "nome" | "cor">>
): Promise<Etiqueta> {
  return mutateDb((db) => {
    const etiqueta = db.etiquetas.find((e) => e.id === id);
    if (!etiqueta) notFound("Etiqueta");
    if (patch.nome !== undefined) etiqueta.nome = patch.nome.trim();
    if (patch.cor !== undefined) etiqueta.cor = patch.cor;
    return etiqueta;
  });
}

export async function deleteLabel(id: string): Promise<void> {
  return mutateDb((db) => {
    db.etiquetas = db.etiquetas.filter((e) => e.id !== id);
    db.cards.forEach((c) => {
      Object.keys(c.valoresCampos).forEach((campoId) => {
        const valor = c.valoresCampos[campoId];
        if (Array.isArray(valor) && valor.includes(id)) {
          c.valoresCampos[campoId] = valor.filter((v) => v !== id);
        }
      });
    });
  });
}

// ---------- Checklists ----------
export async function listChecklistsByCard(cardId: string): Promise<Checklist[]> {
  const db = await readDb();
  return db.checklists.filter((c) => c.cardId === cardId);
}

export async function createChecklist(cardId: string, titulo: string): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist: Checklist = {
      id: uuid(),
      cardId,
      titulo: titulo.trim() || "Checklist",
      itens: [],
    };
    db.checklists.push(checklist);
    return checklist;
  });
}

export async function deleteChecklist(id: string): Promise<void> {
  return mutateDb((db) => {
    db.checklists = db.checklists.filter((c) => c.id !== id);
  });
}

export async function addChecklistItem(checklistId: string, texto: string): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist = db.checklists.find((c) => c.id === checklistId);
    if (!checklist) notFound("Checklist");
    const item: ItemChecklist = { id: uuid(), texto: texto.trim(), concluido: false };
    checklist.itens.push(item);
    return checklist;
  });
}

export async function toggleChecklistItem(checklistId: string, itemId: string): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist = db.checklists.find((c) => c.id === checklistId);
    if (!checklist) notFound("Checklist");
    const item = checklist.itens.find((i) => i.id === itemId);
    if (!item) notFound("Item");
    item.concluido = !item.concluido;
    return checklist;
  });
}

export async function deleteChecklistItem(checklistId: string, itemId: string): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist = db.checklists.find((c) => c.id === checklistId);
    if (!checklist) notFound("Checklist");
    checklist.itens = checklist.itens.filter((i) => i.id !== itemId);
    return checklist;
  });
}

// ---------- Comentários ----------
export async function listCommentsByCard(cardId: string): Promise<Comentario[]> {
  const db = await readDb();
  return db.comentarios
    .filter((c) => c.cardId === cardId)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1));
}

export async function addComment(
  cardId: string,
  texto: string,
  autorId = CURRENT_USER_ID
): Promise<Comentario> {
  return mutateDb((db) => {
    const comentario: Comentario = { id: uuid(), cardId, autorId, texto: texto.trim(), criadoEm: now() };
    db.comentarios.push(comentario);
    return comentario;
  });
}

export async function deleteComment(id: string): Promise<void> {
  return mutateDb((db) => {
    db.comentarios = db.comentarios.filter((c) => c.id !== id);
  });
}

// ---------- Anexos ----------
export async function listAttachmentsByCard(cardId: string): Promise<Anexo[]> {
  const db = await readDb();
  return db.anexos.filter((a) => a.cardId === cardId);
}

export async function addAttachment(input: {
  cardId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
}): Promise<Anexo> {
  return mutateDb((db) => {
    const anexo: Anexo = { id: uuid(), criadoEm: now(), ...input };
    db.anexos.push(anexo);
    return anexo;
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  return mutateDb((db) => {
    db.anexos = db.anexos.filter((a) => a.id !== id);
  });
}
