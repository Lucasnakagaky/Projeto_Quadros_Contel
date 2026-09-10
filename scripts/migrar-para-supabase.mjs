// =============================================================================
// Migração única: data/db.json -> Supabase (Postgres + Storage)
//
// Uso:
//   node scripts/migrar-para-supabase.mjs
//
// Pré-requisitos:
//   1. schema.sql + rls.sql + storage.sql já rodados no SQL Editor do Supabase.
//   2. .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// É IDEMPOTENTE: apaga tudo (pipes cascateiam) e reimporta. Pode rodar de novo.
// Não toca em data/db.json nem em public/uploads/ (só lê).
// =============================================================================

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------- env (.env.local, sem depender de lib externa) --------------------
const envRaw = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const env = Object.fromEntries(
  envRaw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SB || !SERVICE || SERVICE.startsWith("COLE_")) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local " +
      "(a service_role ainda está como placeholder)."
  );
  process.exit(1);
}

const sb = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
const BUCKET = "uploads";
const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"); // win-safe
const UPLOADS_DIR = path.join(RAIZ, "public", "uploads");

// ---------- helpers ---------------------------------------------------------
function die(msg, err) {
  console.error("\n✖ " + msg);
  if (err) console.error(err.message || err);
  process.exit(1);
}
async function inserir(tabela, linhas) {
  if (!linhas.length) {
    console.log(`  ${tabela.padEnd(12)} 0`);
    return;
  }
  const { error } = await sb.from(tabela).insert(linhas);
  if (error) die(`insert em ${tabela} falhou`, error);
  console.log(`  ${tabela.padEnd(12)} ${linhas.length}`);
}

// MIME por extensão (fallback quando o db.json não guardou o tipo)
const MIME = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".bmp": "image/bmp", ".svg": "image/svg+xml",
  ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".txt": "text/plain",
};

// ---------- 0. carrega o db.json -----------------------------------------------
const db = JSON.parse(await readFile(path.join(RAIZ, "data", "db.json"), "utf8"));
console.log(
  `db.json: ${db.pipes.length} pipe(s), ${db.fases.length} fases, ${db.campos.length} campos, ` +
    `${db.cards.length} cards, ${db.etiquetas.length} etiquetas, ${db.conexoes.length} conexoes, ` +
    `${db.cardLinks.length} cardLinks, ${db.checklists.length} checklists, ` +
    `${db.comentarios.length} comentarios, ${db.anexos.length} anexos`
);

// ---------- 1. reset (pipes cascateia; usuarios à parte) --------------------
console.log("\n› Limpando destino…");
for (const tabela of ["pipes", "usuarios"]) {
  const { error } = await sb.from(tabela).delete().not("id", "is", null);
  if (error) die(`limpeza de ${tabela} falhou`, error);
}

// ---------- 2. upload dos anexos para o Storage ----------------------------
// Mapa: url antiga ("/uploads/{cardId}/{arq}") -> url pública nova
console.log("\n› Subindo anexos para o Storage…");
const urlPorUrlAntiga = new Map();
let subiram = 0;
let semArquivo = 0;
for (const anexo of db.anexos) {
  const rel = anexo.url.replace(/^\/uploads\//, ""); // "{cardId}/{arq}"
  const local = path.join(UPLOADS_DIR, rel);
  if (!existsSync(local)) {
    semArquivo++;
    console.warn(`  ! arquivo não encontrado, mantendo url antiga: ${anexo.url}`);
    continue;
  }
  const buf = await readFile(local);
  const ext = path.extname(rel).toLowerCase();
  const contentType = anexo.tipo && anexo.tipo !== "application/octet-stream" ? anexo.tipo : MIME[ext] || "application/octet-stream";
  const { error } = await sb.storage.from(BUCKET).upload(rel, buf, { contentType, upsert: true });
  if (error) die(`upload de ${rel} falhou`, error);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(rel);
  urlPorUrlAntiga.set(anexo.url, data.publicUrl);
  subiram++;
}
console.log(`  ${subiram} anexos enviados, ${semArquivo} sem arquivo local`);

// -- Órfãos: <img src="/uploads/{cid}/{arq}"> no HTML dos cards/comentários que
//    NÃO têm registro em db.anexos (o registro foi perdido, mas o arquivo pode
//    estar no disco). Sobe o arquivo e mapeia, para o rewrite abaixo alcançá-lo.
const RE_UPLOAD = /\/uploads\/[0-9a-fA-F-]+\/[^"'\\)\s]+/g;
const refsNoHtml = new Set();
for (const c of db.cards)
  for (const v of Object.values(c.valoresCampos ?? {}))
    if (typeof v === "string") for (const m of v.match(RE_UPLOAD) ?? []) refsNoHtml.add(m);
for (const c of db.comentarios)
  for (const m of (c.texto ?? "").match(RE_UPLOAD) ?? []) refsNoHtml.add(m);

let orfaosEnviados = 0;
let orfaosQuebrados = 0;
for (const ref of refsNoHtml) {
  if (urlPorUrlAntiga.has(ref)) continue; // já coberto por db.anexos
  const rel = ref.replace(/^\/uploads\//, "");
  const local = path.join(UPLOADS_DIR, rel);
  if (!existsSync(local)) {
    orfaosQuebrados++;
    console.warn(`  ! <img> órfã sem arquivo no disco (fica quebrada): ${ref}`);
    continue;
  }
  const buf = await readFile(local);
  const ext = path.extname(rel).toLowerCase();
  const { error } = await sb.storage.from(BUCKET).upload(rel, buf, { contentType: MIME[ext] || "application/octet-stream", upsert: true });
  if (error) die(`upload do órfão ${rel} falhou`, error);
  urlPorUrlAntiga.set(ref, sb.storage.from(BUCKET).getPublicUrl(rel).data.publicUrl);
  orfaosEnviados++;
}
console.log(`  ${orfaosEnviados} imagens órfãs recuperadas, ${orfaosQuebrados} sem arquivo`);

// Reescreve qualquer ocorrência de url antiga dentro de um texto (HTML de card)
function trocarUrls(texto) {
  if (typeof texto !== "string") return texto;
  let out = texto;
  for (const [antiga, nova] of urlPorUrlAntiga) out = out.split(antiga).join(nova);
  return out;
}
function trocarUrlsProfundo(valor) {
  if (typeof valor === "string") return trocarUrls(valor);
  if (Array.isArray(valor)) return valor.map(trocarUrlsProfundo);
  if (valor && typeof valor === "object") {
    const o = {};
    for (const [k, v] of Object.entries(valor)) o[k] = trocarUrlsProfundo(v);
    return o;
  }
  return valor;
}

// ---------- 3. inserts em ordem de dependência ---------------------------------
console.log("\n› Inserindo linhas…");

await inserir(
  "usuarios",
  db.usuarios.map((u) => ({ id: u.id, nome: u.nome, email: u.email, cor_avatar: u.corAvatar }))
);

await inserir(
  "pipes",
  db.pipes.map((p) => ({ id: p.id, nome: p.nome, criado_em: p.criadoEm }))
);

await inserir(
  "fases",
  db.fases.map((f) => ({
    id: f.id, pipe_id: f.pipeId, nome: f.nome, cor: f.cor, ordem: f.ordem,
    eh_final: f.ehFinal, permite_criar_cards: f.permiteCriarCards,
    descricao: f.descricao ?? "", responsavel_ids: f.responsavelIds ?? [],
  }))
);

await inserir(
  "campos",
  db.campos.map((c) => ({
    id: c.id, pipe_id: c.pipeId, tipo: c.tipo, titulo: c.titulo,
    obrigatorio: c.obrigatorio, descricao: c.descricao ?? "", texto_ajuda: c.textoAjuda ?? "",
    visualizacao_compacta: c.visualizacaoCompacta, editavel_em_outras_fases: c.editavelEmOutrasFases,
    valor_unico: c.valorUnico, validacao_customizada: c.validacaoCustomizada ?? "",
    arquivado: c.arquivado, ordem: c.ordem, config: c.config ?? {},
  }))
);

await inserir(
  "etiquetas",
  db.etiquetas.map((e) => ({ id: e.id, pipe_id: e.pipeId, nome: e.nome, cor: e.cor }))
);

await inserir(
  "cards",
  db.cards.map((c) => ({
    id: c.id, pipe_id: c.pipeId, fase_id: c.faseId, titulo: c.titulo,
    valores_campos: trocarUrlsProfundo(c.valoresCampos ?? {}),
    criado_por_id: c.criadoPorId, criado_em: c.criadoEm, atualizado_em: c.atualizadoEm,
    historico: c.historico ?? [], ordem: c.ordem,
    excluido: c.excluido ?? false, excluido_em: c.excluidoEm ?? null,
  }))
);

await inserir(
  "conexoes",
  db.conexoes.map((x) => ({
    id: x.id, campo_id: x.campoId, card_pai_id: x.cardPaiId,
    card_filho_id: x.cardFilhoId, criado_em: x.criadoEm,
  }))
);

await inserir(
  "card_links",
  db.cardLinks.map((l) => ({
    id: l.id, campo_id: l.campoId, card_origem_id: l.cardOrigemId,
    card_destino_id: l.cardDestinoId, criado_em: l.criadoEm,
  }))
);

await inserir(
  "checklists",
  db.checklists.map((c) => ({ id: c.id, card_id: c.cardId, titulo: c.titulo, itens: c.itens ?? [] }))
);

await inserir(
  "comentarios",
  db.comentarios.map((c) => ({
    id: c.id, card_id: c.cardId, autor_id: c.autorId, texto: trocarUrls(c.texto), criado_em: c.criadoEm,
  }))
);

await inserir(
  "anexos",
  db.anexos.map((a) => ({
    id: a.id, card_id: a.cardId, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho,
    url: urlPorUrlAntiga.get(a.url) ?? a.url, criado_em: a.criadoEm,
  }))
);

// ---------- 4. verificação --------------------------------------------------
console.log("\n› Conferindo contagens no Supabase…");
const tabelas = {
  usuarios: db.usuarios.length, pipes: db.pipes.length, fases: db.fases.length,
  campos: db.campos.length, etiquetas: db.etiquetas.length, cards: db.cards.length,
  conexoes: db.conexoes.length, card_links: db.cardLinks.length,
  checklists: db.checklists.length, comentarios: db.comentarios.length, anexos: db.anexos.length,
};
let tudoOk = true;
for (const [t, esperado] of Object.entries(tabelas)) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  if (error) die(`count em ${t} falhou`, error);
  const ok = count === esperado;
  if (!ok) tudoOk = false;
  console.log(`  ${ok ? "OK  " : "DIF "} ${t.padEnd(12)} ${count} / ${esperado}`);
}

// nenhum src apontando para caminho RELATIVO /uploads/ deve sobrar
// (as URLs novas contêm ".../public/uploads/..." e NÃO devem contar como erro)
const RELATIVO = /src\s*=\s*\\?["']\/uploads\//; // src="/uploads/  (path relativo, o padrão ruim)
const { data: cardsHtml } = await sb.from("cards").select("id, valores_campos");
const { data: comsHtml } = await sb.from("comentarios").select("id, texto");
const cardsRuins = (cardsHtml ?? []).filter((r) => RELATIVO.test(JSON.stringify(r.valores_campos)));
const comsRuins = (comsHtml ?? []).filter((r) => RELATIVO.test(r.texto ?? ""));
const restou = cardsRuins.length > 0 || comsRuins.length > 0;
if (restou) {
  cardsRuins.forEach((r) => console.log(`     card ${r.id} ainda tem src="/uploads/`));
  comsRuins.forEach((r) => console.log(`     comentario ${r.id} ainda tem src="/uploads/`));
}
console.log(`  ${restou ? "DIF " : "OK  "} nenhum src="/uploads/" relativo restante`);

console.log(tudoOk && !restou ? "\n✔ Migração concluída." : "\n✖ Migração terminou com divergências — revise acima.");
process.exit(tudoOk && !restou ? 0 : 1);
