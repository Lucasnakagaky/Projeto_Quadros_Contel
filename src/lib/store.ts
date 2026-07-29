import { v4 as uuid } from "uuid";
import { mutateDb, readDb, CURRENT_USER_ID } from "./db";
import {
  Anexo,
  Board,
  Card,
  Checklist,
  Comentario,
  Etiqueta,
  ItemChecklist,
  Lista,
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

// ---------- Usuários ----------
export async function listUsers(): Promise<Usuario[]> {
  const db = await readDb();
  return db.usuarios;
}

// ---------- Boards ----------
export async function listBoards(arquivado = false): Promise<Board[]> {
  const db = await readDb();
  return db.boards
    .filter((b) => b.arquivado === arquivado)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}

export async function getBoard(id: string): Promise<Board> {
  const db = await readDb();
  const board = db.boards.find((b) => b.id === id);
  if (!board) notFound("Quadro");
  return board;
}

export async function createBoard(input: {
  nome: string;
  descricao: string;
  cor: string;
}): Promise<Board> {
  return mutateDb((db) => {
    const board: Board = {
      id: uuid(),
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() ?? "",
      cor: input.cor,
      arquivado: false,
      ownerId: CURRENT_USER_ID,
      membroIds: [CURRENT_USER_ID],
      criadoEm: now(),
    };
    db.boards.push(board);
    return board;
  });
}

export async function updateBoard(
  id: string,
  patch: Partial<Pick<Board, "nome" | "descricao" | "cor" | "arquivado">>
): Promise<Board> {
  return mutateDb((db) => {
    const board = db.boards.find((b) => b.id === id);
    if (!board) notFound("Quadro");
    Object.assign(board, patch);
    return board;
  });
}

export async function deleteBoard(id: string): Promise<void> {
  return mutateDb((db) => {
    const listIds = db.listas.filter((l) => l.boardId === id).map((l) => l.id);
    const cardIds = db.cards.filter((c) => c.boardId === id).map((c) => c.id);

    db.boards = db.boards.filter((b) => b.id !== id);
    db.listas = db.listas.filter((l) => l.boardId !== id);
    db.cards = db.cards.filter((c) => c.boardId !== id);
    db.checklists = db.checklists.filter((c) => !cardIds.includes(c.cardId));
    db.comentarios = db.comentarios.filter((c) => !cardIds.includes(c.cardId));
    db.anexos = db.anexos.filter((a) => !cardIds.includes(a.cardId));
    db.etiquetas = db.etiquetas.filter((e) => e.boardId !== id);
    void listIds;
  });
}

export async function addBoardMember(
  boardId: string,
  usuario: { nome: string; email: string }
): Promise<Usuario> {
  return mutateDb((db) => {
    const board = db.boards.find((b) => b.id === boardId);
    if (!board) notFound("Quadro");
    let user = db.usuarios.find(
      (u) => u.email.toLowerCase() === usuario.email.toLowerCase()
    );
    if (!user) {
      const palette = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#16a34a", "#0d9488"];
      user = {
        id: uuid(),
        nome: usuario.nome.trim(),
        email: usuario.email.trim(),
        corAvatar: palette[db.usuarios.length % palette.length],
      };
      db.usuarios.push(user);
    }
    if (!board.membroIds.includes(user.id)) {
      board.membroIds.push(user.id);
    }
    return user;
  });
}

export async function removeBoardMember(
  boardId: string,
  userId: string
): Promise<void> {
  return mutateDb((db) => {
    const board = db.boards.find((b) => b.id === boardId);
    if (!board) notFound("Quadro");
    board.membroIds = board.membroIds.filter((id) => id !== userId);
    db.cards
      .filter((c) => c.boardId === boardId)
      .forEach((c) => {
        c.responsavelIds = c.responsavelIds.filter((id) => id !== userId);
      });
  });
}

// ---------- Listas ----------
export async function listListsByBoard(boardId: string): Promise<Lista[]> {
  const db = await readDb();
  return db.listas
    .filter((l) => l.boardId === boardId)
    .sort((a, b) => a.ordem - b.ordem);
}

export async function createList(
  boardId: string,
  nome: string
): Promise<Lista> {
  return mutateDb((db) => {
    const board = db.boards.find((b) => b.id === boardId);
    if (!board) notFound("Quadro");
    const maxOrdem = db.listas
      .filter((l) => l.boardId === boardId)
      .reduce((max, l) => Math.max(max, l.ordem), -1);
    const lista: Lista = {
      id: uuid(),
      boardId,
      nome: nome.trim(),
      ordem: maxOrdem + 1,
    };
    db.listas.push(lista);
    return lista;
  });
}

export async function renameList(id: string, nome: string): Promise<Lista> {
  return mutateDb((db) => {
    const lista = db.listas.find((l) => l.id === id);
    if (!lista) notFound("Lista");
    lista.nome = nome.trim();
    return lista;
  });
}

export async function reorderLists(
  boardId: string,
  orderedIds: string[]
): Promise<Lista[]> {
  return mutateDb((db) => {
    orderedIds.forEach((id, index) => {
      const lista = db.listas.find((l) => l.id === id && l.boardId === boardId);
      if (lista) lista.ordem = index;
    });
    return db.listas
      .filter((l) => l.boardId === boardId)
      .sort((a, b) => a.ordem - b.ordem);
  });
}

export async function deleteList(id: string): Promise<void> {
  return mutateDb((db) => {
    const cardIds = db.cards.filter((c) => c.listId === id).map((c) => c.id);
    db.listas = db.listas.filter((l) => l.id !== id);
    db.cards = db.cards.filter((c) => c.listId !== id);
    db.checklists = db.checklists.filter((c) => !cardIds.includes(c.cardId));
    db.comentarios = db.comentarios.filter((c) => !cardIds.includes(c.cardId));
    db.anexos = db.anexos.filter((a) => !cardIds.includes(a.cardId));
    db.cards.forEach((c) => {
      c.predecessorIds = c.predecessorIds.filter((pid) => !cardIds.includes(pid));
    });
  });
}

// ---------- Cards ----------
export async function listCardsByBoard(boardId: string): Promise<Card[]> {
  const db = await readDb();
  return db.cards
    .filter((c) => c.boardId === boardId)
    .sort((a, b) => a.ordem - b.ordem);
}

export async function getCard(id: string): Promise<Card> {
  const db = await readDb();
  const card = db.cards.find((c) => c.id === id);
  if (!card) notFound("Card");
  return card;
}

export async function createCard(input: {
  listId: string;
  titulo: string;
  descricao?: string;
}): Promise<Card> {
  return mutateDb((db) => {
    const lista = db.listas.find((l) => l.id === input.listId);
    if (!lista) notFound("Lista");
    const maxOrdem = db.cards
      .filter((c) => c.listId === input.listId)
      .reduce((max, c) => Math.max(max, c.ordem), -1);
    const card: Card = {
      id: uuid(),
      listId: input.listId,
      boardId: lista.boardId,
      titulo: input.titulo.trim(),
      descricao: input.descricao?.trim() ?? "",
      concluido: false,
      dataInicio: null,
      duracaoHoras: null,
      duracaoDias: null,
      dataEntregaPrevista: null,
      ordem: maxOrdem + 1,
      etiquetaIds: [],
      responsavelIds: [],
      predecessorIds: [],
      criadoEm: now(),
    };
    db.cards.push(card);
    return card;
  });
}

export type CardPatch = Partial<
  Pick<
    Card,
    | "titulo"
    | "descricao"
    | "concluido"
    | "dataInicio"
    | "duracaoHoras"
    | "duracaoDias"
    | "dataEntregaPrevista"
    | "etiquetaIds"
    | "responsavelIds"
    | "predecessorIds"
  >
>;

export async function updateCard(id: string, patch: CardPatch): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === id);
    if (!card) notFound("Card");
    Object.assign(card, patch);
    return card;
  });
}

export async function moveCard(
  cardId: string,
  targetListId: string,
  targetIndex: number
): Promise<void> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) notFound("Card");
    const targetList = db.listas.find((l) => l.id === targetListId);
    if (!targetList) notFound("Lista");

    card.listId = targetListId;

    const siblings = db.cards
      .filter((c) => c.listId === targetListId && c.id !== cardId)
      .sort((a, b) => a.ordem - b.ordem);

    siblings.splice(targetIndex, 0, card);
    siblings.forEach((c, index) => {
      c.ordem = index;
    });
  });
}

export async function reorderCardsWithinList(
  listId: string,
  orderedIds: string[]
): Promise<void> {
  return mutateDb((db) => {
    orderedIds.forEach((id, index) => {
      const card = db.cards.find((c) => c.id === id && c.listId === listId);
      if (card) card.ordem = index;
    });
  });
}

export async function deleteCard(id: string): Promise<void> {
  return mutateDb((db) => {
    db.cards = db.cards.filter((c) => c.id !== id);
    db.checklists = db.checklists.filter((c) => c.cardId !== id);
    db.comentarios = db.comentarios.filter((c) => c.cardId !== id);
    db.anexos = db.anexos.filter((a) => a.cardId !== id);
    db.cards.forEach((c) => {
      c.predecessorIds = c.predecessorIds.filter((pid) => pid !== id);
    });
  });
}

// ---------- Checklists ----------
export async function listChecklistsByCard(cardId: string): Promise<Checklist[]> {
  const db = await readDb();
  return db.checklists.filter((c) => c.cardId === cardId);
}

export async function createChecklist(
  cardId: string,
  titulo: string
): Promise<Checklist> {
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

export async function addChecklistItem(
  checklistId: string,
  texto: string
): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist = db.checklists.find((c) => c.id === checklistId);
    if (!checklist) notFound("Checklist");
    const item: ItemChecklist = { id: uuid(), texto: texto.trim(), concluido: false };
    checklist.itens.push(item);
    return checklist;
  });
}

export async function toggleChecklistItem(
  checklistId: string,
  itemId: string
): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist = db.checklists.find((c) => c.id === checklistId);
    if (!checklist) notFound("Checklist");
    const item = checklist.itens.find((i) => i.id === itemId);
    if (!item) notFound("Item");
    item.concluido = !item.concluido;
    return checklist;
  });
}

export async function deleteChecklistItem(
  checklistId: string,
  itemId: string
): Promise<Checklist> {
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
    const comentario: Comentario = {
      id: uuid(),
      cardId,
      autorId,
      texto: texto.trim(),
      criadoEm: now(),
    };
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

// ---------- Etiquetas ----------
export async function listLabelsByBoard(boardId: string): Promise<Etiqueta[]> {
  const db = await readDb();
  return db.etiquetas.filter((e) => e.boardId === boardId);
}

export async function createLabel(
  boardId: string,
  nome: string,
  cor: string
): Promise<Etiqueta> {
  return mutateDb((db) => {
    const etiqueta: Etiqueta = { id: uuid(), boardId, nome: nome.trim(), cor };
    db.etiquetas.push(etiqueta);
    return etiqueta;
  });
}

export async function deleteLabel(id: string): Promise<void> {
  return mutateDb((db) => {
    db.etiquetas = db.etiquetas.filter((e) => e.id !== id);
    db.cards.forEach((c) => {
      c.etiquetaIds = c.etiquetaIds.filter((lid) => lid !== id);
    });
  });
}

export async function toggleCardLabel(
  cardId: string,
  labelId: string
): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) notFound("Card");
    if (card.etiquetaIds.includes(labelId)) {
      card.etiquetaIds = card.etiquetaIds.filter((id) => id !== labelId);
    } else {
      card.etiquetaIds.push(labelId);
    }
    return card;
  });
}

export async function toggleCardPredecessor(
  cardId: string,
  predecessorId: string
): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) notFound("Card");
    if (cardId === predecessorId) {
      const err = new Error("Um card não pode ser predecessor de si mesmo");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    if (card.predecessorIds.includes(predecessorId)) {
      card.predecessorIds = card.predecessorIds.filter((id) => id !== predecessorId);
    } else {
      card.predecessorIds.push(predecessorId);
    }
    return card;
  });
}

export async function toggleCardAssignee(
  cardId: string,
  userId: string
): Promise<Card> {
  return mutateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) notFound("Card");
    if (card.responsavelIds.includes(userId)) {
      card.responsavelIds = card.responsavelIds.filter((id) => id !== userId);
    } else {
      card.responsavelIds.push(userId);
    }
    return card;
  });
}
