-- Les termes de l'installation (Paramètres › Langues, « Termes » ; ADMIN § 7 bis) : le nom affiché
-- d'une section (pour commencer le Blog et les Podcasts) dans chaque langue de l'installation,
-- avec les traits grammaticaux que cette langue déclare, pour que les textes de l'admin et de l'app
-- accordent leurs phrases (« dans la liste des Actualités », « de l'Agenda », « des Blogs »).
-- Aucune liste de langues ni de traits propre à une langue : une langue de plus ne demande pas de
-- migration. Seuls les mots affichés changent : ni les adresses ni les sortes de contenu. Un terme
-- absent : le mot par défaut des textes.

create table public.terms (
  -- La section nommée : « blog », « podcasts » (et les métiers à venir).
  key text not null check (key ~ '^[a-z][a-z0-9-]{0,39}$'),
  language text not null references public.languages (code) on update cascade on delete cascade,
  -- Le nom tel qu'il s'affiche, sans espace autour : « Actualités ».
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  -- Les traits grammaticaux, ceux que la langue déclare (l'admin sait lesquels) : le genre, le
  -- nombre, l'élision (« l'Agenda »), et des formes déclinées (« genitive » : « Blogs »).
  traits jsonb not null default '{}' check (
    extensions.jsonb_matches_schema(
      '{
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "gender": { "enum": ["masculine", "feminine", "neuter", "common"] },
          "plural": { "type": "boolean" },
          "elided": { "type": "boolean" },
          "forms": {
            "type": "object",
            "maxProperties": 12,
            "propertyNames": { "pattern": "^[a-z][a-z-]{0,23}$" },
            "additionalProperties": { "type": "string", "minLength": 1, "maxLength": 40 }
          }
        }
      }',
      traits
    )
  ),
  updated_at timestamptz not null default now(),
  primary key (key, language)
);

comment on table public.terms is
  'Les termes de l''installation : le nom affiché d''une section (blog, podcasts…) dans une langue '
  'de l''installation, avec ses traits grammaticaux (genre, nombre, élision, formes déclinées). '
  'Absent : le mot par défaut. Lecture par l''équipe, écriture par un admin ; app_terms() les donne '
  'à l''app.';

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

-- Les termes pour l'app, sans compte : ceux des langues qu'elle propose.
create function public.app_terms()
returns table (key text, language text, name text, traits jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select t.key, t.language, t.name, t.traits
  from public.terms t
  join public.languages l on l.code = t.language and l.enabled
  order by t.key, t.language;
$$;

comment on function public.app_terms() is
  'Les termes de l''installation dans les langues que propose l''app, lisibles sans compte. Un '
  'terme absent : le mot par défaut.';

revoke execute on function public.app_terms() from public;
grant execute on function public.app_terms() to anon, authenticated, service_role;
