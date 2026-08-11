import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { Campo, DbSchema, Fase, Pipe } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function seedPipe(): { pipe: Pipe; fases: Fase[]; campos: Campo[] } {
  const pipeId = uuid();
  const now = new Date().toISOString();

  const pipe: Pipe = { id: pipeId, nome: "Meu Pipe", criadoEm: now };

  const fases: Fase[] = [
    {
      id: uuid(),
      pipeId,
      nome: "Caixa de entrada",
      cor: "#06B6D4",
      ordem: 0,
      ehFinal: false,
      permiteCriarCards: true,
      descricao: "Aqui chegam os cards criados para iniciar o processo.",
      responsavelIds: [],
    },
    {
      id: uuid(),
      pipeId,
      nome: "Fazendo",
      cor: "#F97316",
      ordem: 1,
      ehFinal: false,
      permiteCriarCards: false,
      descricao: "Hora do show! Aqui ficam os cards que estão em andamento.",
      responsavelIds: [],
    },
    {
      id: uuid(),
      pipeId,
      nome: "Concluído",
      cor: "#8B5CF6",
      ordem: 2,
      ehFinal: true,
      permiteCriarCards: false,
      descricao: "Descanse em paz. Aqui ficam os cards finalizados.",
      responsavelIds: [],
    },
  ];

  const campos: Campo[] = [
    {
      id: uuid(),
      pipeId,
      tipo: "responsavel",
      titulo: "Responsável",
      obrigatorio: false,
      descricao: "",
      textoAjuda: "",
      visualizacaoCompacta: false,
      editavelEmOutrasFases: false,
      valorUnico: false,
      validacaoCustomizada: "",
      arquivado: false,
      ordem: 0,
      config: {},
    },
    {
      id: uuid(),
      pipeId,
      tipo: "data_vencimento",
      titulo: "Vencimento",
      obrigatorio: false,
      descricao: "",
      textoAjuda: "",
      visualizacaoCompacta: false,
      editavelEmOutrasFases: false,
      valorUnico: false,
      validacaoCustomizada: "",
      arquivado: false,
      ordem: 1,
      config: {},
    },
    {
      id: uuid(),
      pipeId,
      tipo: "etiquetas",
      titulo: "Etiquetas",
      obrigatorio: false,
      descricao: "",
      textoAjuda: "",
      visualizacaoCompacta: false,
      editavelEmOutrasFases: false,
      valorUnico: false,
      validacaoCustomizada: "",
      arquivado: false,
      ordem: 2,
      config: {},
    },
  ];

  return { pipe, fases, campos };
}

function emptyDb(): DbSchema {
  const { pipe, fases, campos } = seedPipe();
  return {
    usuarios: [
      {
        id: "user-1",
        nome: "Você",
        email: "voce@exemplo.com",
        corAvatar: "#2563eb",
      },
    ],
    pipes: [pipe],
    fases,
    campos,
    cards: [],
    conexoes: [],
    etiquetas: [],
    checklists: [],
    comentarios: [],
    anexos: [],
  };
}

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readDb(): Promise<DbSchema> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as DbSchema;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const db = emptyDb();
      await writeDb(db);
      return db;
    }
    throw err;
  }
}

async function persist(db: DbSchema): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function writeDb(db: DbSchema): Promise<void> {
  writeQueue = writeQueue.then(() => persist(db));
  return writeQueue as Promise<void>;
}

export async function mutateDb<T>(
  mutator: (db: DbSchema) => T | Promise<T>
): Promise<T> {
  writeQueue = writeQueue.then(async () => {
    const raw = await fs
      .readFile(DB_PATH, "utf-8")
      .catch(() => JSON.stringify(emptyDb()));
    const db = JSON.parse(raw) as DbSchema;
    const result = await mutator(db);
    await persist(db);
    return result;
  });
  return writeQueue as Promise<T>;
}

export const CURRENT_USER_ID = "user-1";
