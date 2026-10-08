-- Ménage de la base (08/10/2026, point « propreté du code ») : on retire ce que plus rien ne
-- lit, choix de l'utilisateur. L'admin a cessé de s'en servir dans la demande précédente.
--
-- 1. Les derniers restes des méthodes : les points de départ d'un chapitre, d'une leçon ou d'un
--    exercice (template_for), le lot de la corbeille (contents.trash_batch, trash_items.batch_root :
--    chaque contenu part et revient seul), et la portée en tableau du verrou (active_writer).
-- 2. Deux colonnes écrites mais jamais lues : contents.scheduled_set_at (la date d'une
--    programmation) et versions.body_hash (l'empreinte d'une version, avec version_hash).
-- 3. Le mode « audit » de la fonction files, que rien n'appelle : sa branche de files_claim_run et
--    private.settings.files_last_audit_at (l'audit planifié passe par private.audit_files()).
-- 4. Une instruction morte de restore.
--
-- Les fonctions qui s'en servaient sont recréées telles qu'elles sont en place, sans ces lignes.

drop view public.trash_items;

create or replace function private.insert_version(prepared versions, version_origin text, author_id uuid)
 RETURNS versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  created public.versions;
begin
  insert into public.versions (
    content_id, number, origin, body, files, access_level_id, slug,
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
$function$
;

create or replace function private.prepare_version(target contents, resolved jsonb)
 RETURNS versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  body jsonb := resolved;
  problem text;
  facts jsonb;
  cited uuid[];
  frozen jsonb;
  shape_ok boolean;
  shape_errors text[];
  prepared public.versions;
begin
  -- Image de présentation (article, épisode : [D45]) et son d'un épisode.
  perform private.check_publish_requirements(target.kind, body);

  select string_agg(format('bloc n° %s', pos), ', ' order by pos), jsonb_agg(pos order by pos)
  into problem, facts
  from (
    select distinct top_n as pos
    from jsonb_array_elements(body -> 'blocks') with ordinality top_list (top_block, top_n)
    left join lateral jsonb_array_elements(
      case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
    ) inner_block on true
    where (top_block ->> 'type' = 'image' and jsonb_typeof(top_block -> 'mediaId') = 'null')
      or (inner_block ->> 'type' = 'image' and jsonb_typeof(inner_block -> 'mediaId') = 'null')
  ) missing;

  if problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'image_sans_fichier',
      detail = 'Une image n''a pas de fichier : ' || problem || '.',
      hint = facts::text;
  end if;

  cited := private.media_ids_of(body);

  if cardinality(cited) > 0 then
    perform 1 from public.media m where m.id = any (cited) order by m.id for share;

    select string_agg(
      case
        when m.id is null then 'un fichier qui n''existe plus'
        when m.deleted_at is not null then '« ' || m.name || ' » (dans la corbeille)'
        else '« ' || m.name || ' » (pas encore prêt)'
      end,
      ', ' order by m.name
    ),
    jsonb_agg(
      jsonb_build_object(
        'name', m.name,
        'state', case
          when m.id is null then 'missing'
          when m.deleted_at is not null then 'trashed'
          else 'pending'
        end
      )
      order by m.name
    )
    into problem, facts
    from unnest(cited) wanted (id)
    left join public.media m on m.id = wanted.id
    where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_indisponible',
        detail = left('Ce contenu cite un fichier indisponible : ' || problem || '.', 1000),
        hint = facts::text;
    end if;
  end if;

  -- Image de présentation et images des blocs : des images ; son d'un épisode : un audio.
  select
    string_agg(distinct '« ' || m.name || ' »', ', '),
    jsonb_agg(distinct m.name order by m.name)
  into problem, facts
  from (
    select (body #>> '{cover,mediaId}')::uuid as id, 'image' as wanted_kind
    where jsonb_typeof(body -> 'cover') = 'object'
    union all
    select (body #>> '{audio,mediaId}')::uuid, 'audio'
    where jsonb_typeof(body -> 'audio') = 'object'
    union all
    select (top_block ->> 'mediaId')::uuid, 'image'
    from jsonb_array_elements(body -> 'blocks') top_block
    where top_block ->> 'type' = 'image'
    union all
    select (inner_block ->> 'mediaId')::uuid, 'image'
    from jsonb_array_elements(body -> 'blocks') top_block
    cross join lateral jsonb_array_elements(
      case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
    ) inner_block
    where inner_block ->> 'type' = 'image'
  ) uses
  join public.media m on m.id = uses.id
  where m.kind <> uses.wanted_kind;

  if problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_inadapte',
      detail = left('Ce fichier n''est pas du bon type à cet endroit : ' || problem || '.', 1000),
      hint = facts::text;
  end if;

  body := jsonb_set(body, '{blocks}', private.resolve_alts(body -> 'blocks'));

  begin
    shape_ok := extensions.jsonb_matches_schema(private.blocks_schema('published'), body);
    if not shape_ok then
      shape_errors := extensions.jsonschema_validation_errors(
        private.blocks_schema('published'), body::json
      );
    end if;
  exception
    when internal_error then
      raise exception using
        errcode = 'P0001',
        message = 'brouillon_trop_imbrique',
        detail = 'Le brouillon a trop de niveaux imbriqués (listes dans des listes).';
  end;
  if not shape_ok then
    raise exception using
      errcode = 'P0001',
      message = 'forme_invalide',
      detail = left(
        'La version n''a pas la forme attendue : '
          || coalesce(
            (
              select string_agg(left(e, 200), ' | ' order by n)
              from unnest(shape_errors) with ordinality errs (e, n)
              where n <= 3
            ),
            'forme inconnue'
          ),
        1000
      );
  end if;

  frozen := private.frozen_files(cited);

  prepared.content_id := target.id;
  prepared.body := body;
  prepared.files := frozen;
  prepared.access_level_id := target.access_level_id;
  prepared.slug := target.slug;
  prepared.category_ids := array(
    select cc.category_id from public.content_categories cc
    where cc.content_id = target.id
    order by cc.category_id
  );
  prepared.media_ids := cited;
  prepared.cover_media_id := case
    when jsonb_typeof(body -> 'cover') = 'object' then (body #>> '{cover,mediaId}')::uuid
  end;
  prepared.template_ids := private.template_ids_of(body);
  prepared.block_types := private.block_types_of(body);
  prepared.draft_rev := target.draft_rev;
  return prepared;
end;
$function$
;

create or replace function public.media_push(media_id uuid)
 RETURNS TABLE(content_id uuid, version_id uuid, version_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  target public.media;
  stale_ids uuid[];
  stale_id uuid;
  src public.versions;
  new_body jsonb;
  new_files jsonb;
  prepared public.versions;
  created public.versions;
begin
  perform private.require_staff();

  -- En partage : le texte ne change pas pendant le geste (un renommage attend la fin).
  select * into target from public.media m where m.id = media_push.media_id for share;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Ce fichier n''existe pas.';
  end if;

  -- Les contenus concernés, verrouillés dans un ordre fixe.
  select coalesce(array_agg(distinct s.content_id), '{}') into stale_ids
  from private.media_stale_live(target.id) s;
  perform 1 from public.contents c where c.id = any (stale_ids) order by c.id for update;

  foreach stale_id in array array(select x from unnest(stale_ids) x order by x) loop
    -- Relu sous le verrou : une publication a pu passer entre-temps.
    select v.* into src
    from private.media_stale_live(target.id) s
    join public.versions v on v.id = s.version_id
    where s.content_id = stale_id;
    if not found then
      continue;
    end if;

    new_body := private.body_with_library_alt(src.body, target.id, target.alt);
    new_files := jsonb_set(
      src.files,
      array[target.id::text],
      (src.files -> target.id::text)
        || jsonb_build_object('alt', target.alt, 'transcript', target.transcript)
    );

    prepared := src;
    prepared.body := new_body;
    prepared.files := new_files;
    created := private.insert_version(prepared, 'files', me);

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;

end;
$function$
;

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
    prepared.media_ids := array_replace(src.media_ids, media_replace_live.old_id, new_media.id);
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
$function$
;

create or replace function public.template_push(template_id uuid)
 RETURNS TABLE(content_id uuid, version_id uuid, version_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  tpl public.contents;
  tpl_block jsonb;
  stale_ids uuid[];
  stale_id uuid;
  src public.versions;
  linked_ids text[];
  new_body jsonb;
  cited uuid[];
  added uuid[];
  new_files jsonb;
  problem text;
  facts jsonb;
  shape_ok boolean;
  shape_errors text[];
  prepared public.versions;
  created public.versions;
begin
  perform private.require_staff();

  -- En partage : le modèle ne change pas pendant le geste (son enregistrement attend la fin).
  select * into tpl from public.contents t where t.id = template_push.template_id for share;
  if not found or tpl.kind <> 'template' or tpl.template_sort <> 'shared' then
    raise exception using
      errcode = 'P0001',
      message = 'modele_introuvable',
      detail = 'Ce modèle n''existe plus, ou n''est pas un bloc partagé.';
  end if;
  tpl_block := tpl.draft -> 'blocks' -> 0;

  -- Les contenus concernés, verrouillés dans un ordre fixe.
  select coalesce(array_agg(distinct s.content_id), '{}') into stale_ids
  from private.template_stale_live(tpl.id) s;
  perform 1 from public.contents c where c.id = any (stale_ids) order by c.id for update;

  foreach stale_id in array array(select x from unnest(stale_ids) x order by x) loop
    -- Relu sous le verrou : une publication, un retrait ou un détachement a pu passer.
    select v.* into src
    from private.template_stale_live(tpl.id) s
    join public.versions v on v.id = s.version_id
    where s.content_id = stale_id;
    if not found then
      continue;
    end if;

    select coalesce(array_agg(d ->> 'id'), '{}') into linked_ids
    from public.contents c
    cross join lateral jsonb_array_elements(c.draft -> 'blocks') d
    where c.id = stale_id
      and d ->> 'type' = 'linked'
      and d ->> 'templateId' = tpl.id::text;

    new_body := jsonb_set(
      src.body,
      '{blocks}',
      private.resolve_alts_frozen(
        (
          select coalesce(
            jsonb_agg(
              case
                when b ->> 'templateId' = tpl.id::text and (b ->> 'id') = any (linked_ids)
                  then private.template_copy(tpl_block, b ->> 'id', tpl.id)
                else b
              end
              order by n
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(src.body -> 'blocks') with ordinality list (b, n)
        ),
        src.files
      )
    );

    -- Une image sans fichier (seule une nouvelle copie peut en avoir).
    select string_agg(format('bloc n° %s', pos), ', ' order by pos)
    into problem
    from (
      select distinct top_n as pos
      from jsonb_array_elements(new_body -> 'blocks') with ordinality top_list (top_block, top_n)
      left join lateral jsonb_array_elements(
        case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
      ) inner_block on true
      where (top_block ->> 'type' = 'image' and jsonb_typeof(top_block -> 'mediaId') = 'null')
        or (inner_block ->> 'type' = 'image' and jsonb_typeof(inner_block -> 'mediaId') = 'null')
    ) missing;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'image_sans_fichier',
        detail = 'Le modèle a une image sans fichier : choisis-en un dans le modèle, puis '
          'réessaie.';
    end if;

    cited := private.media_ids_of(new_body);
    added := array(select x from unnest(cited) x where not (x = any (src.media_ids)));

    if cardinality(added) > 0 then
      -- Comme la publication : verrou partagé, puis disponibilité et sorte (des images).
      perform 1 from public.media m where m.id = any (added) order by m.id for share;

      select string_agg(
        case
          when m.id is null then 'un fichier qui n''existe plus'
          when m.deleted_at is not null then '« ' || m.name || ' » (dans la corbeille)'
          else '« ' || m.name || ' » (pas encore prêt)'
        end,
        ', ' order by m.name
      ),
      jsonb_agg(
        jsonb_build_object(
          'name', m.name,
          'state', case
            when m.id is null then 'missing'
            when m.deleted_at is not null then 'trashed'
            else 'pending'
          end
        )
        order by m.name
      )
      into problem, facts
      from unnest(added) wanted (id)
      left join public.media m on m.id = wanted.id
      where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'fichier_indisponible',
          detail = left('Le modèle cite un fichier indisponible : ' || problem || '.', 1000),
          hint = facts::text;
      end if;

      select
        string_agg(distinct '« ' || m.name || ' »', ', '),
        jsonb_agg(distinct m.name order by m.name)
      into problem, facts
      from public.media m
      where m.id = any (added) and m.kind <> 'image';

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'fichier_inadapte',
          detail = left('Ce fichier n''est pas une image : ' || problem || '.', 1000),
          hint = facts::text;
      end if;
    end if;

    begin
      shape_ok := extensions.jsonb_matches_schema(private.blocks_schema('published'), new_body);
      if not shape_ok then
        shape_errors := extensions.jsonschema_validation_errors(
          private.blocks_schema('published'), new_body::json
        );
      end if;
    exception
      when internal_error then
        raise exception using
          errcode = 'P0001',
          message = 'brouillon_trop_imbrique',
          detail = 'Le modèle a trop de niveaux imbriqués (listes dans des listes).';
    end;
    if not shape_ok then
      raise exception using
        errcode = 'P0001',
        message = 'forme_invalide',
        detail = left(
          'La version n''a pas la forme attendue : '
            || coalesce(
              (
                select string_agg(left(e, 200), ' | ' order by n)
                from unnest(shape_errors) with ordinality errs (e, n)
                where n <= 3
              ),
              'forme inconnue'
            ),
          1000
        );
    end if;

    select coalesce(
      jsonb_object_agg(
        m.id::text,
        coalesce(
          src.files -> m.id::text,
          jsonb_build_object(
            'kind', m.kind,
            'mime', m.mime,
            'path', m.path,
            'alt', m.alt,
            'transcript', m.transcript,
            'width', m.width,
            'height', m.height,
            'durationS', m.duration_s
          )
        )
      ),
      '{}'::jsonb
    )
    into new_files
    from public.media m
    where m.id = any (cited);

    prepared := src;
    prepared.body := new_body;
    prepared.files := new_files;
    prepared.media_ids := cited;
    prepared.template_ids := private.template_ids_of(new_body);
    prepared.block_types := private.block_types_of(new_body);
    created := private.insert_version(prepared, 'template', me);

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;

end;
$function$
;

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
$function$
;

create or replace function public.unpublish(content_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target public.contents;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = unpublish.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se retirent de l''app.';
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : il n''est déjà plus dans l''app.';
  end if;

  if target.live_version_id is not null or target.scheduled_at is not null
    or target.schedule_error is not null then
    update public.contents c
    set live_version_id = null,
      scheduled_at = null,
      scheduled_by = null,
      scheduled_rev = null,
      schedule_error = null
    where c.id = target.id;
  end if;

  return exists (select 1 from private.files_to_move());
end;
$function$
;

create or replace function public.unschedule(content_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target public.contents;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = unschedule.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.scheduled_at is null and target.schedule_error is null
    and target.scheduled_by is null then
    return false;
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille.';
  end if;

  update public.contents c
  set scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    schedule_error = null
  where c.id = target.id;
  return true;
end;
$function$
;

create or replace function private.run_due_publications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  due record;
  published integer := 0;
  failure text;
  writing boolean;
begin
  for due in
    select c.id, c.scheduled_at, c.scheduled_by, c.scheduled_rev
    from public.contents c
    where c.scheduled_at <= now() and c.deleted_at is null
    order by c.scheduled_at, c.id
    for update skip locked
  loop
    failure := null;
    begin
      if due.scheduled_by is null
        or not exists (select 1 from public.profiles p where p.id = due.scheduled_by) then
        failure := 'auteur_parti';
      else
        select exists (
          select 1
          from public.edit_locks l
          join public.contents x on x.id = l.content_id
          where l.content_id = due.id
            and l.holder_id is not null
            and l.heartbeat_at >= now() - private.lock_ttl()
            and x.draft_rev <> due.scheduled_rev
        ) into writing;

        if writing then
          if due.scheduled_at < now() - interval '1 hour' then
            failure := 'brouillon_en_cours_d_ecriture';
          end if;
        else
          perform private.do_publish(due.id, due.scheduled_by, 'scheduled');
          published := published + 1;
        end if;
      end if;
    exception
      when others then
        failure := case when sqlstate = 'P0001' then sqlerrm else 'erreur_inattendue' end;
    end;

    if failure is not null then
      update public.contents c
      set scheduled_at = null,
        scheduled_rev = null,
        schedule_error = left(failure, 100)
      where c.id = due.id;
    end if;
  end loop;

  if published > 0 then
    perform private.kick_files();
  end if;
  return published;
end;
$function$
;

create or replace function private.do_publish(target_content_id uuid, author_id uuid, publish_origin text, expected_rev integer DEFAULT NULL::integer)
 RETURNS versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target public.contents;
  writer text;
  body jsonb;
  prepared public.versions;
  created public.versions;
begin
  select * into target from public.contents c where c.id = target_content_id for update;
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
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le publier.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se publient.';
  end if;

  if not target.access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de publier.';
  end if;

  if publish_origin = 'manual' then
    writer := private.active_writer(target.id, author_id);
    if writer is not null then
      raise exception using
        errcode = 'P0001',
        message = 'verrou_tenu',
        detail = writer || ' écrit ce brouillon : reprends la main ou attends qu''il ait fini.',
        hint = writer;
    end if;
  end if;

  if expected_rev is not null and target.draft_rev <> expected_rev then
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'Le brouillon vient de changer (révision %s, et non %s) : relis-le avant de publier.',
        target.draft_rev, expected_rev
      );
  end if;

  body := private.resolve_linked(target.draft);

  if target.kind = 'page' then
    if target.slug is null then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_manquante',
        detail = 'Choisis l''adresse de la page avant de la publier.';
    end if;
    -- Deux pages publiées en même temps avec la même adresse : l'une attend l'autre.
    perform pg_advisory_xact_lock(hashtext('ruche.page_slug:' || target.slug));
    if exists (
      select 1
      from private.live l
      join public.versions v on v.id = l.version_id
      where l.kind = 'page' and v.slug = target.slug and l.content_id <> target.id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page en ligne a déjà cette adresse.';
    end if;
  end if;

  prepared := private.prepare_version(target, body);
  created := private.insert_version(prepared, publish_origin, author_id);

  update public.contents c
  set live_version_id = created.id,
    first_published_at = coalesce(c.first_published_at, created.published_at),
    scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    schedule_error = null
  where c.id = target.id;

  return created;
end;
$function$
;

create or replace function public.content_create(kind text, title text DEFAULT ''::text, template_sort text DEFAULT NULL::text, from_template_id uuid DEFAULT NULL::uuid, template_for text DEFAULT NULL::text)
 RETURNS contents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  clean_title text := normalize(btrim(coalesce(content_create.title, '')), NFC);
  starter public.contents;
  new_draft jsonb;
  created public.contents;
begin
  perform private.require_staff();

  if content_create.kind is null
    or content_create.kind not in ('article', 'episode', 'page', 'template') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Cette sorte de contenu n''existe pas.';
  end if;

  if (content_create.kind = 'template') <> (content_create.template_sort is not null)
    or coalesce(content_create.template_sort, 'style') not in ('style', 'shared', 'starter') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un modèle a une sorte (style, shared ou starter) ; les autres contenus n''en ont pas.';
  end if;

  if (content_create.template_sort is not distinct from 'starter')
      <> (content_create.template_for is not null)
    or coalesce(content_create.template_for, 'page') not in (
      'article', 'episode', 'page'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un point de départ sert à une sorte de contenu (article, episode ou page) ; les autres contenus et modèles n''en ont pas.';
  end if;

  if char_length(clean_title) > 200 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Le titre fait 200 caractères au plus.';
  end if;

  new_draft := private.empty_draft(clean_title);

  if content_create.from_template_id is not null then
    select * into starter
    from public.contents t
    where t.id = content_create.from_template_id
    for share;

    if content_create.kind = 'template'
      or not found
      or starter.kind <> 'template'
      or starter.template_sort <> 'starter'
      or starter.deleted_at is not null
      or starter.template_for is distinct from content_create.kind then
      raise exception using
        errcode = 'P0001',
        message = 'modele_indisponible',
        detail = 'Ce point de départ n''existe pas, n''est pas un modèle « point de départ » de '
          'cette section, ou est dans la corbeille.';
    end if;

    new_draft := jsonb_set(
      new_draft, '{blocks}', private.blocks_with_new_ids(starter.draft -> 'blocks')
    );
  end if;

  insert into public.contents (
    kind, draft, template_sort, template_for, created_by, draft_saved_by
  )
  values (
    content_create.kind,
    new_draft,
    content_create.template_sort,
    content_create.template_for,
    me,
    me
  )
  returning * into created;

  insert into public.edit_locks (content_id, holder_id, taken_at, heartbeat_at, draft_rev)
  values (created.id, me, now(), now(), created.draft_rev);

  return created;
end;
$function$
;

create or replace function public.template_create_from(content_id uuid, block_ids uuid[], name text, sort text, template_for text DEFAULT NULL::text)
 RETURNS contents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  clean_name text := normalize(btrim(coalesce(template_create_from.name, '')), NFC);
  source public.contents;
  wanted uuid[];
  picked jsonb;
  picked_count integer;
  resolved jsonb := '[]'::jsonb;
  b jsonb;
  t public.contents;
  created public.contents;
begin
  perform private.require_staff();

  if template_create_from.sort is null
    or template_create_from.sort not in ('style', 'shared', 'starter') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un modèle a une sorte : style, shared ou starter.';
  end if;

  if (template_create_from.sort = 'starter') <> (template_create_from.template_for is not null)
    or coalesce(template_create_from.template_for, 'page') not in (
      'article', 'episode', 'page'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un point de départ sert à une sorte de contenu (article, episode ou page) ; les autres modèles n''en ont pas.';
  end if;

  if clean_name = '' or char_length(clean_name) > 200 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Donne un nom au modèle (200 caractères au plus).';
  end if;

  select coalesce(array_agg(distinct x), '{}') into wanted
  from unnest(template_create_from.block_ids) x
  where x is not null;

  if template_create_from.block_ids is null
    or cardinality(wanted) = 0
    or cardinality(wanted) <> cardinality(template_create_from.block_ids) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Choisis au moins un bloc, chacun une fois.';
  end if;

  select * into source from public.contents c where c.id = template_create_from.content_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;
  if source.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour t''en servir.';
  end if;

  select coalesce(jsonb_agg(x.block order by x.n), '[]'::jsonb), count(*)
  into picked, picked_count
  from jsonb_array_elements(coalesce(source.draft -> 'blocks', '[]'::jsonb)) with ordinality x (block, n)
  where x.block ->> 'id' = any (array(select w::text from unnest(wanted) w));

  if picked_count <> cardinality(wanted) then
    raise exception using
      errcode = 'P0001',
      message = 'bloc_introuvable',
      detail = 'Un des blocs choisis n''est pas au premier niveau du brouillon enregistré : '
        'attends la fin de l''enregistrement, puis réessaie.';
  end if;

  if template_create_from.sort = 'shared' and picked_count <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'modele_un_seul_bloc',
      detail = 'Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, '
        'mets-les dans un encadré.';
  end if;

  for b in
    select x.block
    from jsonb_array_elements(picked) with ordinality x (block, n)
    order by x.n
  loop
    if b ->> 'type' = 'linked' then
      select * into t from public.contents c where c.id = (b ->> 'templateId')::uuid for share;
      if not found or t.kind <> 'template' or t.template_sort <> 'shared'
        or t.deleted_at is not null
        or jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) <> 1 then
        raise exception using
          errcode = 'P0001',
          message = 'modele_indisponible',
          detail = 'Un des blocs choisis vient d''un modèle qui n''existe plus, est dans la '
            'corbeille ou est vide.';
      end if;
      b := private.detached_copy(t.draft -> 'blocks' -> 0, b ->> 'id');
    end if;
    resolved := resolved || jsonb_build_array(b);
  end loop;

  insert into public.contents (
    kind, draft, template_sort, template_for, created_by, draft_saved_by
  )
  values (
    'template',
    jsonb_set(private.empty_draft(clean_name), '{blocks}', private.blocks_with_new_ids(resolved)),
    template_create_from.sort,
    template_create_from.template_for,
    me,
    me
  )
  returning * into created;

  return created;
end;
$function$
;

-- Le verrou d'un seul contenu : qui d'autre l'écrit en ce moment (null si personne).
create function private.active_writer(content uuid, except_member uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(p.full_name, ''), p.email, '')
  from public.edit_locks l
  left join public.profiles p on p.id = l.holder_id
  where l.content_id = content
    and l.holder_id is not null
    and l.holder_id is distinct from except_member
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1
$$;

revoke execute on function private.active_writer(uuid, uuid) from public, anon, authenticated;
drop function private.active_writer(uuid[], uuid);

-- Met un contenu à la corbeille, seul : il sort de l'app, sa programmation est annulée.
drop function public.trash(uuid);

create function public.trash(content_id uuid)
returns table (needs_file_sync boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target public.contents;
  writer text;
  uses text;
  facts jsonb;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = trash.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is not null then
    return query select false;
    return;
  end if;

  writer := private.active_writer(target.id, me);
  if writer is not null then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_tenu',
      detail = writer || ' écrit ce brouillon : attends qu''il ait fini, ou reprends la main.',
      hint = writer;
  end if;

  if target.kind = 'template' and target.template_sort = 'shared' then
    select
      string_agg(coalesce(nullif(c.title, ''), 'Sans titre'), ', ' order by c.title, c.id),
      jsonb_agg(nullif(c.title, '') order by c.title, c.id)
    into uses, facts
    from public.contents c
    where c.draft_template_ids @> array[target.id]
      and c.id <> target.id;

    if uses is not null then
      raise exception using
        errcode = 'P0001',
        message = 'modele_utilise',
        detail = left('Ce modèle est utilisé dans : ' || uses || '.', 1000),
        hint = facts::text;
    end if;
  end if;

  update public.contents c
  set live_version_id = null,
    scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    schedule_error = null,
    deleted_at = now(),
    deleted_by = me
  where c.id = target.id
    and c.deleted_at is null;

  update public.edit_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = target.id
    and l.holder_id is not null;

  return query select exists (select 1 from private.files_to_move());
end;
$$;

comment on function public.trash(uuid) is
  'Met un contenu à la corbeille (équipe en aal2) : il sort de l''app, sa programmation est '
  'annulée. needs_file_sync : des fichiers sont à déplacer (appeler la fonction files).';

revoke execute on function public.trash(uuid) from public, anon;
grant execute on function public.trash(uuid) to authenticated, service_role;

-- Restaure un contenu, seul, en brouillon ; une page dont l'adresse a été reprise revient sans.
create or replace function public.restore(content_id uuid)
returns table (restored integer, warnings text[])
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  target public.contents;
  new_slug text;
  notes text[] := '{}';
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
    return query select 0, notes;
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

  -- La sortie de la corbeille et le changement d'adresse dans la même commande : le garde de
  -- corbeille refuse toute autre modification d'un contenu qui y reste.
  update public.contents c
  set deleted_at = null, deleted_by = null, slug = new_slug
  where c.id = target.id;

  return query select 1, notes;
end;
$$;

-- Le frein des appels sans session de membre de la fonction files : un passage « kick » toutes
-- les 20 secondes au plus.
create or replace function public.files_claim_run(run_mode text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean;
begin
  if run_mode = 'kick' then
    update private.settings s
    set files_last_kick_at = now()
    where s.id
      and (s.files_last_kick_at is null or s.files_last_kick_at < now() - interval '20 seconds')
    returning true into claimed;
  end if;
  return coalesce(claimed, false);
end;
$$;

drop function private.version_hash(jsonb, jsonb);

alter table public.contents
  drop constraint contents_trash,
  drop constraint contents_schedule_complete,
  drop constraint contents_schedule_kind,
  drop constraint contents_template_for_value;

alter table public.contents
  drop column trash_batch,
  drop column scheduled_set_at;

alter table public.contents
  add constraint contents_trash
    check (deleted_at is not null or deleted_by is null),
  add constraint contents_schedule_complete
    check (scheduled_at is null or scheduled_rev is not null),
  add constraint contents_schedule_kind
    check (
      kind = any (array['article', 'episode', 'page'])
      or (
        scheduled_at is null and scheduled_by is null and scheduled_rev is null
        and schedule_error is null
      )
    ),
  add constraint contents_template_for_value
    check (template_for is null or template_for = any (array['article', 'episode', 'page']));

alter table public.versions
  drop constraint versions_body_hash_check,
  drop column body_hash;

alter table private.settings drop column files_last_audit_at;

-- La corbeille, sans lot : chaque élément y est seul.
create view public.trash_items
with (security_invoker = true)
as
select
  'file'::text as item_type,
  m.id,
  m.kind,
  m.name as title,
  m.deleted_at,
  coalesce(p.full_name, p.email) as deleted_by_name,
  m.deleted_at + interval '30 days' as purge_at,
  m.purge_error
from public.media m
left join public.profiles p on p.id = m.deleted_by
where m.deleted_at is not null
  and m.purge_requested_at is null
union all
select
  'content'::text,
  c.id,
  c.kind,
  nullif(c.title, ''),
  c.deleted_at,
  coalesce(p.full_name, p.email),
  c.deleted_at + interval '30 days',
  null::text
from public.contents c
left join public.profiles p on p.id = c.deleted_by
where c.deleted_at is not null;

comment on view public.trash_items is
  'La corbeille : fichiers (item_type file) et contenus (item_type content). purge_at : '
  'effacement automatique au bout de 30 jours.';

revoke all on public.trash_items from public, anon, authenticated, service_role;
grant select on public.trash_items to authenticated;
