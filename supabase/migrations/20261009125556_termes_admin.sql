-- Les termes de l'admin (Paramètres › Avancé, « Termes » ; ADMIN § 7 bis) : les mots de l'équipe
-- pour nommer les sections dans l'interface de l'admin (le menu, les titres, l'aide), pour
-- commencer le Blog et les Podcasts (« Actualités »), avec leurs traits grammaticaux pour que les
-- textes accordent leurs phrases (« dans la liste des Actualités »). Seulement les langues de
-- l'interface de l'admin, l'anglais et le français, que le code définit avec ses textes : une
-- langue de plus à l'admin demande de toute façon d'écrire tous ses textes. Dans l'app, le nom
-- d'une section est un élément traduit avec le contenu, pas un terme. Seuls les mots affichés
-- changent : ni les adresses ni les sortes de contenu. Un terme absent : le mot par défaut.

create table public.admin_terms (
  -- La section nommée : « blog », « podcasts » (et les métiers à venir).
  key text not null check (key ~ '^[a-z][a-z0-9-]{0,39}$'),
  -- Une langue de l'interface de l'admin.
  language text not null check (language in ('en', 'fr')),
  -- Le nom tel qu'il s'affiche, sans espace autour : « Actualités ».
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  -- Les traits grammaticaux que la langue déclare : le genre, le nombre, l'élision (« l'Agenda »).
  traits jsonb not null default '{}' check (
    extensions.jsonb_matches_schema(
      '{
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "gender": { "enum": ["masculine", "feminine"] },
          "plural": { "type": "boolean" },
          "elided": { "type": "boolean" }
        }
      }',
      traits
    )
  ),
  updated_at timestamptz not null default now(),
  primary key (key, language)
);

comment on table public.admin_terms is
  'Les termes de l''admin : le nom d''une section (blog, podcasts…) dans l''interface de l''admin, '
  'en anglais ou en français, avec ses traits grammaticaux (genre, nombre, élision). Absent : le '
  'mot par défaut. Lecture par l''équipe, écriture par un admin.';

alter table public.admin_terms enable row level security;
revoke all on public.admin_terms from anon, authenticated;
grant select, insert, update, delete on public.admin_terms to authenticated;

create policy "Termes de l'admin : lecture par l'équipe"
  on public.admin_terms
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Termes de l'admin : ajout par un admin"
  on public.admin_terms
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Termes de l'admin : modification par un admin"
  on public.admin_terms
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Termes de l'admin : retrait par un admin"
  on public.admin_terms
  for delete
  to authenticated
  using ((select public.is_admin()));

-- La date de modification suit chaque changement.
create function private.admin_terms_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger admin_terms_touch
  before update on public.admin_terms
  for each row execute function private.admin_terms_touch();
