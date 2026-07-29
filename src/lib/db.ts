import { promises as fs } from "fs";
import path from "path";
import { DbSchema } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function emptyDb(): DbSchema {
  return {
    usuarios: [
      {
        id: "user-1",
        nome: "Você",
        email: "voce@exemplo.com",
        corAvatar: "#2563eb",
      },
    ],
    boards: [],
    listas: [],
    cards: [],
    checklists: [],
    comentarios: [],
    anexos: [],
    etiquetas: [],
    templates: [
      { id: "tpl-1", nome: "Bug", titulo: "[Bug] ", descricao: "Descreva o passo a passo para reproduzir o problema." },
      { id: "tpl-2", nome: "Tarefa", titulo: "", descricao: "" },
      { id: "tpl-3", nome: "Reunião", titulo: "[Reunião] ", descricao: "Pauta:\n- " },
    ],
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
