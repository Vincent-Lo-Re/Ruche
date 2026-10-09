-- Les langues de l'installation (Paramètres › Langues) : celles dans lesquelles l'app sert son
-- contenu, comme des données et non une liste figée. Tout ce qui se traduira (termes, contenus,
-- catégories, formules…) renverra à cette table. Une seule langue par défaut, toujours active :
-- celle d'un contenu sans traduction. Au départ, le français, la langue du contenu existant ;
-- chaque installation change la langue par défaut et ajoute les siennes.
-- À ne pas confondre avec les langues de l'interface de l'admin (texts/en.ts, texts/fr.ts).

create table public.languages (
  -- Le code de la langue (BCP 47, sans écriture) : « fr », « en », « pt-BR ».
  code text primary key check (code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  -- La langue d'un contenu sans traduction ; il y en a toujours une, et une seule.
  is_default boolean not null default false,
  -- Proposée par l'app ; une langue arrêtée garde ce qui a été traduit.
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (enabled or not is_default)
);

create unique index languages_one_default on public.languages (is_default) where is_default;

comment on table public.languages is
  'Les langues de l''installation, dans lesquelles l''app sert son contenu (« fr », « en », '
  '« pt-BR ») : une seule par défaut, toujours active. Lecture par l''équipe, écriture par un '
  'admin (la langue par défaut change par languages_set_default) ; app_languages() les donne à '
  'l''app.';

insert into public.languages (code, is_default) values ('fr', true);

alter table public.languages enable row level security;
revoke all on public.languages from anon, authenticated;
-- La langue par défaut ne change que par languages_set_default (deux lignes à la fois).
grant select, insert (code, enabled), update (enabled), delete on public.languages to authenticated;

create policy "Langues : lecture par l'équipe"
  on public.languages
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Langues : ajout par un admin"
  on public.languages
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Langues : modification par un admin"
  on public.languages
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Langues : retrait par un admin"
  on public.languages
  for delete
  to authenticated
  using ((select public.is_admin()));

-- La langue par défaut ne se retire pas : il en faut toujours une.
create function private.languages_keep_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    raise exception 'langue_par_defaut'
      using errcode = '23514', detail = 'La langue par défaut ne se retire pas.';
  end if;
  return old;
end;
$$;

create trigger languages_keep_default
  before delete on public.languages
  for each row execute function private.languages_keep_default();

-- Changer la langue par défaut (admins) : elle devient active, l'ancienne reste active.
create function public.languages_set_default(language_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'reserve_aux_admins'
      using errcode = '42501', detail = 'Seul un admin change la langue par défaut.';
  end if;
  if not exists (select 1 from public.languages l where l.code = language_code) then
    raise exception 'langue_introuvable'
      using errcode = 'P0001', detail = 'Cette langue n''est pas une langue de l''installation.';
  end if;
  update public.languages set is_default = false where is_default and code <> language_code;
  update public.languages set is_default = true, enabled = true where code = language_code;
end;
$$;

comment on function public.languages_set_default(text) is
  'Fait d''une langue de l''installation la langue par défaut (admins) : elle devient active, '
  'l''ancienne reste active.';

revoke execute on function public.languages_set_default(text) from public, anon;
grant execute on function public.languages_set_default(text) to authenticated, service_role;

-- Les langues pour l'app, sans compte : celles qu'elle propose, la langue par défaut d'abord.
create function public.app_languages()
returns table (code text, is_default boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.code, l.is_default
  from public.languages l
  where l.enabled
  order by l.is_default desc, l.code;
$$;

comment on function public.app_languages() is
  'Les langues que propose l''app (actives), la langue par défaut d''abord, lisibles sans compte.';

revoke execute on function public.app_languages() from public;
grant execute on function public.app_languages() to anon, authenticated, service_role;
