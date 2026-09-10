import { v4 as uuid } from "uuid";
import { supabase } from "./supabase";
import {
  campoToRow,
  cardToRow,
  faseToRow,
  rowToAnexo,
  rowToCampo,
  rowToCard,
  rowToCardLink,
  rowToChecklist,
  rowToComentario,
  rowToConexao,
  rowToEtiqueta,
  rowToFase,
  rowToPipe,
  rowToUsuario,
} from "./db-mappers";
import {
  Anexo,
  Campo,
  CampoConfig,
  Card,
  CardLink,
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

/* eslint-disable @typescript-eslint/no-explicit-any */

// Usuário fixo: o app é single-user. Só serve para exibir "Criado por Você".
export const CURRENT_USER_ID = "user-1";

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

// PGRST116 = ".single()" não achou linha nenhuma.
function ehLinhaAusente(error: any): boolean {
  return error?.code === "PGRST116";
}

/** Desembrulha um resultado que DEVE ter 1 linha (senão 404 com o nome da entidade). */
function um<T>(res: { data: T | null; error: any }, entidade: string): T {
  if (res.error) {
    if (ehLinhaAusente(res.error)) notFound(entidade);
    throw new Error(res.error.message ?? "Erro no banco");
  }
  if (res.data == null) notFound(entidade);
  return res.data;
}

/** Desembrulha uma lista (0..n linhas). */
function lista<T>(res: { data: T[] | null; error: any }): T[] {
  if (res.error) throw new Error(res.error.message ?? "Erro no banco");
  return res.data ?? [];
}

/** Confere que uma mutação sem retorno de dados não falhou. */
function ok(res: { error: any }): void {
  if (res.error) throw new Error(res.error.message ?? "Erro no banco");
}

// ============================================================================
// Usuários
// ============================================================================
export async function listUsers(): Promise<Usuario[]> {
  const res = await supabase.from("usuarios").select("*");
  return lista<any>(res).map(rowToUsuario);
}

// ============================================================================
// Pipes
// ============================================================================
export async function listPipes(): Promise<Pipe[]> {
  const res = await supabase.from("pipes").select("*").order("criado_em", { ascending: false });
  return lista<any>(res).map(rowToPipe);
}

export async function getPipe(id: string): Promise<Pipe> {
  const res = await supabase.from("pipes").select("*").eq("id", id).single();
  return rowToPipe(um<any>(res, "Pipe"));
}

/** Lista de pipes com contagem de fases e de cards não-excluídos (tela "Meus Pipes"). */
export async function listPipesComContagem(): Promise<
  { pipe: Pipe; faseCount: number; cardCount: number }[]
> {
  const pipes = await listPipes();
  return Promise.all(
    pipes.map(async (pipe) => {
      const [fases, cards] = await Promise.all([
        supabase.from("fases").select("*", { count: "exact", head: true }).eq("pipe_id", pipe.id),
        supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("pipe_id", pipe.id)
          .eq("excluido", false),
      ]);
      ok(fases);
      ok(cards);
      return { pipe, faseCount: fases.count ?? 0, cardCount: cards.count ?? 0 };
    })
  );
}

export async function createPipe(nome: string): Promise<Pipe> {
  const pipeId = uuid();
  ok(await supabase.from("pipes").insert({ id: pipeId, nome: nome.trim(), criado_em: now() }));

  const fases: Fase[] = [
    { id: uuid(), pipeId, nome: "Caixa de entrada", cor: "#06B6D4", ordem: 0, ehFinal: false, permiteCriarCards: true, descricao: "Aqui chegam os cards criados para iniciar o processo.", responsavelIds: [] },
    { id: uuid(), pipeId, nome: "Fazendo", cor: "#F97316", ordem: 1, ehFinal: false, permiteCriarCards: true, descricao: "Hora do show! Aqui ficam os cards que estão em andamento.", responsavelIds: [] },
    { id: uuid(), pipeId, nome: "Concluído", cor: "#8B5CF6", ordem: 2, ehFinal: true, permiteCriarCards: true, descricao: "Descanse em paz. Aqui ficam os cards finalizados.", responsavelIds: [] },
  ];
  ok(await supabase.from("fases").insert(fases.map(faseToRow)));

  const campos: Campo[] = [
    { id: uuid(), pipeId, tipo: "responsavel", titulo: "Responsável", obrigatorio: false, descricao: "", textoAjuda: "", visualizacaoCompacta: false, editavelEmOutrasFases: false, valorUnico: false, validacaoCustomizada: "", arquivado: false, ordem: 0, config: {} },
    { id: uuid(), pipeId, tipo: "data_vencimento", titulo: "Vencimento", obrigatorio: false, descricao: "", textoAjuda: "", visualizacaoCompacta: false, editavelEmOutrasFases: false, valorUnico: false, validacaoCustomizada: "", arquivado: false, ordem: 1, config: {} },
    { id: uuid(), pipeId, tipo: "etiquetas", titulo: "Etiquetas", obrigatorio: false, descricao: "", textoAjuda: "", visualizacaoCompacta: false, editavelEmOutrasFases: false, valorUnico: false, validacaoCustomizada: "", arquivado: false, ordem: 2, config: {} },
  ];
  ok(await supabase.from("campos").insert(campos.map(campoToRow)));

  return { id: pipeId, nome: nome.trim(), criadoEm: now() };
}

export type PipePatch = Partial<Pick<Pipe, "nome">>;

export async function updatePipe(id: string, patch: PipePatch): Promise<Pipe> {
  if (patch.nome === undefined) return getPipe(id);
  const res = await supabase
    .from("pipes")
    .update({ nome: patch.nome.trim() })
    .eq("id", id)
    .select("*")
    .single();
  return rowToPipe(um<any>(res, "Pipe"));
}

export async function deletePipe(id: string): Promise<void> {
  await getPipe(id); // 404 se não existir
  ok(await supabase.from("pipes").delete().eq("id", id)); // FK ON DELETE CASCADE limpa o resto

  // Campo "conexao_pipe" de OUTRO pipe pode apontar para este via config.pipeDestinoId
  // (valor jsonb, não é FK) — limpa defensivamente.
  const orfaos = lista<any>(
    await supabase.from("campos").select("id, config").eq("config->>pipeDestinoId", id)
  );
  for (const c of orfaos) {
    const config = { ...(c.config ?? {}) };
    delete config.pipeDestinoId;
    ok(await supabase.from("campos").update({ config }).eq("id", c.id));
  }
}

export async function getPipeFull(pipeId: string) {
  const pipe = await getPipe(pipeId);
  const [fases, campos, cards, etiquetas, usuarios] = await Promise.all([
    listFasesByPipe(pipeId),
    listCamposByPipe(pipeId),
    listCardsByPipe(pipeId),
    listLabelsByPipe(pipeId),
    listUsers(),
  ]);
  return { pipe, fases, campos, cards, etiquetas, usuarios };
}

// ============================================================================
// Fases
// ============================================================================
export async function listFasesByPipe(pipeId: string): Promise<Fase[]> {
  const res = await supabase
    .from("fases")
    .select("*")
    .eq("pipe_id", pipeId)
    .order("ordem", { ascending: true });
  return lista<any>(res).map(rowToFase);
}

async function proximaOrdemFase(pipeId: string): Promise<number> {
  const res = await supabase
    .from("fases")
    .select("ordem")
    .eq("pipe_id", pipeId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  ok(res);
  return ((res.data?.ordem as number | undefined) ?? -1) + 1;
}

export async function createFase(
  pipeId: string,
  input: { nome: string; ehFinal?: boolean; permiteCriarCards?: boolean }
): Promise<Fase> {
  await getPipe(pipeId);
  const fase: Fase = {
    id: uuid(),
    pipeId,
    nome: input.nome.trim(),
    cor: "#3B82F6",
    ordem: await proximaOrdemFase(pipeId),
    ehFinal: input.ehFinal ?? false,
    permiteCriarCards: input.permiteCriarCards ?? true,
    descricao: "",
    responsavelIds: [],
  };
  const res = await supabase.from("fases").insert(faseToRow(fase)).select("*").single();
  return rowToFase(um<any>(res, "Fase"));
}

export type FasePatch = Partial<
  Pick<Fase, "nome" | "cor" | "ehFinal" | "permiteCriarCards" | "descricao" | "responsavelIds">
>;

export async function updateFase(id: string, patch: FasePatch): Promise<Fase> {
  const limpo: FasePatch = { ...patch };
  if (limpo.nome !== undefined) limpo.nome = limpo.nome.trim();
  const row = faseToRow(limpo);
  if (Object.keys(row).length === 0) {
    const res = await supabase.from("fases").select("*").eq("id", id).single();
    return rowToFase(um<any>(res, "Fase"));
  }
  const res = await supabase.from("fases").update(row).eq("id", id).select("*").single();
  return rowToFase(um<any>(res, "Fase"));
}

export async function reorderFases(pipeId: string, orderedIds: string[]): Promise<Fase[]> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("fases").update({ ordem: index }).eq("id", id).eq("pipe_id", pipeId)
    )
  );
  return listFasesByPipe(pipeId);
}

export async function deleteFase(id: string): Promise<void> {
  ok(await supabase.from("fases").delete().eq("id", id)); // cascade limpa cards e dependências
}

export async function ensureFaseArquivada(pipeId: string): Promise<Fase> {
  await getPipe(pipeId);
  const existente = await supabase
    .from("fases")
    .select("*")
    .eq("pipe_id", pipeId)
    .eq("nome", "Arquivado")
    .maybeSingle();
  ok(existente);
  if (existente.data) return rowToFase(existente.data);

  const fase: Fase = {
    id: uuid(),
    pipeId,
    nome: "Arquivado",
    cor: "#3B82F6",
    ordem: await proximaOrdemFase(pipeId),
    ehFinal: true,
    permiteCriarCards: true,
    descricao: "",
    responsavelIds: [],
  };
  const res = await supabase.from("fases").insert(faseToRow(fase)).select("*").single();
  return rowToFase(um<any>(res, "Fase"));
}

// ============================================================================
// Campos
// ============================================================================
export async function listCamposByPipe(pipeId: string): Promise<Campo[]> {
  const res = await supabase
    .from("campos")
    .select("*")
    .eq("pipe_id", pipeId)
    .order("ordem", { ascending: true });
  return lista<any>(res).map(rowToCampo);
}

async function proximaOrdemCampo(pipeId: string): Promise<number> {
  const res = await supabase
    .from("campos")
    .select("ordem")
    .eq("pipe_id", pipeId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  ok(res);
  return ((res.data?.ordem as number | undefined) ?? -1) + 1;
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
    editavelEmOutrasFases?: boolean;
    valorUnico?: boolean;
    validacaoCustomizada?: string;
    config?: CampoConfig;
  }
): Promise<Campo> {
  await getPipe(pipeId);
  const campo: Campo = {
    id: uuid(),
    pipeId,
    tipo: input.tipo,
    titulo: input.titulo.trim(),
    obrigatorio: input.obrigatorio ?? false,
    descricao: input.descricao?.trim() ?? "",
    textoAjuda: input.textoAjuda?.trim() ?? "",
    visualizacaoCompacta: input.visualizacaoCompacta ?? false,
    editavelEmOutrasFases: input.editavelEmOutrasFases ?? false,
    valorUnico: input.valorUnico ?? false,
    validacaoCustomizada: input.validacaoCustomizada?.trim() ?? "",
    arquivado: false,
    ordem: await proximaOrdemCampo(pipeId),
    config: input.config ?? {},
  };
  const res = await supabase.from("campos").insert(campoToRow(campo)).select("*").single();
  return rowToCampo(um<any>(res, "Campo"));
}

// Escapa texto puro e troca \n por <br> — migração texto_longo -> texto_formatado.
function textoParaHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export async function ensureDescricaoDemandaCampo(pipeId: string): Promise<Campo> {
  await getPipe(pipeId);
  const existenteRes = await supabase
    .from("campos")
    .select("*")
    .eq("pipe_id", pipeId)
    .eq("titulo", "Descrição da Demanda")
    .in("tipo", ["texto_longo", "texto_formatado"])
    .limit(1)
    .maybeSingle();
  ok(existenteRes);

  if (existenteRes.data) {
    const campo = rowToCampo(existenteRes.data);
    if (campo.tipo === "texto_longo") {
      ok(await supabase.from("campos").update({ tipo: "texto_formatado" }).eq("id", campo.id));
      const cards = lista<any>(
        await supabase.from("cards").select("id, valores_campos").eq("pipe_id", pipeId)
      );
      for (const c of cards) {
        const valor = c.valores_campos?.[campo.id];
        if (typeof valor === "string" && valor) {
          const vc = { ...c.valores_campos, [campo.id]: textoParaHtml(valor) };
          ok(await supabase.from("cards").update({ valores_campos: vc }).eq("id", c.id));
        }
      }
      campo.tipo = "texto_formatado";
    }
    return campo;
  }

  const campo: Campo = {
    id: uuid(),
    pipeId,
    tipo: "texto_formatado",
    titulo: "Descrição da Demanda",
    obrigatorio: false,
    descricao: "",
    textoAjuda: "",
    visualizacaoCompacta: false,
    editavelEmOutrasFases: false,
    valorUnico: false,
    validacaoCustomizada: "",
    arquivado: false,
    ordem: await proximaOrdemCampo(pipeId),
    config: {},
  };
  const res = await supabase.from("campos").insert(campoToRow(campo)).select("*").single();
  return rowToCampo(um<any>(res, "Campo"));
}

export async function ensureConexaoPipeCampo(pipeId: string): Promise<Campo> {
  await getPipe(pipeId);
  const existente = await supabase
    .from("campos")
    .select("*")
    .eq("pipe_id", pipeId)
    .eq("tipo", "conexao_pipe")
    .limit(1)
    .maybeSingle();
  ok(existente);
  if (existente.data) return rowToCampo(existente.data);

  const campo: Campo = {
    id: uuid(),
    pipeId,
    tipo: "conexao_pipe",
    titulo: "Subtarefas (Cards Filhos)",
    obrigatorio: false,
    descricao: "",
    textoAjuda: "",
    visualizacaoCompacta: false,
    editavelEmOutrasFases: false,
    valorUnico: false,
    validacaoCustomizada: "",
    arquivado: false,
    ordem: await proximaOrdemCampo(pipeId),
    config: { pipeDestinoId: pipeId, modoConexao: "criar", cardinalidade: "varios" },
  };
  const res = await supabase.from("campos").insert(campoToRow(campo)).select("*").single();
  return rowToCampo(um<any>(res, "Campo"));
}

export async function ensureCardsVinculadosCampo(pipeId: string): Promise<Campo> {
  await getPipe(pipeId);
  const existente = await supabase
    .from("campos")
    .select("*")
    .eq("pipe_id", pipeId)
    .eq("tipo", "cards_vinculados")
    .limit(1)
    .maybeSingle();
  ok(existente);
  if (existente.data) return rowToCampo(existente.data);

  const campo: Campo = {
    id: uuid(),
    pipeId,
    tipo: "cards_vinculados",
    titulo: "Cards vinculados",
    obrigatorio: false,
    descricao: "",
    textoAjuda: "",
    visualizacaoCompacta: false,
    editavelEmOutrasFases: false,
    valorUnico: false,
    validacaoCustomizada: "",
    arquivado: false,
    ordem: await proximaOrdemCampo(pipeId),
    config: { cardinalidade: "varios", bidirecional: true },
  };
  const res = await supabase.from("campos").insert(campoToRow(campo)).select("*").single();
  return rowToCampo(um<any>(res, "Campo"));
}

export type CampoPatch = Partial<
  Pick<
    Campo,
    | "titulo"
    | "obrigatorio"
    | "descricao"
    | "textoAjuda"
    | "visualizacaoCompacta"
    | "editavelEmOutrasFases"
    | "valorUnico"
    | "validacaoCustomizada"
    | "arquivado"
    | "config"
  >
>;

export async function updateCampo(id: string, patch: CampoPatch): Promise<Campo> {
  const atualRes = await supabase.from("campos").select("*").eq("id", id).single();
  const atual = rowToCampo(um<any>(atualRes, "Campo"));

  const limpo: CampoPatch = { ...patch };
  if (limpo.titulo !== undefined) limpo.titulo = limpo.titulo.trim();
  if (limpo.validacaoCustomizada !== undefined) limpo.validacaoCustomizada = limpo.validacaoCustomizada.trim();
  if (limpo.config !== undefined) limpo.config = { ...atual.config, ...limpo.config }; // merge raso

  const row = campoToRow(limpo);
  if (Object.keys(row).length === 0) return atual;
  const res = await supabase.from("campos").update(row).eq("id", id).select("*").single();
  return rowToCampo(um<any>(res, "Campo"));
}

export async function reorderCampos(pipeId: string, orderedIds: string[]): Promise<Campo[]> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("campos").update({ ordem: index }).eq("id", id).eq("pipe_id", pipeId)
    )
  );
  return listCamposByPipe(pipeId);
}

export async function deleteCampo(id: string): Promise<void> {
  const campoRes = await supabase.from("campos").select("pipe_id").eq("id", id).maybeSingle();
  ok(campoRes);
  const pipeId = campoRes.data?.pipe_id as string | undefined;

  ok(await supabase.from("campos").delete().eq("id", id)); // cascade limpa card_links e conexoes do campo

  if (!pipeId) return;
  const cards = lista<any>(
    await supabase.from("cards").select("id, valores_campos").eq("pipe_id", pipeId)
  );
  for (const c of cards) {
    if (c.valores_campos && Object.prototype.hasOwnProperty.call(c.valores_campos, id)) {
      const vc = { ...c.valores_campos };
      delete vc[id];
      ok(await supabase.from("cards").update({ valores_campos: vc }).eq("id", c.id));
    }
  }
}

// ============================================================================
// Cards
// ============================================================================
export async function listCardsByPipe(pipeId: string): Promise<Card[]> {
  const res = await supabase
    .from("cards")
    .select("*")
    .eq("pipe_id", pipeId)
    .eq("excluido", false)
    .order("ordem", { ascending: true });
  return lista<any>(res).map(rowToCard);
}

export async function listTrashByPipe(pipeId: string): Promise<Card[]> {
  const res = await supabase
    .from("cards")
    .select("*")
    .eq("pipe_id", pipeId)
    .eq("excluido", true)
    .order("excluido_em", { ascending: false });
  return lista<any>(res).map(rowToCard);
}

export async function getCard(id: string): Promise<Card> {
  const res = await supabase.from("cards").select("*").eq("id", id).single();
  return rowToCard(um<any>(res, "Card"));
}

// Card novo entra no TOPO da coluna: ordem = min(ordem na fase) - 1 (ou 0 se vazia).
async function ordemDoTopo(faseId: string): Promise<number> {
  const res = await supabase
    .from("cards")
    .select("ordem")
    .eq("fase_id", faseId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();
  ok(res);
  const min = (res.data?.ordem as number | undefined) ?? 1;
  return min - 1;
}

export async function createCard(input: {
  pipeId: string;
  faseId: string;
  titulo: string;
  valoresCampos?: Record<string, unknown>;
}): Promise<Card> {
  const faseRes = await supabase
    .from("fases")
    .select("*")
    .eq("id", input.faseId)
    .eq("pipe_id", input.pipeId)
    .single();
  const fase = rowToFase(um<any>(faseRes, "Fase"));

  const card: Card = {
    id: uuid(),
    pipeId: input.pipeId,
    faseId: input.faseId,
    titulo: input.titulo.trim() || "Novo card",
    valoresCampos: input.valoresCampos ?? {},
    criadoPorId: CURRENT_USER_ID,
    criadoEm: now(),
    atualizadoEm: now(),
    historico: [{ id: uuid(), faseId: fase.id, faseNome: fase.nome, entradaEm: now() }],
    ordem: await ordemDoTopo(input.faseId),
    excluido: false,
    excluidoEm: null,
  };
  const res = await supabase.from("cards").insert(cardToRow(card)).select("*").single();
  return rowToCard(um<any>(res, "Card"));
}

export type CardPatch = Partial<Pick<Card, "titulo" | "valoresCampos">>;

export async function updateCard(id: string, patch: CardPatch): Promise<Card> {
  const card = await getCard(id);
  const update: Partial<Card> = { atualizadoEm: now() };

  if (patch.titulo !== undefined) update.titulo = patch.titulo.trim() || card.titulo;

  if (patch.valoresCampos !== undefined) {
    const entradas = Object.entries(patch.valoresCampos).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    );
    if (entradas.length > 0) {
      const campos = await listCamposByPipe(card.pipeId);
      for (const [campoId, valor] of entradas) {
        const campo = campos.find((c) => c.id === campoId);
        if (!campo?.valorUnico) continue;
        const dupRes = await supabase
          .from("cards")
          .select("id")
          .eq("pipe_id", card.pipeId)
          .neq("id", id)
          .eq(`valores_campos->>${campoId}`, String(valor))
          .limit(1);
        if (lista<any>(dupRes).length > 0) {
          badRequest(`"${campo.titulo}" precisa ter um valor único — este já está em uso em outro card`);
        }
      }
    }
    update.valoresCampos = { ...card.valoresCampos, ...patch.valoresCampos };
  }

  const res = await supabase.from("cards").update(cardToRow(update)).eq("id", id).select("*").single();
  return rowToCard(um<any>(res, "Card"));
}

export async function moveCard(
  cardId: string,
  targetFaseId: string,
  targetIndex: number
): Promise<Card> {
  const card = await getCard(cardId);
  const targetFaseRes = await supabase.from("fases").select("*").eq("id", targetFaseId).single();
  const targetFase = rowToFase(um<any>(targetFaseRes, "Fase"));

  const mudouFase = card.faseId !== targetFaseId;
  const historico = mudouFase
    ? [
        ...card.historico,
        { id: uuid(), faseId: targetFase.id, faseNome: targetFase.nome, entradaEm: now() },
      ]
    : card.historico;

  const siblingsRes = await supabase
    .from("cards")
    .select("id")
    .eq("fase_id", targetFaseId)
    .neq("id", cardId)
    .order("ordem", { ascending: true });
  const ids = lista<any>(siblingsRes).map((r) => r.id as string);
  ids.splice(targetIndex, 0, cardId);

  await Promise.all(
    ids.map((id, index) =>
      id === cardId
        ? supabase
            .from("cards")
            .update({ fase_id: targetFaseId, historico, ordem: index, atualizado_em: now() })
            .eq("id", cardId)
        : supabase.from("cards").update({ ordem: index }).eq("id", id)
    )
  );
  return getCard(cardId);
}

export async function reorderCardsWithinFase(
  faseId: string,
  orderedIds: string[]
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("cards").update({ ordem: index }).eq("id", id).eq("fase_id", faseId)
    )
  );
}

export async function trashCard(id: string): Promise<Card> {
  const res = await supabase
    .from("cards")
    .update({ excluido: true, excluido_em: now(), atualizado_em: now() })
    .eq("id", id)
    .select("*")
    .single();
  return rowToCard(um<any>(res, "Card"));
}

export async function restoreCard(id: string): Promise<Card> {
  const res = await supabase
    .from("cards")
    .update({ excluido: false, excluido_em: null, atualizado_em: now() })
    .eq("id", id)
    .select("*")
    .single();
  return rowToCard(um<any>(res, "Card"));
}

export async function permanentDeleteCard(id: string): Promise<void> {
  ok(await supabase.from("cards").delete().eq("id", id)); // cascade limpa dependências
}

// ============================================================================
// Conexões (pai/filho)
// ============================================================================
async function mapaCardsFasesPipes(cardIds: string[]) {
  const ids = [...new Set(cardIds)];
  const cards = ids.length
    ? lista<any>(await supabase.from("cards").select("*").in("id", ids)).map(rowToCard)
    : [];
  const faseIds = [...new Set(cards.map((c) => c.faseId))];
  const pipeIds = [...new Set(cards.map((c) => c.pipeId))];
  const fases = faseIds.length
    ? lista<any>(await supabase.from("fases").select("*").in("id", faseIds)).map(rowToFase)
    : [];
  const pipes = pipeIds.length
    ? lista<any>(await supabase.from("pipes").select("*").in("id", pipeIds)).map(rowToPipe)
    : [];
  return {
    card: (id: string) => cards.find((c) => c.id === id),
    fase: (id?: string) => fases.find((f) => f.id === id),
    pipe: (id?: string) => pipes.find((p) => p.id === id),
  };
}

export async function listConexoesFilhos(cardId: string) {
  const conexoes = lista<any>(
    await supabase.from("conexoes").select("*").eq("card_pai_id", cardId)
  ).map(rowToConexao);
  const m = await mapaCardsFasesPipes(conexoes.map((c) => c.cardFilhoId));
  return conexoes.map((cx) => {
    const filho = m.card(cx.cardFilhoId);
    return { conexao: cx, card: filho, fase: m.fase(filho?.faseId), pipe: m.pipe(filho?.pipeId) };
  });
}

export async function listConexoesPais(cardId: string) {
  const conexoes = lista<any>(
    await supabase.from("conexoes").select("*").eq("card_filho_id", cardId)
  ).map(rowToConexao);
  const m = await mapaCardsFasesPipes(conexoes.map((c) => c.cardPaiId));
  return conexoes.map((cx) => {
    const pai = m.card(cx.cardPaiId);
    return { conexao: cx, card: pai, fase: m.fase(pai?.faseId), pipe: m.pipe(pai?.pipeId) };
  });
}

export async function createConexaoComNovoCard(
  campoId: string,
  cardPaiId: string,
  novoCard: { pipeId: string; faseId: string; titulo: string; valoresCampos?: Record<string, unknown> }
): Promise<{ conexao: Conexao; card: Card }> {
  const paiRes = await supabase.from("cards").select("id").eq("id", cardPaiId).single();
  um<any>(paiRes, "Card pai");
  const campoRes = await supabase.from("campos").select("*").eq("id", campoId).single();
  const campo = rowToCampo(um<any>(campoRes, "Campo de conexão"));
  const faseRes = await supabase
    .from("fases")
    .select("*")
    .eq("id", novoCard.faseId)
    .eq("pipe_id", novoCard.pipeId)
    .single();
  const fase = rowToFase(um<any>(faseRes, "Fase"));

  if (campo.config.cardinalidade === "unico") {
    const jaRes = await supabase
      .from("conexoes")
      .select("id")
      .eq("campo_id", campoId)
      .eq("card_pai_id", cardPaiId)
      .limit(1);
    if (lista<any>(jaRes).length > 0)
      badRequest("Esta conexão já possui um card filho (permite apenas um)");
  }

  const card: Card = {
    id: uuid(),
    pipeId: novoCard.pipeId,
    faseId: novoCard.faseId,
    titulo: novoCard.titulo.trim() || "Novo card",
    valoresCampos: novoCard.valoresCampos ?? {},
    criadoPorId: CURRENT_USER_ID,
    criadoEm: now(),
    atualizadoEm: now(),
    historico: [{ id: uuid(), faseId: fase.id, faseNome: fase.nome, entradaEm: now() }],
    ordem: await ordemDoTopo(novoCard.faseId),
    excluido: false,
    excluidoEm: null,
  };
  const cardRes = await supabase.from("cards").insert(cardToRow(card)).select("*").single();
  const cardSalvo = rowToCard(um<any>(cardRes, "Card"));

  const conexao: Conexao = {
    id: uuid(),
    campoId,
    cardPaiId,
    cardFilhoId: cardSalvo.id,
    criadoEm: now(),
  };
  const conexaoRes = await supabase
    .from("conexoes")
    .insert({
      id: conexao.id,
      campo_id: campoId,
      card_pai_id: cardPaiId,
      card_filho_id: cardSalvo.id,
      criado_em: conexao.criadoEm,
    })
    .select("*")
    .single();
  return { conexao: rowToConexao(um<any>(conexaoRes, "Conexão")), card: cardSalvo };
}

export async function createConexaoComCardExistente(
  campoId: string,
  cardPaiId: string,
  cardFilhoId: string
): Promise<Conexao> {
  um<any>(await supabase.from("cards").select("id").eq("id", cardPaiId).single(), "Card pai");
  um<any>(await supabase.from("cards").select("id").eq("id", cardFilhoId).single(), "Card filho");
  const campo = rowToCampo(
    um<any>(await supabase.from("campos").select("*").eq("id", campoId).single(), "Campo de conexão")
  );
  if (cardPaiId === cardFilhoId) badRequest("Um card não pode ser conectado a si mesmo");

  if (campo.config.cardinalidade === "unico") {
    const jaRes = await supabase
      .from("conexoes")
      .select("id")
      .eq("campo_id", campoId)
      .eq("card_pai_id", cardPaiId)
      .limit(1);
    if (lista<any>(jaRes).length > 0)
      badRequest("Esta conexão já possui um card filho (permite apenas um)");
  }

  const dupRes = await supabase
    .from("conexoes")
    .select("id")
    .eq("campo_id", campoId)
    .eq("card_pai_id", cardPaiId)
    .eq("card_filho_id", cardFilhoId)
    .limit(1);
  if (lista<any>(dupRes).length > 0) badRequest("Este card já está conectado");

  const conexao = { id: uuid(), campoId, cardPaiId, cardFilhoId, criadoEm: now() };
  const res = await supabase
    .from("conexoes")
    .insert({
      id: conexao.id,
      campo_id: campoId,
      card_pai_id: cardPaiId,
      card_filho_id: cardFilhoId,
      criado_em: conexao.criadoEm,
    })
    .select("*")
    .single();
  return rowToConexao(um<any>(res, "Conexão"));
}

export async function removeConexao(id: string): Promise<void> {
  ok(await supabase.from("conexoes").delete().eq("id", id));
}

/** Conexões onde o pai OU o filho está no conjunto de ids dado (usado pela página do quadro). */
export async function listConexoesEnvolvendoCards(cardIds: string[]): Promise<Conexao[]> {
  if (cardIds.length === 0) return [];
  const lst = `(${[...new Set(cardIds)].join(",")})`;
  const res = await supabase
    .from("conexoes")
    .select("*")
    .or(`card_pai_id.in.${lst},card_filho_id.in.${lst}`);
  return lista<any>(res).map(rowToConexao);
}

/** { id -> titulo } para um conjunto de cards (pode incluir cards de outros pipes). */
export async function cardTitulosPorId(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const res = await supabase.from("cards").select("id, titulo").in("id", [...new Set(ids)]);
  const out: Record<string, string> = {};
  for (const r of lista<any>(res)) out[r.id as string] = r.titulo as string;
  return out;
}

export async function temFilhos(cardId: string): Promise<boolean> {
  const res = await supabase
    .from("conexoes")
    .select("*", { count: "exact", head: true })
    .eq("card_pai_id", cardId);
  ok(res);
  return (res.count ?? 0) > 0;
}

// ============================================================================
// Cards vinculados (campo "cards_vinculados")
// ============================================================================
export async function listCardLinksByCard(cardId: string) {
  const links = lista<any>(
    await supabase
      .from("card_links")
      .select("*")
      .or(`card_origem_id.eq.${cardId},card_destino_id.eq.${cardId}`)
  ).map(rowToCardLink);
  const outros = links.map((l) => (l.cardOrigemId === cardId ? l.cardDestinoId : l.cardOrigemId));
  const m = await mapaCardsFasesPipes(outros);
  return links.map((l) => {
    const direcao: "origem" | "destino" = l.cardOrigemId === cardId ? "origem" : "destino";
    const outroId = direcao === "origem" ? l.cardDestinoId : l.cardOrigemId;
    const outro = m.card(outroId);
    return { link: l, card: outro, fase: m.fase(outro?.faseId), direcao };
  });
}

export async function createCardLinks(
  campoId: string,
  cardOrigemId: string,
  targetIds: string[]
): Promise<CardLink[]> {
  const origem = rowToCard(
    um<any>(await supabase.from("cards").select("*").eq("id", cardOrigemId).single(), "Card")
  );
  const campo = rowToCampo(
    um<any>(await supabase.from("campos").select("*").eq("id", campoId).single(), "Campo de vinculação")
  );

  const idsValidos = [...new Set(targetIds.filter((id) => id !== cardOrigemId))];
  if (idsValidos.length === 0) badRequest("Selecione ao menos um card para vincular");

  const doMesmoPipe = lista<any>(
    await supabase.from("cards").select("id").eq("pipe_id", origem.pipeId).in("id", idsValidos)
  ).map((r) => r.id as string);
  for (const targetId of idsValidos) {
    if (!doMesmoPipe.includes(targetId)) badRequest("Só é possível vincular cards do mesmo pipe");
  }

  const todosDoCampo = lista<any>(
    await supabase.from("card_links").select("*").eq("campo_id", campoId)
  ).map(rowToCardLink);

  const existentesNoCard = todosDoCampo.filter(
    (l) => l.cardOrigemId === cardOrigemId || l.cardDestinoId === cardOrigemId
  );
  if (campo.config.cardinalidade === "unico" && existentesNoCard.length + idsValidos.length > 1) {
    badRequest(`"${campo.titulo}" permite vincular apenas um card`);
  }

  const novos: CardLink[] = [];
  for (const targetId of idsValidos) {
    const jaVinculado = todosDoCampo.some(
      (l) =>
        (l.cardOrigemId === cardOrigemId && l.cardDestinoId === targetId) ||
        (l.cardOrigemId === targetId && l.cardDestinoId === cardOrigemId)
    );
    if (jaVinculado) continue;
    novos.push({
      id: uuid(),
      campoId,
      cardOrigemId,
      cardDestinoId: targetId,
      criadoEm: now(),
    });
  }
  if (novos.length === 0) badRequest("Os cards selecionados já estão vinculados");

  ok(
    await supabase.from("card_links").insert(
      novos.map((l) => ({
        id: l.id,
        campo_id: l.campoId,
        card_origem_id: l.cardOrigemId,
        card_destino_id: l.cardDestinoId,
        criado_em: l.criadoEm,
      }))
    )
  );
  return novos;
}

export async function removeCardLink(id: string): Promise<void> {
  ok(await supabase.from("card_links").delete().eq("id", id));
}

// ============================================================================
// Etiquetas
// ============================================================================
export async function listLabelsByPipe(pipeId: string): Promise<Etiqueta[]> {
  const res = await supabase.from("etiquetas").select("*").eq("pipe_id", pipeId);
  return lista<any>(res).map(rowToEtiqueta);
}

export async function createLabel(pipeId: string, nome: string, cor: string): Promise<Etiqueta> {
  const res = await supabase
    .from("etiquetas")
    .insert({ id: uuid(), pipe_id: pipeId, nome: nome.trim(), cor })
    .select("*")
    .single();
  return rowToEtiqueta(um<any>(res, "Etiqueta"));
}

export async function updateLabel(
  id: string,
  patch: Partial<Pick<Etiqueta, "nome" | "cor">>
): Promise<Etiqueta> {
  const row: Record<string, unknown> = {};
  if (patch.nome !== undefined) row.nome = patch.nome.trim();
  if (patch.cor !== undefined) row.cor = patch.cor;
  if (Object.keys(row).length === 0) {
    const res = await supabase.from("etiquetas").select("*").eq("id", id).single();
    return rowToEtiqueta(um<any>(res, "Etiqueta"));
  }
  const res = await supabase.from("etiquetas").update(row).eq("id", id).select("*").single();
  return rowToEtiqueta(um<any>(res, "Etiqueta"));
}

export async function deleteLabel(id: string): Promise<void> {
  const etiquetaRes = await supabase.from("etiquetas").select("pipe_id").eq("id", id).maybeSingle();
  ok(etiquetaRes);
  const pipeId = etiquetaRes.data?.pipe_id as string | undefined;

  ok(await supabase.from("etiquetas").delete().eq("id", id));

  if (!pipeId) return;
  const cards = lista<any>(
    await supabase.from("cards").select("id, valores_campos").eq("pipe_id", pipeId)
  );
  for (const c of cards) {
    const vc = c.valores_campos ?? {};
    let mudou = false;
    const novo: Record<string, unknown> = { ...vc };
    for (const campoId of Object.keys(vc)) {
      const valor = vc[campoId];
      if (Array.isArray(valor) && valor.includes(id)) {
        novo[campoId] = valor.filter((v) => v !== id);
        mudou = true;
      }
    }
    if (mudou) ok(await supabase.from("cards").update({ valores_campos: novo }).eq("id", c.id));
  }
}

// ============================================================================
// Checklists
// ============================================================================
export async function listChecklistsByCard(cardId: string): Promise<Checklist[]> {
  const res = await supabase.from("checklists").select("*").eq("card_id", cardId);
  return lista<any>(res).map(rowToChecklist);
}

export async function createChecklist(cardId: string, titulo: string): Promise<Checklist> {
  const res = await supabase
    .from("checklists")
    .insert({ id: uuid(), card_id: cardId, titulo: titulo.trim() || "Checklist", itens: [] })
    .select("*")
    .single();
  return rowToChecklist(um<any>(res, "Checklist"));
}

export async function deleteChecklist(id: string): Promise<void> {
  ok(await supabase.from("checklists").delete().eq("id", id));
}

async function getChecklist(id: string): Promise<Checklist> {
  const res = await supabase.from("checklists").select("*").eq("id", id).single();
  return rowToChecklist(um<any>(res, "Checklist"));
}

export async function addChecklistItem(checklistId: string, texto: string): Promise<Checklist> {
  const checklist = await getChecklist(checklistId);
  const item: ItemChecklist = { id: uuid(), texto: texto.trim(), concluido: false };
  const itens = [...checklist.itens, item];
  const res = await supabase
    .from("checklists")
    .update({ itens })
    .eq("id", checklistId)
    .select("*")
    .single();
  return rowToChecklist(um<any>(res, "Checklist"));
}

export async function toggleChecklistItem(checklistId: string, itemId: string): Promise<Checklist> {
  const checklist = await getChecklist(checklistId);
  const item = checklist.itens.find((i) => i.id === itemId);
  if (!item) notFound("Item");
  const itens = checklist.itens.map((i) =>
    i.id === itemId ? { ...i, concluido: !i.concluido } : i
  );
  const res = await supabase
    .from("checklists")
    .update({ itens })
    .eq("id", checklistId)
    .select("*")
    .single();
  return rowToChecklist(um<any>(res, "Checklist"));
}

export async function deleteChecklistItem(checklistId: string, itemId: string): Promise<Checklist> {
  const checklist = await getChecklist(checklistId);
  const itens = checklist.itens.filter((i) => i.id !== itemId);
  const res = await supabase
    .from("checklists")
    .update({ itens })
    .eq("id", checklistId)
    .select("*")
    .single();
  return rowToChecklist(um<any>(res, "Checklist"));
}

// ============================================================================
// Comentários
// ============================================================================
export async function listCommentsByCard(cardId: string): Promise<Comentario[]> {
  const res = await supabase
    .from("comentarios")
    .select("*")
    .eq("card_id", cardId)
    .order("criado_em", { ascending: true });
  return lista<any>(res).map(rowToComentario);
}

export async function addComment(
  cardId: string,
  texto: string,
  autorId = CURRENT_USER_ID
): Promise<Comentario> {
  const res = await supabase
    .from("comentarios")
    .insert({ id: uuid(), card_id: cardId, autor_id: autorId, texto: texto.trim(), criado_em: now() })
    .select("*")
    .single();
  return rowToComentario(um<any>(res, "Comentário"));
}

export async function deleteComment(id: string): Promise<void> {
  ok(await supabase.from("comentarios").delete().eq("id", id));
}

// ============================================================================
// Anexos
// ============================================================================
export async function listAttachmentsByCard(cardId: string): Promise<Anexo[]> {
  const res = await supabase.from("anexos").select("*").eq("card_id", cardId);
  return lista<any>(res).map(rowToAnexo);
}

export async function addAttachment(input: {
  cardId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
}): Promise<Anexo> {
  const res = await supabase
    .from("anexos")
    .insert({
      id: uuid(),
      card_id: input.cardId,
      nome: input.nome,
      tipo: input.tipo,
      tamanho: input.tamanho,
      url: input.url,
      criado_em: now(),
    })
    .select("*")
    .single();
  return rowToAnexo(um<any>(res, "Anexo"));
}

export async function deleteAttachment(id: string): Promise<void> {
  ok(await supabase.from("anexos").delete().eq("id", id));
}
