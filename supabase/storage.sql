-- =============================================================================
-- Storage — bucket `uploads` (imagens coladas nos cards + anexos)
--
-- Substitui a antiga pasta public/uploads/{cardId}/.
-- Layout de path mantido: uploads/{cardId}/{uuid}.{ext}
--
-- DECISÃO (desvio do "privado" do plano):
--   O bucket é PUBLIC PARA LEITURA. Motivo: o HTML salvo em cards.valores_campos
--   guarda uma URL fixa de <img>. Com bucket privado seria preciso gerar signed
--   URLs (que expiram) a cada renderização e re-assinar o HTML — complexidade
--   grande. Com bucket público, getPublicUrl() devolve uma URL permanente e o
--   <img> "só funciona". Os paths são uuids não-adivinháveis; ESCRITA e EXCLUSÃO
--   continuam restritas a quem está logado.
--   Se um dia precisar de sigilo real das imagens, revisar aqui + a estratégia
--   de render de <img> na Fase 3.
--
-- Rodar DEPOIS de schema.sql. Idempotente.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = excluded.public;

-- Leitura pública (qualquer um com a URL exata) --------------------------------
drop policy if exists "uploads_public_read" on storage.objects;
create policy "uploads_public_read" on storage.objects
  for select
  to public
  using (bucket_id = 'uploads');

-- Escrita / atualização / exclusão: só quem está logado -----------------------
drop policy if exists "uploads_authenticated_insert" on storage.objects;
create policy "uploads_authenticated_insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'uploads');

drop policy if exists "uploads_authenticated_update" on storage.objects;
create policy "uploads_authenticated_update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'uploads')
  with check (bucket_id = 'uploads');

drop policy if exists "uploads_authenticated_delete" on storage.objects;
create policy "uploads_authenticated_delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'uploads');
