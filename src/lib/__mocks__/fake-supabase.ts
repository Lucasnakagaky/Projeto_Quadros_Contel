// Fake in-memory do cliente @supabase/supabase-js — só o subconjunto da API
// encadeável que o store.ts usa. Serve para os testes unitários rodarem sem
// banco de verdade. NÃO emula ON DELETE CASCADE (nenhum teste depende disso).

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function valorColuna(row: Row, col: string): any {
  const seta = col.indexOf("->>");
  if (seta === -1) return row[col];
  const base = col.slice(0, seta);
  const chave = col.slice(seta + 3);
  const v = row[base]?.[chave];
  return v === undefined || v === null ? v : String(v);
}

class Builder {
  private filtros: ((r: Row) => boolean)[] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private ordenar: { col: string; asc: boolean } | null = null;
  private limitar: number | null = null;
  private modo: "list" | "single" | "maybeSingle" = "list";
  private head = false;
  private wantCount = false;

  constructor(private tabelas: Record<string, Row[]>, private tabela: string) {}
  private get linhas(): Row[] {
    return (this.tabelas[this.tabela] ??= []);
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== "insert" && this.op !== "update" && this.op !== "delete") this.op = "select";
    if (opts?.head) this.head = true;
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: any) {
    this.filtros.push((r) => valorColuna(r, col) === val);
    return this;
  }
  neq(col: string, val: any) {
    this.filtros.push((r) => valorColuna(r, col) !== val);
    return this;
  }
  in(col: string, arr: any[]) {
    this.filtros.push((r) => arr.includes(valorColuna(r, col)));
    return this;
  }
  or(filtro: string) {
    // "a.eq.x,b.eq.y"  ou  "a.in.(x,y),b.in.(z)"
    const partes = filtro.match(/[^,]+\.(eq|in)\.(\([^)]*\)|[^,]+)/g) ?? filtro.split(",");
    const conds = partes.map((p) => {
      const m = p.match(/^(.+?)\.(eq|in)\.(.+)$/);
      if (!m) return () => false;
      const [, col, tipo, resto] = m;
      if (tipo === "eq") return (r: Row) => valorColuna(r, col) === resto;
      const vals = resto.replace(/^\(|\)$/g, "").split(",");
      return (r: Row) => vals.includes(String(valorColuna(r, col)));
    });
    this.filtros.push((r) => conds.some((c) => c(r)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.ordenar = { col, asc: opts?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.limitar = n;
    return this;
  }
  single() {
    this.modo = "single";
    return this;
  }
  maybeSingle() {
    this.modo = "maybeSingle";
    return this;
  }

  private aplicaFiltros(rows: Row[]): Row[] {
    return rows.filter((r) => this.filtros.every((f) => f(r)));
  }

  private executar(): { data: any; error: any; count?: number } {
    if (this.op === "insert") {
      const arr = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inseridas = arr.map((r) => clone(r));
      this.linhas.push(...inseridas);
      if (this.modo === "single") return { data: clone(inseridas[0]), error: null };
      return { data: clone(inseridas), error: null };
    }

    if (this.op === "update") {
      const alvo = this.aplicaFiltros(this.linhas);
      alvo.forEach((r) => Object.assign(r, clone(this.payload as Row)));
      if (this.modo === "single") {
        if (alvo.length === 0) return { data: null, error: { code: "PGRST116", message: "0 rows" } };
        return { data: clone(alvo[0]), error: null };
      }
      if (this.modo === "maybeSingle") return { data: alvo[0] ? clone(alvo[0]) : null, error: null };
      return { data: clone(alvo), error: null };
    }

    if (this.op === "delete") {
      const manter = this.linhas.filter((r) => !this.filtros.every((f) => f(r)));
      this.tabelas[this.tabela] = manter;
      return { data: null, error: null };
    }

    // select
    let rows = this.aplicaFiltros(this.linhas);
    if (this.ordenar) {
      const { col, asc } = this.ordenar;
      rows = [...rows].sort((a, b) => {
        const va = a[col];
        const vb = b[col];
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    const total = rows.length;
    if (this.limitar != null) rows = rows.slice(0, this.limitar);

    if (this.head) return { data: null, error: null, count: total };
    if (this.modo === "single") {
      if (rows.length === 1) return { data: clone(rows[0]), error: null };
      return { data: null, error: { code: "PGRST116", message: "0 rows" } };
    }
    if (this.modo === "maybeSingle") return { data: rows[0] ? clone(rows[0]) : null, error: null };
    return { data: clone(rows), error: null, count: this.wantCount ? total : undefined };
  }

  then(resolve: (r: any) => any, reject?: (e: any) => any) {
    try {
      return Promise.resolve(this.executar()).then(resolve, reject);
    } catch (e) {
      return Promise.resolve().then(() => (reject ? reject(e) : Promise.reject(e)));
    }
  }
}

export function criarFakeSupabase() {
  const tabelas: Record<string, Row[]> = {
    usuarios: [{ id: "user-1", nome: "Você", email: "voce@exemplo.com", cor_avatar: "#000000" }],
  };
  return {
    tabelas,
    supabase: { from: (t: string) => new Builder(tabelas, t) as any },
  };
}
