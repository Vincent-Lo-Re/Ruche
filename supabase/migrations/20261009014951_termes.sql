-- Les termes de l'installation (Paramètres › Avancé, « Termes ») : le nom affiché d'une section, par
-- langue, avec son genre, son nombre et son élision, pour que l'admin et l'app accordent leurs
-- phrases (« dans la liste des Actualités », « de l'Agenda »). Pour commencer, les deux sections
-- de l'app : le Blog et les Podcasts. Seuls les mots affichés changent : ni les adresses (/blog,
-- /podcasts) ni les sortes de contenu. Un terme absent : le mot par défaut de l'admin.

create table public.terms (
  -- La section nommée : « blog » (les articles), « podcasts » (les épisodes).
  key text not null check (key in ('blog', 'podcasts')),
  language text not null check (language in ('en', 'fr')),
  -- Le nom tel qu'il s'affiche, sans espace autour : « Actualités ».
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  -- En français : masculin ou féminin ; l'anglais n'a pas de genre.
  gender text check (gender in ('masculine', 'feminine')),
  -- Le nom est au pluriel (« les Actualités », « des Podcasts »).
  plural boolean not null default false,
  -- En français, l'article s'élide devant ce nom (« l'Agenda », « de l'Agenda »).
  elided boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (key, language),
  check (
    case language
      when 'fr' then gender is not null
      else gender is null and not elided
    end
  )
);

comment on table public.terms is
  'Les termes de l''installation : le nom affiché d''une section (blog, podcasts) par langue, avec '
  'son genre (français), son nombre et son élision. Absent : le mot par défaut. Lecture par '
  'l''équipe, écriture par un admin ; app_terms() les donne à l''app.';

alter table public.terms enable row level security;
revoke all on public.terms from anon, authenticated;
grant select, insert, update, delete on public.terms to authenticated;

create policy "Termes : lecture par l'équipe"
  on public.terms
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Termes : ajout par un admin"
  on public.terms
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Termes : modification par un admin"
  on public.terms
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Termes : retrait par un admin"
  on public.terms
  for delete
  to authenticated
  using ((select public.is_admin()));

-- La date de modification suit chaque changement.
create function private.terms_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger terms_touch
  before update on public.terms
  for each row execute function private.terms_touch();

-- Les termes pour l'app, sans compte : ce ne sont que des mots affichés.
create function public.app_terms()
returns table (key text, language text, name text, gender text, plural boolean, elided boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select t.key, t.language, t.name, t.gender, t.plural, t.elided
  from public.terms t
  order by t.key, t.language;
$$;

comment on function public.app_terms() is
  'Les termes de l''installation (nom affiché des sections, par langue, avec genre, nombre et '
  'élision), lisibles par l''app sans compte. Un terme absent : le mot par défaut.';

revoke execute on function public.app_terms() from public;
grant execute on function public.app_terms() to anon, authenticated, service_role;
