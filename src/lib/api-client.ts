// Ponte de compatibilidade: mantém a interface `api.get/post/patch/delete("/api/...")`
// que os ~17 componentes já usam, mas em vez de `fetch` para rotas do Next, chama
// direto o store.ts (Supabase) no navegador. Assim nenhum call site precisou mudar.
//
// O upload de anexo (`/api/cards/:id/attachments`) vira Supabase Storage aqui.

import { CORES_ETIQUETA } from "./types";
import { supabase } from "./supabase";
import * as store from "./store";

const BUCKET = "uploads";

function naoMapeado(method: string, url: string): never {
  throw new Error(`api-client: rota não mapeada — ${method} ${url}`);
}

// Extrai os segmentos depois de /api/
function segs(url: string): string[] {
  return url.split("?")[0].replace(/^\/api\//, "").split("/").filter(Boolean);
}

async function uploadArquivo(cardId: string, file: File) {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${cardId}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return store.addAttachment({
    cardId,
    nome: file.name,
    tipo: file.type || "application/octet-stream",
    tamanho: file.size,
    url,
  });
}

async function baixarImagemRemota(cardId: string, urlRemota: string) {
  // Edge Function replica a proteção SSRF do antigo src/lib/fetch-remote-image.ts.
  const { data, error } = await supabase.functions.invoke("baixar-imagem-remota", {
    body: { url: urlRemota },
  });
  if (error) throw new Error(error.message || "Falha ao baixar a imagem remota");
  // A função devolve { base64, tipo, nome } — reconstrói um File e sobe pro Storage.
  const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  const file = new File([bin], data.nome ?? "imagem-colada", { type: data.tipo });
  return uploadArquivo(cardId, file);
}

/* ------------------------------------------------------------------ GET ---- */
async function get<T>(url: string): Promise<T> {
  const s = segs(url);
  // /api/users
  if (s[0] === "users") return store.listUsers() as T;
  // /api/pipes
  if (s[0] === "pipes" && s.length === 1) return store.listPipes() as T;
  // /api/pipes/:pid/(fases|campos|cards|etiquetas)
  if (s[0] === "pipes" && s.length === 3) {
    const pid = s[1];
    if (s[2] === "fases") return store.listFasesByPipe(pid) as T;
    if (s[2] === "campos") return store.listCamposByPipe(pid) as T;
    if (s[2] === "cards") return store.listCardsByPipe(pid) as T;
    if (s[2] === "etiquetas") return store.listLabelsByPipe(pid) as T;
  }
  // /api/cards/:cid  -> payload agregado do modal
  if (s[0] === "cards" && s.length === 2) {
    const cid = s[1];
    const card = await store.getCard(cid);
    const [
      pipe,
      fases,
      campos,
      etiquetas,
      usuarios,
      checklists,
      comentarios,
      anexos,
      conexoesFilhos,
      conexoesPais,
      cardLinks,
    ] = await Promise.all([
      store.getPipe(card.pipeId),
      store.listFasesByPipe(card.pipeId),
      store.listCamposByPipe(card.pipeId),
      store.listLabelsByPipe(card.pipeId),
      store.listUsers(),
      store.listChecklistsByCard(cid),
      store.listCommentsByCard(cid),
      store.listAttachmentsByCard(cid),
      store.listConexoesFilhos(cid),
      store.listConexoesPais(cid),
      store.listCardLinksByCard(cid),
    ]);
    return {
      card, pipe, fases, campos, etiquetas, usuarios,
      checklists, comentarios, anexos, conexoesFilhos, conexoesPais, cardLinks,
    } as T;
  }
  naoMapeado("GET", url);
}

/* ----------------------------------------------------------------- POST ---- */
async function post<T>(url: string, body?: unknown): Promise<T> {
  const s = segs(url);
  const b = (body ?? {}) as Record<string, unknown>;

  if (s[0] === "pipes") {
    if (s.length === 1) return store.createPipe(String(b.nome ?? "")) as T;
    const pid = s[1];
    if (s.length === 3 && s[2] === "fases")
      return store.createFase(pid, b as { nome: string }) as T;
    if (s.length === 3 && s[2] === "campos")
      return store.createCampo(pid, b as Parameters<typeof store.createCampo>[1]) as T;
    if (s.length === 3 && s[2] === "cards")
      return store.createCard({ pipeId: pid, faseId: String(b.faseId), titulo: String(b.titulo ?? "Novo card") }) as T;
    if (s.length === 3 && s[2] === "etiquetas")
      return store.createLabel(pid, String(b.nome ?? ""), String(b.cor ?? CORES_ETIQUETA[0])) as T;
    if (s.length === 4 && s[2] === "fases" && s[3] === "reorder")
      return store.reorderFases(pid, b.orderedIds as string[]) as T;
    if (s.length === 4 && s[2] === "fases" && s[3] === "garantir-arquivada")
      return store.ensureFaseArquivada(pid) as T;
    if (s.length === 4 && s[2] === "campos" && s[3] === "reorder")
      return store.reorderCampos(pid, b.orderedIds as string[]) as T;
    if (s.length === 4 && s[2] === "campos" && s[3] === "garantir-descricao-demanda")
      return store.ensureDescricaoDemandaCampo(pid) as T;
    if (s.length === 4 && s[2] === "campos" && s[3] === "garantir-subtarefas")
      return store.ensureConexaoPipeCampo(pid) as T;
    if (s.length === 4 && s[2] === "campos" && s[3] === "garantir-cards-vinculados")
      return store.ensureCardsVinculadosCampo(pid) as T;
    if (s.length === 6 && s[2] === "fases" && s[4] === "cards" && s[5] === "reorder") {
      await store.reorderCardsWithinFase(s[3], b.orderedIds as string[]);
      return { ok: true } as T;
    }
  }

  if (s[0] === "cards" && s.length >= 3) {
    const cid = s[1];
    if (s[2] === "mover")
      return store.moveCard(cid, String(b.faseId), Number(b.index)) as T;
    if (s[2] === "lixeira") return store.trashCard(cid) as T;
    if (s[2] === "restaurar") return store.restoreCard(cid) as T;
    if (s[2] === "comments") return store.addComment(cid, String(b.texto ?? "")) as T;
    if (s[2] === "checklists")
      return store.createChecklist(cid, String(b.titulo ?? "Checklist")) as T;
    if (s[2] === "attachments") {
      if (body instanceof FormData) {
        const file = body.get("file");
        if (!(file instanceof File)) throw new Error("Arquivo não enviado");
        return (await uploadArquivo(cid, file)) as T;
      }
      if (typeof b.url === "string") return (await baixarImagemRemota(cid, b.url)) as T;
      throw new Error("Anexo: envie um arquivo ou uma url");
    }
    if (s[2] === "conexoes") {
      if (b.modo === "existente")
        return store.createConexaoComCardExistente(
          String(b.campoId), cid, String(b.cardFilhoId)
        ) as T;
      return store.createConexaoComNovoCard(String(b.campoId), cid, {
        pipeId: String(b.pipeId),
        faseId: String(b.faseId),
        titulo: String(b.titulo ?? "Novo card"),
        valoresCampos: b.valoresCampos as Record<string, unknown> | undefined,
      }) as T;
    }
    if (s[2] === "links")
      return store.createCardLinks(String(b.campoId), cid, b.targetIds as string[]) as T;
  }

  if (s[0] === "checklists" && s.length === 3 && s[2] === "items")
    return store.addChecklistItem(s[1], String(b.texto ?? "")) as T;

  naoMapeado("POST", url);
}

/* ---------------------------------------------------------------- PATCH ---- */
async function patch<T>(url: string, body?: unknown): Promise<T> {
  const s = segs(url);
  const b = (body ?? {}) as Record<string, unknown>;

  if (s[0] === "pipes") {
    if (s.length === 2) return store.updatePipe(s[1], b) as T;
    if (s.length === 4 && s[2] === "fases") return store.updateFase(s[3], b) as T;
    if (s.length === 4 && s[2] === "campos")
      return store.updateCampo(s[3], b as store.CampoPatch) as T;
    if (s.length === 4 && s[2] === "etiquetas") return store.updateLabel(s[3], b) as T;
  }
  if (s[0] === "cards" && s.length === 2)
    return store.updateCard(s[1], b as store.CardPatch) as T;
  if (s[0] === "checklists" && s.length === 4 && s[2] === "items")
    return store.toggleChecklistItem(s[1], s[3]) as T;

  naoMapeado("PATCH", url);
}

/* --------------------------------------------------------------- DELETE ---- */
async function del<T>(url: string): Promise<T> {
  const s = segs(url);
  const okT = { ok: true } as T;

  if (s[0] === "pipes") {
    if (s.length === 2) return (await store.deletePipe(s[1]), okT);
    if (s.length === 4 && s[2] === "fases") return (await store.deleteFase(s[3]), okT);
    if (s.length === 4 && s[2] === "campos") return (await store.deleteCampo(s[3]), okT);
    if (s.length === 4 && s[2] === "etiquetas") return (await store.deleteLabel(s[3]), okT);
  }
  if (s[0] === "cards") {
    if (s.length === 2) return (await store.permanentDeleteCard(s[1]), okT);
    if (s.length === 4 && s[2] === "conexoes") return (await store.removeConexao(s[3]), okT);
    if (s.length === 4 && s[2] === "links") return (await store.removeCardLink(s[3]), okT);
  }
  if (s[0] === "comments" && s.length === 2) return (await store.deleteComment(s[1]), okT);
  if (s[0] === "attachments" && s.length === 2) {
    await removerAnexoComArquivo(s[1]); // apaga o registro E o arquivo do Storage
    return okT;
  }
  if (s[0] === "checklists") {
    if (s.length === 2) return (await store.deleteChecklist(s[1]), okT);
    if (s.length === 4 && s[2] === "items")
      return store.deleteChecklistItem(s[1], s[3]) as T;
  }
  naoMapeado("DELETE", url);
}

async function removerAnexoComArquivo(anexoId: string) {
  const { data } = await supabase.from("anexos").select("url").eq("id", anexoId).maybeSingle();
  await store.deleteAttachment(anexoId);
  const url: string | undefined = data?.url;
  if (url) {
    const marca = `/${BUCKET}/`;
    const i = url.indexOf(marca);
    if (i !== -1) {
      const path = url.slice(i + marca.length);
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  }
}

export const api = {
  get,
  post,
  patch,
  delete: del,
};
