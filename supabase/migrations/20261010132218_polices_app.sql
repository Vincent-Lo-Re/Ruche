-- Les polices de la charte de l'app (ADMIN § 1, « Charte graphique », QCM du 10/10/2026) : les
-- polices libres que propose l'admin (web/public/fonts/, tirées une fois de Google Fonts par
-- web/scripts/fonts-fetch.mjs) sont copiées par l'admin dans le stockage de l'installation quand
-- il publie la charte ; l'app les y lit. Ni l'admin ni l'app n'appellent Google.

-- ---------------------------------------------------------------------------------------------
-- L'espace « polices » : public (l'app les lit sans compte), 2 Mo au plus par fichier, une
-- police TrueType par épaisseur et sa licence.
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('polices', 'polices', true, 2097152, array['font/ttf', 'text/plain'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Le chemin d'un fichier : « <famille>/<épaisseur>.ttf » ou « <famille>/OFL.txt », la famille
-- écrite comme private.font_folder (« source-serif-4 »).
create domain public.font_path as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*/((400|500|600|700)\.ttf|OFL\.txt)$');

-- Envoi par un admin seulement, au chemin attendu ; pas de remplacement (un fichier déjà là est
-- le même). La lecture est publique (espace public).
create policy "Polices : envoi par un admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'polices'
    and (select public.is_admin())
    and objects.name::public.font_path is not null
  );

create policy "Polices : lecture par l'équipe"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'polices' and (select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Publier : chaque police de la charte (sauf celle du téléphone) doit être dans l'espace.
-- ---------------------------------------------------------------------------------------------

-- Le dossier d'une famille : « Source Serif 4 » → « source-serif-4 » (comme fonts-fetch.mjs et
-- l'admin).
create function private.font_folder(family text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(lower(family), ' ', '-');
$$;

-- Les polices d'une charte absentes de l'espace « polices » : [{ "family", "weight" }].
create function private.missing_fonts(doc jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'family', f ->> 'family', 'weight', (f ->> 'weight')::integer
  )), '[]'::jsonb)
  from jsonb_array_elements(coalesce(doc -> 'fonts', '[]'::jsonb)) f
  where f ->> 'family' <> 'system'
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'polices'
        and o.name = private.font_folder(f ->> 'family') || '/' || (f ->> 'weight') || '.ttf'
    );
$$;

revoke execute on function private.font_folder(text), private.missing_fonts(jsonb)
from public, anon, authenticated;

create or replace function public.style_publish(expected_rev integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_style public.app_style;
  missing jsonb;
begin
  current_style := private.style_for_update(expected_rev);
  missing := private.missing_fonts(current_style.draft);
  if jsonb_array_length(missing) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'police_manquante',
      detail = 'Une police de la charte n''est pas encore dans le stockage : l''admin la copie avant de publier.',
      hint = missing::text;
  end if;
  update public.app_style s
  set published = current_style.draft, published_at = now()
  where s.id;
  return current_style.draft_rev;
end;
$$;

comment on function public.style_publish(integer) is
  'Publie le brouillon de la charte (admins) : l''app le lit dès lors par app_style(). Un brouillon '
  'vide publie la charte neutre. Chaque police doit être dans l''espace « polices » '
  '(police_manquante). Rend la révision, inchangée.';
