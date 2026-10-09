-- Une formule utilisée seulement par d'anciennes versions se supprime (QCM du 09/10/2026,
-- solution C). Chaque version garde le nom de sa formule en texte (access_level_name, figé à la
-- publication) ; quand la formule est supprimée, son lien (access_level_id) passe à null et le nom
-- reste lisible dans l'historique. « Revenir à cette version » remet alors le niveau d'accès à
-- choisir (note formule_supprimee). Une formule reste non supprimable tant qu'un brouillon, un
-- contenu en ligne ou un abonné l'utilise.

-- 1. Le nom de la formule, figé dans chaque version.
alter table public.versions add column access_level_name text;

comment on column public.versions.access_level_name is
  'Le nom de la formule de cette version, figé à la publication : lisible même si la formule a '
  'été supprimée depuis (access_level_id passe alors à null).';

-- Les versions existantes : le nom de leur formule (une version ne se modifie jamais, sauf ici).
alter table public.versions disable trigger versions_immutable;
update public.versions v
set access_level_name = al.name
from public.access_levels al
where al.id = v.access_level_id;
alter table public.versions enable trigger versions_immutable;

-- 2. Une formule supprimée : ses anciennes versions perdent le lien, gardent le nom.
alter table public.versions
  drop constraint versions_access_level_id_fkey,
  add constraint versions_access_level_id_fkey
    foreign key (access_level_id) references public.access_levels (id) on delete set null;

-- Une version ne se modifie pas, sauf ce lien quand sa formule est supprimée.
create or replace function private.versions_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and not exists (select 1 from public.contents c where c.id = old.content_id) then
    return old;
  end if;
  if tg_op = 'UPDATE'
    and old.access_level_id is not null
    and new.access_level_id is null
    and not exists (select 1 from public.access_levels al where al.id = old.access_level_id)
    and (to_jsonb(new) - 'access_level_id') = (to_jsonb(old) - 'access_level_id') then
    return new;
  end if;
  raise exception using
    errcode = 'P0001',
    message = 'version_immuable',
    detail = 'Une version publiée ne se modifie pas et ne se supprime pas.';
end;
$$;

-- 3. Ce qui empêche encore de supprimer une formule : un brouillon, un contenu en ligne, un abonné.
create or replace function private.access_levels_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.contents c where c.access_level_id = old.id)
    or exists (select 1 from private.live l where l.level_id = old.id)
    or exists (select 1 from public.reader_access r where r.access_level_id = old.id) then
    raise exception using
      errcode = 'P0001',
      message = 'formule_utilisee',
      detail = 'Cette formule est utilisée par un brouillon, un contenu en ligne ou un abonné : '
        'renomme-la ou déplace-la plutôt.';
  end if;
  return old;
end;
$$;

-- 4. La publication fige le nom ; revenir à une version dont la formule a disparu le dit.
CREATE OR REPLACE FUNCTION private.insert_version(prepared versions, version_origin text, author_id uuid)
 RETURNS versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  created public.versions;
begin
  insert into public.versions (
    content_id, number, origin, body, files, access_level_id, access_level_name, slug,
    category_ids, media_ids, cover_media_id, template_ids, block_types, draft_rev,
    published_by, published_by_name
  )
  values (
    prepared.content_id,
    coalesce((select max(v.number) from public.versions v where v.content_id = prepared.content_id), 0) + 1,
    version_origin,
    prepared.body,
    prepared.files,
    prepared.access_level_id,
    -- Le nom de la formule, figé : il reste lisible si la formule est supprimée un jour.
    coalesce(
      (select al.name from public.access_levels al where al.id = prepared.access_level_id),
      prepared.access_level_name
    ),
    prepared.slug,
    prepared.category_ids,
    prepared.media_ids,
    prepared.cover_media_id,
    prepared.template_ids,
    prepared.block_types,
    prepared.draft_rev,
    author_id,
    (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = author_id)
  )
  returning * into created;
  return created;
end;
$function$;;

CREATE OR REPLACE FUNCTION public.revert_to_version(version_id uuid, editor_session uuid DEFAULT NULL::uuid)
 RETURNS TABLE(draft_rev integer, draft_saved_at timestamp with time zone, warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  saved_at timestamptz := now();
  src public.versions;
  target public.contents;
  new_draft jsonb;
  kept_body jsonb;
  restore_slug boolean;
  level_deleted boolean;
  notes text[] := '{}';
  new_rev integer;
begin
  perform private.require_staff();

  select * into src from public.versions v where v.id = revert_to_version.version_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'version_introuvable',
      detail = 'Cette version n''existe plus.';
  end if;

  select * into target from public.contents c where c.id = src.content_id for update;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
  end if;

  if not exists (
    select 1 from public.edit_locks l
    where l.content_id = target.id and l.holder_id = me
      and l.holder_session is not distinct from revert_to_version.editor_session
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_perdu',
      detail = 'Prends la main sur ce brouillon pour revenir à une version.';
  end if;

  new_draft := private.body_to_draft(src.body);

  -- Fichiers retirés : on compare les fichiers du brouillon à ceux de la version, sans les copies
  -- de modèle redevenues des blocs liés (un bloc lié ne cite aucun fichier : ceux de son modèle
  -- ne sont pas « retirés »).
  kept_body := jsonb_set(
    src.body,
    '{blocks}',
    coalesce(
      (
        select jsonb_agg(b order by n)
        from jsonb_array_elements(coalesce(src.body -> 'blocks', '[]'::jsonb)) with ordinality list (b, n)
        where not exists (
          select 1 from jsonb_array_elements(new_draft -> 'blocks') d
          where d ->> 'type' = 'linked' and d ->> 'id' = b ->> 'id'
        )
      ),
      '[]'::jsonb
    )
  );
  if cardinality(private.media_ids_of(new_draft)) < cardinality(private.media_ids_of(kept_body)) then
    notes := notes || 'fichier_retire'::text;
  end if;
  if (select count(*) from jsonb_path_query(src.body, 'strict $.blocks[*] ? (exists (@.templateId))'))
    > (select count(*) from jsonb_path_query(new_draft, 'strict $.blocks[*] ? (@.type == "linked")')) then
    notes := notes || 'modele_detache'::text;
  end if;

  level_deleted := src.access_level_id is null and src.access_level_name is not null;
  if level_deleted and target.kind in ('article', 'episode', 'page') then
    notes := notes || 'formule_supprimee'::text;
  end if;

  restore_slug := target.kind = 'page' and (
    src.slug is null or not exists (
      select 1 from public.contents c
      where c.kind = 'page' and c.slug = src.slug and c.deleted_at is null and c.id <> target.id
    )
  );
  if target.kind = 'page' and not restore_slug then
    notes := notes || 'adresse_prise'::text;
  end if;

  update public.contents c
  set draft = new_draft,
    draft_rev = c.draft_rev + 1,
    draft_saved_at = saved_at,
    draft_saved_by = me,
    access_level_id = case
      when c.kind in ('article', 'episode', 'page') then src.access_level_id
      else c.access_level_id
    end,
    -- La formule de cette version a été supprimée depuis : le niveau est à choisir de nouveau.
    access_chosen = case
      when c.kind in ('article', 'episode', 'page') then not level_deleted
      else c.access_chosen
    end,
    slug = case when restore_slug then src.slug else c.slug end
  where c.id = target.id
  returning c.draft_rev into new_rev;

  if target.kind in ('article', 'episode') then
    delete from public.content_categories cc where cc.content_id = target.id;
    insert into public.content_categories (content_id, category_id)
    select target.id, cat.id
    from public.categories cat
    where cat.id = any (src.category_ids);
  end if;

  update public.edit_locks l
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = target.id;

  return query select new_rev, saved_at, notes;
end;
$function$;;


revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;
