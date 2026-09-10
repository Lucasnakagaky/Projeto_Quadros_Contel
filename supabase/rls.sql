-- =============================================================================
-- Row Level Security — Kanban
--
-- Modelo: app single-user atrás de login (Supabase Auth).
--   * papel `authenticated`  -> acesso TOTAL a tudo (select/insert/update/delete)
--   * papel `anon` (sem login) -> NADA (RLS ligado + sem policy = negado;
--     e ainda revogamos os grants por baixo, defesa em profundidade)
--
-- Rodar DEPOIS de schema.sql. Idempotente (drop policy if exists).
-- =============================================================================

do $$
declare
  t text;
  tabelas text[] := array[
    'usuarios','pipes','fases','campos','cards','etiquetas',
    'comentarios','anexos','checklists','conexoes','card_links'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using (true)
        with check (true);
    $f$, t || '_authenticated_all', t);

    -- Defesa em profundidade: mesmo que uma policy fosse criada por engano,
    -- o papel anônimo não tem privilégio de tabela.
    execute format('revoke all on public.%I from anon;', t);
    execute format('grant all on public.%I to authenticated;', t);
  end loop;
end $$;
