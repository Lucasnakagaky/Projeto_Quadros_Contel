-- =============================================================================
-- Schema do Kanban (Gestão de Demandas de TI) — Supabase / Postgres
-- Espelha o antigo data/db.json (src/lib/types.ts). Rodar UMA vez no SQL Editor.
--
-- Decisões:
--  * ids uuid com default gen_random_uuid(); a importação envia os uuids que já
--    existem no db.json, então o default só vale para linhas criadas pelo app.
--  * usuarios.id / criado_por_id / autor_id são TEXT (não uuid, não auth.uid()):
--    o app é single-user, o "user-1" do db.json é mantido como está e serve só
--    para exibir "Criado por Você". A proteção real é o RLS (ver rls.sql):
--    tudo liberado para o papel `authenticated`, nada para `anon`.
--  * Colunas que hoje são objeto/array aninhado no JSON viram jsonb:
--    cards.valores_campos, cards.historico, campos.config, checklists.itens,
--    fases.responsavel_ids.
--  * As cascatas que o store.ts fazia à mão (deletePipe / deleteFase /
--    permanentDeleteCard) viram ON DELETE CASCADE nas FKs.
-- =============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ usuarios
create table if not exists public.usuarios (
  id          text primary key,
  nome        text not null default '',
  email       text not null default '',
  cor_avatar  text not null default '#2563eb'
);

-- --------------------------------------------------------------------- pipes
create table if not exists public.pipes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null default '',
  criado_em  timestamptz not null default now()
);

-- --------------------------------------------------------------------- fases
create table if not exists public.fases (
  id                    uuid primary key default gen_random_uuid(),
  pipe_id               uuid not null references public.pipes(id) on delete cascade,
  nome                  text not null default '',
  cor                   text not null default '#3B82F6',
  ordem                 integer not null default 0,
  eh_final              boolean not null default false,
  permite_criar_cards   boolean not null default true,
  descricao             text not null default '',
  responsavel_ids       jsonb not null default '[]'::jsonb
);
create index if not exists fases_pipe_id_idx on public.fases (pipe_id);

-- -------------------------------------------------------------------- campos
create table if not exists public.campos (
  id                        uuid primary key default gen_random_uuid(),
  pipe_id                   uuid not null references public.pipes(id) on delete cascade,
  tipo                      text not null,
  titulo                    text not null default '',
  obrigatorio               boolean not null default false,
  descricao                 text not null default '',
  texto_ajuda               text not null default '',
  visualizacao_compacta     boolean not null default false,
  editavel_em_outras_fases  boolean not null default false,
  valor_unico               boolean not null default false,
  validacao_customizada     text not null default '',
  arquivado                 boolean not null default false,
  ordem                     integer not null default 0,
  config                    jsonb not null default '{}'::jsonb
);
create index if not exists campos_pipe_id_idx on public.campos (pipe_id);

-- --------------------------------------------------------------------- cards
create table if not exists public.cards (
  id             uuid primary key default gen_random_uuid(),
  pipe_id        uuid not null references public.pipes(id) on delete cascade,
  fase_id        uuid not null references public.fases(id) on delete cascade,
  titulo         text not null default 'Novo card',
  valores_campos jsonb not null default '{}'::jsonb,
  criado_por_id  text not null default 'user-1',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  historico      jsonb not null default '[]'::jsonb,
  ordem          integer not null default 0,
  excluido       boolean not null default false,
  excluido_em    timestamptz
);
create index if not exists cards_pipe_id_idx  on public.cards (pipe_id);
create index if not exists cards_fase_ordem_idx on public.cards (fase_id, ordem);

-- ----------------------------------------------------------------- etiquetas
create table if not exists public.etiquetas (
  id       uuid primary key default gen_random_uuid(),
  pipe_id  uuid not null references public.pipes(id) on delete cascade,
  nome     text not null default '',
  cor      text not null default '#22c55e'
);
create index if not exists etiquetas_pipe_id_idx on public.etiquetas (pipe_id);

-- --------------------------------------------------------------- comentarios
create table if not exists public.comentarios (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.cards(id) on delete cascade,
  autor_id   text not null default 'user-1',
  texto      text not null default '',
  criado_em  timestamptz not null default now()
);
create index if not exists comentarios_card_id_idx on public.comentarios (card_id);

-- -------------------------------------------------------------------- anexos
create table if not exists public.anexos (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.cards(id) on delete cascade,
  nome       text not null default '',
  tipo       text not null default 'application/octet-stream',
  tamanho    integer not null default 0,
  url        text not null,
  criado_em  timestamptz not null default now()
);
create index if not exists anexos_card_id_idx on public.anexos (card_id);

-- ---------------------------------------------------------------- checklists
create table if not exists public.checklists (
  id       uuid primary key default gen_random_uuid(),
  card_id  uuid not null references public.cards(id) on delete cascade,
  titulo   text not null default 'Checklist',
  itens    jsonb not null default '[]'::jsonb
);
create index if not exists checklists_card_id_idx on public.checklists (card_id);

-- ----------------------------------------------------------------- conexoes
-- Relação pai/filho entre cards (campo tipo conexao_pipe). Pode cruzar pipes.
create table if not exists public.conexoes (
  id             uuid primary key default gen_random_uuid(),
  campo_id       uuid not null references public.campos(id) on delete cascade,
  card_pai_id    uuid not null references public.cards(id) on delete cascade,
  card_filho_id  uuid not null references public.cards(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  unique (campo_id, card_pai_id, card_filho_id)
);
create index if not exists conexoes_pai_idx   on public.conexoes (card_pai_id);
create index if not exists conexoes_filho_idx on public.conexoes (card_filho_id);

-- --------------------------------------------------------------- card_links
-- Vínculo livre entre dois cards do mesmo pipe (campo tipo cards_vinculados).
-- 1 linha por par; a direção é resolvida na leitura conforme config.bidirecional.
create table if not exists public.card_links (
  id               uuid primary key default gen_random_uuid(),
  campo_id         uuid not null references public.campos(id) on delete cascade,
  card_origem_id   uuid not null references public.cards(id) on delete cascade,
  card_destino_id  uuid not null references public.cards(id) on delete cascade,
  criado_em        timestamptz not null default now()
);
create index if not exists card_links_origem_idx  on public.card_links (card_origem_id);
create index if not exists card_links_destino_idx on public.card_links (card_destino_id);
