-- Corrections de la base après l'audit du 10/10/2026 : des cas limites rares, du code en double
-- et deux commentaires périmés. Aucun changement de forme ni de droits.

-- ---------------------------------------------------------------------------------------------
-- Un titre ou une adresse pris entre-temps (index unique) : le code de la base, comme save_draft.
-- ---------------------------------------------------------------------------------------------

create function private.raise_taken(failed_constraint text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if failed_constraint = 'contents_title_key' then
    raise exception using
      errcode = 'P0001',
      message = 'titre_pris',
      detail = 'Un autre contenu de cette section porte déjà ce titre.';
  end if;
  raise exception using
    errcode = 'P0001',
    message = 'adresse_prise',
    detail = 'Une autre page a déjà cette adresse.';
end;
$$;

revoke execute on function private.raise_taken(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Code en double : le texte alternatif tiré de la Médiathèque (la version figée, sans fichier
-- figé, fait exactement la même chose), et la copie d'un bloc partagé (private.template_copy).
-- ---------------------------------------------------------------------------------------------

create or replace function private.resolve_alts(blocks jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.resolve_alts_frozen(blocks, '{}'::jsonb)
$$;

drop function private.resolve_alt(jsonb);

-- Restaurer, revenir à une version (titre ou adresse pris), copier un bloc partagé.

create or replace function public.restore(content_id uuid)
 RETURNS TABLE(restored integer, warnings text[], title text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  target public.contents;
  new_slug text;
  new_title text;
  notes text[] := '{}';
  failed_constraint text;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = restore.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is null then
    return query select 0, notes, target.title;
    return;
  end if;

  new_slug := target.slug;
  if target.kind = 'page' and target.slug is not null then
    -- Deux restaurations en même temps avec la même adresse : l'une attend l'autre.
    perform pg_advisory_xact_lock(hashtext('ruche.page_slug:' || target.slug));
    if exists (
      select 1 from public.contents c
      where c.kind = 'page' and c.slug = target.slug and c.deleted_at is null and c.id <> target.id
    ) then
      new_slug := null;
      notes := notes || 'adresse_retiree'::text;
    end if;
  end if;

  new_title := private.free_title(target.kind, target.title, target.id);
  if new_title is distinct from target.title then
    notes := notes || 'titre_renomme'::text;
  end if;

  -- La sortie de la corbeille, le changement d'adresse et de titre dans la même commande : le
  -- garde de corbeille refuse toute autre modification d'un contenu qui y reste.
  -- Un titre ou une adresse pris entre-temps par un autre contenu : le code de la base, pas
  -- l'erreur brute de l'index.
  begin
    update public.contents c
    set deleted_at = null, deleted_by = null, slug = new_slug,
      draft = case
        when new_title is distinct from target.title
          then jsonb_set(c.draft, '{title}', to_jsonb(new_title))
        else c.draft
      end,
      draft_rev = case
        when new_title is distinct from target.title then c.draft_rev + 1
        else c.draft_rev
      end
    where c.id = target.id;
  exception
    when unique_violation then
      get stacked diagnostics failed_constraint = constraint_name;
      perform private.raise_taken(failed_constraint);
  end;

  return query select 1, notes, new_title;
end;
$function$;

create or replace function public.revert_to_version(version_id uuid, editor_session uuid DEFAULT NULL::uuid)
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
  new_title text;
  kept_body jsonb;
  restore_slug boolean;
  level_deleted boolean;
  notes text[] := '{}';
  new_rev integer;
  failed_constraint text;
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

  new_title := private.free_title(target.kind, new_draft ->> 'title', target.id);
  if new_title is distinct from new_draft ->> 'title' then
    new_draft := jsonb_set(new_draft, '{title}', to_jsonb(new_title));
    notes := notes || 'titre_renomme'::text;
  end if;

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

  -- Un titre ou une adresse pris entre-temps par un autre contenu : le code de la base.
  begin
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
  exception
    when unique_violation then
      get stacked diagnostics failed_constraint = constraint_name;
      perform private.raise_taken(failed_constraint);
  end;

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
$function$;

create or replace function private.resolve_linked(draft jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  resolved jsonb := '[]'::jsonb;
  b jsonb;
  t public.contents;
  copy jsonb;
begin
  for b in
    select x.block
    from jsonb_array_elements(coalesce(draft -> 'blocks', '[]'::jsonb)) with ordinality x (block, n)
    order by x.n
  loop
    if b ->> 'type' = 'linked' then
      select * into t
      from public.contents c
      where c.id = (b ->> 'templateId')::uuid
      for share;

      if not found or t.kind <> 'template' or t.template_sort <> 'shared'
        or t.deleted_at is not null
        or jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) <> 1 then
        raise exception using
          errcode = 'P0001',
          message = 'modele_indisponible',
          detail = 'Ce contenu cite un bloc partagé dont le modèle n''existe plus, est '
            'dans la corbeille ou ne contient pas exactement un bloc.';
      end if;

      copy := private.template_copy(t.draft -> 'blocks' -> 0, b ->> 'id', t.id);
      b := copy;
    end if;
    resolved := resolved || jsonb_build_array(b);
  end loop;

  return jsonb_set(draft, '{blocks}', resolved);
end;
$function$;

-- Remplacer un fichier : les lecteurs suivent le brouillon, et chaque fichier une fois dans une
-- version ; programmer une page sans adresse est refusé ; deux catégories ajoutées ensemble ne
-- prennent pas la même place.

create or replace function public.media_replace(old_id uuid, new_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  pair record;
  target record;
  holder text;
  replaced integer := 0;
  kept jsonb := '[]'::jsonb;
  new_rev integer;
begin
  perform private.require_staff();
  select * into pair from private.replacement_pair(media_replace.old_id, media_replace.new_id);

  update public.media m
  set alt = coalesce(nullif(btrim(m.alt), ''), (pair.old_media).alt),
    transcript = coalesce(nullif(btrim(m.transcript), ''), (pair.old_media).transcript)
  where m.id = media_replace.new_id
    and (
      (nullif(btrim(m.alt), '') is null and (pair.old_media).alt is not null)
      or (nullif(btrim(m.transcript), '') is null and (pair.old_media).transcript is not null)
    );

  -- Le brouillon d'un contenu à la Corbeille change aussi : la même permission que « Détacher
  -- partout » (contents_trash_guard n'accepte alors que le brouillon), le temps de la boucle.
  perform set_config('ruche.detach_all', 'on', true);

  for target in
    select c.id, c.title from public.contents c
    where c.draft_media_ids @> array[media_replace.old_id]
    order by c.id
    for update
  loop
    select coalesce(nullif(p.full_name, ''), p.email) into holder
    from public.edit_locks l
    left join public.profiles p on p.id = l.holder_id
    where l.content_id = target.id
      and l.holder_id is not null
      and l.heartbeat_at >= now() - private.lock_ttl();
    if found then
      kept := kept || jsonb_build_object(
        'id', target.id, 'title', coalesce(target.title, ''), 'holder', holder
      );
      continue;
    end if;

    -- Un identifiant n'apparaît dans un brouillon que là où il désigne ce fichier.
    update public.contents c
    set draft = replace(c.draft::text, media_replace.old_id::text, media_replace.new_id::text)::jsonb,
      draft_rev = c.draft_rev + 1,
      draft_saved_at = now(),
      draft_saved_by = me
    where c.id = target.id
    returning c.draft_rev into new_rev;
    -- Qui lit ce contenu (en Lecture, dans l'admin) le voit changer : comme save_draft.
    update public.edit_locks l set draft_rev = new_rev where l.content_id = target.id;
    replaced := replaced + 1;
  end loop;

  perform set_config('ruche.detach_all', '', true);

  return jsonb_build_object('replaced', replaced, 'kept', kept);
end;
$function$;

create or replace function public.media_replace_live(old_id uuid, new_id uuid)
 RETURNS TABLE(content_id uuid, version_id uuid, version_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  new_media public.media;
  stale_ids uuid[];
  stale_id uuid;
  src public.versions;
  new_body jsonb;
  new_files jsonb;
  prepared public.versions;
  created public.versions;
begin
  perform private.require_staff();
  new_media := (
    select p.new_media
    from private.replacement_pair(media_replace_live.old_id, media_replace_live.new_id) p
  );

  -- Les contenus concernés, verrouillés dans un ordre fixe.
  select coalesce(array_agg(distinct l.content_id), '{}') into stale_ids
  from private.live l
  join public.versions v on v.id = l.version_id
  where v.media_ids @> array[media_replace_live.old_id];
  perform 1 from public.contents c where c.id = any (stale_ids) order by c.id for update;

  foreach stale_id in array array(select x from unnest(stale_ids) x order by x) loop
    -- Relu sous le verrou : une publication a pu passer entre-temps.
    select v.* into src
    from private.live l
    join public.versions v on v.id = l.version_id
    where l.content_id = stale_id and v.media_ids @> array[media_replace_live.old_id];
    if not found then
      continue;
    end if;

    new_body := replace(
      src.body::text, media_replace_live.old_id::text, media_replace_live.new_id::text
    )::jsonb;
    new_body := private.body_with_library_alt(new_body, new_media.id, new_media.alt);
    new_files := (src.files - media_replace_live.old_id::text)
      || private.frozen_files(array[new_media.id]);

    prepared := src;
    prepared.body := new_body;
    prepared.files := new_files;
    -- Le nouveau fichier peut être déjà cité : chaque fichier une fois, dans l'ordre.
    prepared.media_ids := array(
      select distinct x
      from unnest(array_replace(src.media_ids, media_replace_live.old_id, new_media.id)) x
      order by x
    );
    prepared.cover_media_id := case
      when src.cover_media_id = media_replace_live.old_id then new_media.id
      else src.cover_media_id
    end;
    created := private.insert_version(prepared, 'files', me);

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;

end;
$function$;

create or replace function public.schedule(content_id uuid, at timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target public.contents;
begin
  perform private.require_staff();

  if schedule.content_id is null or schedule.at is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id et at sont obligatoires.';
  end if;

  select * into target from public.contents c where c.id = schedule.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le programmer.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se programment.';
  end if;

  if not target.access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de programmer.';
  end if;

  -- Une page sans adresse ne se publierait pas à l'heure dite : refusée dès maintenant.
  if target.kind = 'page' and target.slug is null then
    raise exception using
      errcode = 'P0001',
      message = 'adresse_manquante',
      detail = 'Choisis l''adresse de la page avant de la programmer.';
  end if;

  -- Ce que la publication exigera de toute façon : le refuser dès maintenant ([D45], son).
  perform private.check_publish_requirements(target.kind, target.draft);

  if schedule.at <= now() then
    raise exception using
      errcode = 'P0001',
      message = 'date_passee',
      detail = 'Choisis une date et une heure à venir.';
  end if;

  update public.contents c
  set scheduled_at = schedule.at,
    scheduled_by = (select auth.uid()),
    scheduled_rev = c.draft_rev,
    schedule_error = null
  where c.id = target.id;

  return schedule.at;
end;
$function$;

create or replace function private.categories_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.name := normalize(btrim(new.name), NFC);
  if tg_op = 'UPDATE' and new.section is distinct from old.section then
    raise exception using
      errcode = 'P0001',
      message = 'categorie_invalide',
      detail = 'La section d''une catégorie ne change pas.';
  end if;
  if new.position is null then
    -- Deux ajouts en même temps dans la section ne prennent pas la même place.
    perform pg_advisory_xact_lock(hashtext('ruche.categories:' || new.section));
    select coalesce(max(c.position) + 1, 0) into new.position
    from public.categories c
    where c.section = new.section;
  end if;
  return new;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- Commentaires d'avant le retrait des méthodes.
-- ---------------------------------------------------------------------------------------------

comment on table public.contents is
  'Tout ce qui s''écrit (articles, épisodes, pages, modèles de bloc), avec son brouillon unique. '
  'Aucune écriture directe : tout passe par les RPC.';

comment on column public.contents.list_position is
  'Article ou épisode : sa place dans la liste de sa section (la plus petite en tête), pour '
  'l''admin et pour l''app. Un contenu neuf arrive en tête (contents_list_position). Rangée par '
  'contents_reorder. Null pour les autres sortes.';
