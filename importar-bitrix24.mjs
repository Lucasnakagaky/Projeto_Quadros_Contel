// =============================================================================
// Importação: bitrix24_tasks_export.json -> Supabase (APPEND, não apaga nada)
//
// Uso (na raiz do projeto):
//   node importar-bitrix24.mjs                 -> DRY-RUN (só mostra, não grava)
//   node importar-bitrix24.mjs --apply         -> grava no Supabase
//   node importar-bitrix24.mjs --json=CAMINHO  -> caminho do JSON exportado
//
// O JSON é procurado em: --json, ./, ./data/, ~/Downloads/.
// Requer .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// Regras:
//   - Nunca apaga nem edita card existente; só insere cards novos.
//   - Não insere se já existe card com título igual OU muito parecido
//     (vai para a lista "revisar" do relatório).
//   - Títulos repetidos dentro do próprio JSON: só o primeiro é importado.
//   - Etiquetas do Bitrix casam com as existentes ignorando "#" e caixa.
//   - Descrição vira HTML no subset aceito pelo app (sanitize-html.ts).
//   - Gera migracao-bitrix-ledger.json (bitrixId -> cardId) ao aplicar.
// =============================================================================

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const jsonArg = process.argv.find((a) => a.startsWith("--json="))?.slice(7);
// --incluir=823,957: libera da lista "revisar" (quase-duplicados) esses IDs do Bitrix
const incluirArg = process.argv.find((a) => a.startsWith("--incluir="))?.slice(10) ?? "";
const INCLUIR = new Set(incluirArg.split(",").map((s) => s.trim()).filter(Boolean));
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------- configurações ------------------------------------------------------
const PIPE_ID = "2d6ade83-8f3b-4eb1-a9e2-40a5e2440b36";
const STAGE_ID_ARQUIVADO = "143"; // não importar esse estágio
const LIMIAR_PARECIDO = 0.7; // similaridade (Jaccard de palavras) p/ "quase duplicado"
const LEDGER = path.join(SCRIPT_DIR, "migracao-bitrix-ledger.json");
const RELATORIO = path.join(SCRIPT_DIR, "migracao-bitrix-relatorio.json");

const BITRIX_STAGES = {
  69: "Entrada da Demanda",
  71: "Priorização",
  73: "Melhoria Contínua",
  75: "Levantamento de Requisitos",
  77: "Kick-Off",
  79: "Pendente",
  81: "Desenvolvimento",
  83: "Teste",
  85: "Deploy",
  87: "Validação de Uso",
  89: "Comunicação de Entrega",
  91: "Relatório Executivo",
  143: "Arquivado",
  145: "Concluído",
};

// ---------- helpers ------------------------------------------------------------
function die(msg, err) {
  console.error("\n❌ " + msg);
  if (err) console.error(err.message || err);
  process.exit(1);
}
const uuid = () => randomUUID();
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normTitulo = (s) =>
  semAcento(String(s ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normEtiqueta = (s) => semAcento(String(s ?? "")).toLowerCase().replace(/^#+/, "").trim();
const tokens = (s) => new Set(normTitulo(s).split(" ").filter((w) => w.length > 2));
function jaccard(a, b) {
  let i = 0;
  for (const w of a) if (b.has(w)) i++;
  return i / (a.size + b.size - i || 1);
}

// ---------- env ----------------------------------------------------------------
const envPath = [
  path.resolve(".env.local"),
  path.join(SCRIPT_DIR, ".env.local"),
  path.join(SCRIPT_DIR, "..", ".env.local"),
].find(existsSync);
const envRaw = envPath ? await readFile(envPath, "utf8") : "";
const env = Object.fromEntries(
  envRaw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SB || !SERVICE) {
  die("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local.");
}
const sb = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

// ---------- BBCode -> HTML (subset aceito pelo app) -----------------------------
// Aceito pelo sanitizador: b strong i em u ul ol li br p div span img(src do bucket).
// Links viram "texto (url)"; [img]/[DISK FILE] são descartados (arquivo não é
// transferido nesta importação; o card recebe a etiqueta TEM IMAGEM/TEM VÍDEO).
function bbcodeToHtml(text) {
  if (!text) return "";
  let h = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const lista = (tag) => (_, c) =>
    `<${tag}>${c
      .split(/\[\*\]/)
      .filter((s) => s.trim())
      .map((s) => `<li>${s.trim()}</li>`)
      .join("")}</${tag}>`;
  h = h
    .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, "")
    .replace(/\[disk file[^\]]*\]/gi, "")
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, "$2 ($1)")
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, "$1")
    .replace(/\[list=1\]([\s\S]*?)\[\/list\]/gi, lista("ol"))
    .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, lista("ul"))
    .replace(/\[\/?[a-z*]+(?:=[^\]]*)?\]/gi, ""); // [s], [color], [size], [table]...
  return h.replace(/\r?\n/g, "<br>");
}

// ---------- 0. Carrega o JSON ---------------------------------------------------
const candidatos = [
  jsonArg && path.resolve(jsonArg),
  path.resolve("bitrix24_tasks_export.json"),
  path.resolve("data", "bitrix24_tasks_export.json"),
  path.join(os.homedir(), "Downloads", "bitrix24_tasks_export.json"),
].filter(Boolean);
const jsonPath = candidatos.find(existsSync);
if (!jsonPath) die("bitrix24_tasks_export.json não encontrado. Use --json=CAMINHO.");
const tasks = JSON.parse(await readFile(jsonPath, "utf8"));
console.log(APPLY ? "⚠️  MODO --apply (vai gravar)" : "🔎 DRY-RUN (nada será gravado)");
console.log(`📋 ${tasks.length} tarefas lidas de ${jsonPath}`);

const tasksToImport = tasks.filter((t) => String(t.stageId) !== STAGE_ID_ARQUIVADO);
console.log(`   → ${tasksToImport.length} candidatas (${tasks.length - tasksToImport.length} do estágio Arquivado ignoradas)`);

// ---------- 1. Fases ------------------------------------------------------------
const { data: fases, error: fasesErr } = await sb
  .from("fases")
  .select("id, nome, ordem")
  .eq("pipe_id", PIPE_ID)
  .order("ordem");
if (fasesErr) die("Erro ao buscar fases", fasesErr);
const faseIdPorNome = new Map(fases.map((f) => [normTitulo(f.nome), f]));
const faltando = [...new Set(tasksToImport.map((t) => BITRIX_STAGES[String(t.stageId)] || "Entrada da Demanda"))].filter(
  (n) => !faseIdPorNome.has(normTitulo(n))
);
if (faltando.length) die("Fases não encontradas no app: " + faltando.join(", "));
console.log(`   ✅ ${fases.length} fases; todas as necessárias existem`);

// ---------- 2. Campos -----------------------------------------------------------
const { data: campos, error: camposErr } = await sb
  .from("campos")
  .select("id, tipo, titulo")
  .eq("pipe_id", PIPE_ID);
if (camposErr) die("Erro ao buscar campos", camposErr);
const campoEtiquetas = campos.find((c) => c.tipo === "etiquetas");
const campoDescricao = campos.find((c) => c.tipo === "texto_formatado" && c.titulo === "Descrição da Demanda");
if (!campoEtiquetas) die("Campo do tipo 'etiquetas' não encontrado no pipe");
if (!campoDescricao) die("Campo 'Descrição da Demanda' (texto_formatado) não encontrado no pipe");

// ---------- 3. Etiquetas --------------------------------------------------------
const { data: etiquetas, error: etqErr } = await sb
  .from("etiquetas")
  .select("id, nome, cor")
  .eq("pipe_id", PIPE_ID);
if (etqErr) die("Erro ao buscar etiquetas", etqErr);
const etiquetaPorChave = new Map(etiquetas.map((e) => [normEtiqueta(e.nome), e]));
const etiquetasACriar = []; // {id,nome,cor}
const CORES = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#3b82f6", "#14b8a6", "#64748b"];

function etiquetaId(nome, cor) {
  const chave = normEtiqueta(nome);
  let e = etiquetaPorChave.get(chave);
  if (!e) {
    e = { id: uuid(), nome, cor: cor || CORES[etiquetasACriar.length % CORES.length] };
    etiquetaPorChave.set(chave, e);
    etiquetasACriar.push(e);
  }
  return e.id;
}
// Tags do Bitrix que não são nomes de etiqueta úteis (ids soltos, "#", "##")
const tagUtil = (t) => /[a-zA-Z]/.test(String(t));

// ---------- 4. Cards existentes -------------------------------------------------
const { data: cardsExistentes, error: cardsErr } = await sb
  .from("cards")
  .select("id, titulo, fase_id, ordem, excluido")
  .eq("pipe_id", PIPE_ID);
if (cardsErr) die("Erro ao buscar cards", cardsErr);
const exatos = new Map(cardsExistentes.map((c) => [normTitulo(c.titulo), c]));
const existentesTok = cardsExistentes
  .filter((c) => !c.excluido && normTitulo(c.titulo) !== "novo card")
  .map((c) => ({ c, tok: tokens(c.titulo) }));
console.log(`   ${cardsExistentes.filter((c) => !c.excluido).length} cards ativos já no pipe`);

const minOrdem = new Map(fases.map((f) => [f.id, 0]));
for (const c of cardsExistentes) {
  if (!c.excluido && c.ordem != null) minOrdem.set(c.fase_id, Math.min(minOrdem.get(c.fase_id) ?? 0, c.ordem));
}

// ---------- 5. Monta os cards ---------------------------------------------------
const EXT_IMG = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|ico)$/i;
const EXT_VID = /\.(mp4|avi|mov|wmv|mkv|webm|flv|m4v|3gp)$/i;
const novos = [];
const relatorio = { importados: [], jaExistem: [], repetidosNoJson: [], revisar: [], semFase: [] };
const vistosNoJson = new Set();
const nomeEtqImg = "TEM IMAGEM";
const nomeEtqVid = "TEM VÍDEO";

for (const task of tasksToImport) {
  const chave = normTitulo(task.title);
  if (vistosNoJson.has(chave)) {
    relatorio.repetidosNoJson.push({ bitrixId: task.id, titulo: task.title });
    continue;
  }
  vistosNoJson.add(chave);

  const igual = exatos.get(chave);
  if (igual) {
    relatorio.jaExistem.push({ bitrixId: task.id, titulo: task.title, cardId: igual.id });
    continue;
  }
  const tk = tokens(task.title);
  let melhor = null;
  let melhorS = 0;
  for (const { c, tok } of existentesTok) {
    const s = jaccard(tk, tok);
    if (s > melhorS) {
      melhorS = s;
      melhor = c;
    }
  }
  if (melhor && melhorS >= LIMIAR_PARECIDO && !INCLUIR.has(String(task.id))) {
    relatorio.revisar.push({
      bitrixId: task.id,
      tituloBitrix: task.title,
      cardParecido: melhor.titulo,
      cardId: melhor.id,
      similaridade: +melhorS.toFixed(2),
    });
    continue;
  }

  const nomeFase = BITRIX_STAGES[String(task.stageId)] || "Entrada da Demanda";
  const fase = faseIdPorNome.get(normTitulo(nomeFase));

  const ids = new Set();
  for (const tag of task.tags || []) if (tagUtil(tag)) ids.add(etiquetaId(tag));

  const arquivos = Array.isArray(task.files) ? task.files : [];
  const temImagem =
    arquivos.some((f) => EXT_IMG.test(f.name || "")) || /\[img\]|\.(png|jpe?g|gif|webp)\b/i.test(task.description || "");
  const temVideo = arquivos.some((f) => EXT_VID.test(f.name || ""));
  if (temImagem) ids.add(etiquetaId(nomeEtqImg, "#f97316"));
  if (temVideo) ids.add(etiquetaId(nomeEtqVid, "#8b5cf6"));

  const valores = {};
  if (ids.size) valores[campoEtiquetas.id] = [...ids];
  valores[campoDescricao.id] = bbcodeToHtml(task.description || "");

  const agora = new Date().toISOString();
  novos.push({
    bitrixId: task.id,
    card: {
      id: uuid(),
      pipe_id: PIPE_ID,
      fase_id: fase.id,
      titulo: task.title,
      valores_campos: valores,
      criado_por_id: "user-1",
      criado_em: task.createdDate || agora,
      atualizado_em: agora,
      historico: [{ id: uuid(), faseId: fase.id, faseNome: fase.nome, entradaEm: agora }],
      ordem: 0, // definido abaixo
      excluido: false,
    },
  });
  relatorio.importados.push({ bitrixId: task.id, titulo: task.title, fase: fase.nome });
}

// Novos entram no topo da fase, mantendo a ordem do JSON (como o app faz: min-1)
const porFase = new Map();
for (const n of novos) {
  const lista = porFase.get(n.card.fase_id) || [];
  lista.push(n);
  porFase.set(n.card.fase_id, lista);
}
for (const [faseId, lista] of porFase) {
  const base = (minOrdem.get(faseId) ?? 0) - lista.length;
  lista.forEach((n, i) => (n.card.ordem = base + i));
}

// ---------- 6. Resumo -----------------------------------------------------------
console.log("\n📊 Resumo");
console.log(`   Novos a importar:           ${novos.length}`);
console.log(`   Já existem (título igual):  ${relatorio.jaExistem.length}`);
console.log(`   Repetidos dentro do JSON:   ${relatorio.repetidosNoJson.length}`);
console.log(`   Parecidos p/ revisar:       ${relatorio.revisar.length}`);
console.log(`   Etiquetas novas a criar:    ${etiquetasACriar.map((e) => e.nome).join(", ") || "nenhuma"}`);
const porFaseNome = {};
for (const r of relatorio.importados) porFaseNome[r.fase] = (porFaseNome[r.fase] || 0) + 1;
console.log("   Novos por fase:", porFaseNome);
for (const r of relatorio.revisar)
  console.log(`   ⚠️ revisar #${r.bitrixId} "${r.tituloBitrix}"  ≈  "${r.cardParecido}" (${r.similaridade})`);

await writeFile(RELATORIO, JSON.stringify(relatorio, null, 2), "utf8");
console.log(`\n📝 Relatório salvo em ${RELATORIO}`);

if (!APPLY) {
  console.log("\n🔎 DRY-RUN concluído. Nada foi gravado. Rode com --apply para gravar.");
  process.exit(0);
}
if (novos.length === 0) {
  console.log("\n✅ Nenhum card novo para inserir.");
  process.exit(0);
}

// ---------- 7. Grava ------------------------------------------------------------
if (etiquetasACriar.length) {
  const { error } = await sb
    .from("etiquetas")
    .insert(etiquetasACriar.map((e) => ({ id: e.id, pipe_id: PIPE_ID, nome: e.nome, cor: e.cor })));
  if (error) die("Erro ao criar etiquetas", error);
  console.log(`   ${etiquetasACriar.length} etiquetas criadas`);
}

const ledger = existsSync(LEDGER) ? JSON.parse(await readFile(LEDGER, "utf8")) : {};
let inseridos = 0;
for (let i = 0; i < novos.length; i += 50) {
  const lote = novos.slice(i, i + 50);
  const { error } = await sb.from("cards").insert(lote.map((n) => n.card));
  if (!error) {
    for (const n of lote) ledger[n.bitrixId] = n.card.id;
    inseridos += lote.length;
    continue;
  }
  console.error(`   ❌ Lote ${i / 50 + 1}: ${error.message} — tentando um a um`);
  for (const n of lote) {
    const { error: e2 } = await sb.from("cards").insert(n.card);
    if (e2) console.error(`   ❌ "${n.card.titulo}": ${e2.message}`);
    else {
      ledger[n.bitrixId] = n.card.id;
      inseridos++;
    }
  }
}
await writeFile(LEDGER, JSON.stringify(ledger, null, 2), "utf8");

const { count } = await sb
  .from("cards")
  .select("*", { count: "exact", head: true })
  .eq("pipe_id", PIPE_ID)
  .eq("excluido", false);
console.log(`\n   Total de cards ativos no pipe: ${count}`);
console.log(
  inseridos === novos.length
    ? `✅ Importação concluída: ${inseridos} cards. Ledger em ${LEDGER}`
    : `⚠️ Importação parcial: ${inseridos}/${novos.length} cards. Ledger em ${LEDGER}`
);
