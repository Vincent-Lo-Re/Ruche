-- Retour au niveau de #14 (décidé le 09/10/2026 : la traduction n'est pas pertinente pour le
-- moment). Retire ce qu'avaient ajouté les migrations …_langues.sql, …_termes_admin.sql et
-- …_traductions.sql : les langues de l'app, les termes de l'admin, les traductions des contenus.
-- Les fonctions changées par les traductions reprennent leur forme d'avant ; les lectures de l'app
-- (app_feed, app_page, app_content) ne prennent plus de langue. L'admin qui s'en servait est déjà
-- retirée (#22). L'éditeur des traductions reste sur la branche traductions-admin, pour plus tard.

-- 1. Les traductions -----------------------------------------------------------------------------

drop function public.translation_create(uuid, text, uuid);
drop function public.translation_save(uuid, text, integer, text, jsonb, jsonb, uuid, text[], text[]);
drop function public.translation_delete(uuid, text);
drop function public.translation_state(uuid);
drop function public.translation_lock_take(uuid, text, boolean, uuid);
drop function public.translation_lock_heartbeat(uuid, text, uuid);
drop function public.translation_lock_release(uuid, text, uuid);
drop function public.translation_lock_status(uuid, text, uuid);
drop function public.translation_publish(uuid, text, integer);
drop function public.translation_schedule(uuid, text, timestamptz);
drop function public.translation_unschedule(uuid, text);
drop function public.translation_unpublish(uuid, text);

drop function private.do_publish_translation(uuid, text, uuid, text, integer);
drop function private.check_translation_ready(public.contents, public.content_translations);
drop function private.translation_target(uuid, text);
drop function private.translation_writer(uuid, text, uuid);
drop function private.any_writer(uuid, uuid);
drop function private.translation_lock_state(uuid, text, uuid);
drop function private.translation_progress(public.contents, public.content_translations);
drop function private.translated_draft(public.contents, public.content_translations);
drop function private.translated_block(jsonb, jsonb);
drop function private.translated_leaf(jsonb, jsonb);
drop function private.translation_units(jsonb);
drop function private.version_texts(jsonb);
drop function private.doc_has_text(jsonb);
drop function private.source_blocks(jsonb);
drop function private.set_live_version(public.versions);
drop function private.served_version(uuid, text);
drop function private.reader_language(text);

drop function public.app_content(uuid, text);
drop function public.app_page(text, text);
drop function public.app_feed(text, uuid, text, integer, text);
drop function public.media_outdated(uuid);
drop function public.template_outdated(uuid);

-- Ce qui est en ligne : une ligne par contenu, comme avant.
drop view private.live;
create view private.live as
  select
    c.id as content_id,
    c.kind,
    v.id as version_id,
    v.access_level_id as level_id,
    al.rank as level_rank
  from public.contents c
  join public.versions v on v.id = c.live_version_id and v.content_id = c.id
  left join public.access_levels al on al.id = v.access_level_id
  where c.deleted_at is null and c.kind in ('article', 'episode', 'page');

drop table public.translation_locks;
drop table public.content_translations;
drop function private.content_translations_check();

alter table public.versions
  drop constraint versions_id_content_language_key,
  drop constraint versions_number_key,
  add constraint versions_number_key unique (content_id, number),
  drop column language,
  drop column source_rev;

drop trigger contents_40_source_language on public.contents;
drop function private.contents_source_language_check();
alter table public.contents
  drop column source_language,
  drop column untranslated;

-- 2. Les langues de l'app ------------------------------------------------------------------------

drop function public.app_languages();
drop function public.languages_set_default(text);
drop table public.languages;
drop function private.languages_keep_default();
drop function private.languages_keep_used();
drop function private.default_language();

-- 3. Les termes de l'admin -----------------------------------------------------------------------

drop table public.admin_terms;
drop function private.admin_terms_touch();

-- 4. Les fonctions reprennent leur forme d'avant les traductions -----------------------------------

CREATE OR REPLACE FUNCTION public.app_content(content_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.app_content_json(l.version_id)
  from private.live l
  where l.content_id = app_content.content_id
  limit 1
$function$;

CREATE OR REPLACE FUNCTION private.settings_already_applied(target contents, s jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if s is null or s = '{}'::jsonb then
    return true;
  end if;
  if jsonb_typeof(s) <> 'object' or exists (
    select 1 from jsonb_object_keys(s) k
    where k not in ('slug', 'access_level_id', 'category_ids')
  ) then
    return false;
  end if;

  if s ? 'slug' and (
    jsonb_typeof(s -> 'slug') not in ('string', 'null') or target.slug is distinct from s ->> 'slug'
  ) then
    return false;
  end if;
  if s ? 'access_level_id' and (
    not target.access_chosen
    or jsonb_typeof(s -> 'access_level_id') not in ('string', 'null')
    or target.access_level_id::text is distinct from s ->> 'access_level_id'
  ) then
    return false;
  end if;
  if s ? 'category_ids' and (
    jsonb_typeof(s -> 'category_ids') <> 'array'
    or array(
      select distinct x #>> '{}' from jsonb_array_elements(s -> 'category_ids') x order by 1
    ) <> array(
      select cc.category_id::text from public.content_categories cc
      where cc.content_id = target.id
      order by 1
    )
  ) then
    return false;
  end if;
  return true;
exception
  when others then
    return false;
end;
$function$;

CREATE OR REPLACE FUNCTION private.app_content_json(target_version_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', l.content_id,
    'versionId', v.id,
    'kind', l.kind,
    'title', v.body ->> 'title',
    'cover', coalesce(v.body -> 'cover', 'null'::jsonb),
    'slug', v.slug,
    'level', case
      when l.level_id is null then null
      else jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
    end,
    'locked', not access.unlocked,
    'blockTypes', to_jsonb(v.block_types),
    'blocks', case when access.unlocked then v.body -> 'blocks' end,
    'audio', case when access.unlocked then coalesce(v.body -> 'audio', 'null'::jsonb) end,
    'files', case
      when access.unlocked then v.files
      when v.cover_media_id is not null and v.files ? v.cover_media_id::text then
        jsonb_build_object(v.cover_media_id::text, v.files -> v.cover_media_id::text)
      else '{}'::jsonb
    end,
    'categoryIds', to_jsonb(array(
      select cat.id from public.categories cat
      where cat.id = any (v.category_ids)
      order by cat.position, cat.id
    )),
    'publishedAt', v.published_at,
    'firstPublishedAt', c.first_published_at
  )
  from private.live l
  join public.versions v on v.id = l.version_id
  join public.contents c on c.id = l.content_id
  left join public.access_levels al on al.id = l.level_id
  cross join lateral (
    select private.reader_rank() as rank
  ) reader
  cross join lateral (
    select l.level_id is null or coalesce(reader.rank >= l.level_rank, false) as unlocked
  ) access
  where l.version_id = target_version_id
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.app_page(slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.app_content_json(l.version_id)
  from private.live l
  join public.versions v on v.id = l.version_id
  where l.kind = 'page' and v.slug = app_page.slug
  order by v.published_at desc
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.app_feed(section text, category_id uuid DEFAULT NULL::uuid, before text DEFAULT NULL::text, lim integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  wanted_kind text;
  page_size integer := coalesce(app_feed.lim, 20);
  cursor_position integer;
  cursor_id uuid;
  page_items jsonb;
  found_count integer;
  last_id uuid;
begin
  wanted_kind := case app_feed.section
    when 'blog' then 'article'
    when 'podcasts' then 'episode'
  end;
  if wanted_kind is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La section doit être blog ou podcasts.';
  end if;

  if page_size < 1 or page_size > 50 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Une page contient de 1 à 50 éléments.';
  end if;

  if app_feed.before is not null then
    begin
      if app_feed.before !~ '^-?\d{1,10}~[0-9a-f-]{36}$' then
        raise exception 'curseur mal formé';
      end if;
      cursor_position := split_part(app_feed.before, '~', 1)::integer;
      cursor_id := split_part(app_feed.before, '~', 2)::uuid;
    exception
      when others then
        raise exception using
          errcode = 'P0001',
          message = 'demande_invalide',
          detail = 'Le curseur n''est pas celui d''une page précédente.';
    end;
  end if;

  if app_feed.category_id is not null and not exists (
    select 1 from public.categories cat
    where cat.id = app_feed.category_id and cat.section = app_feed.section
  ) then
    return jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null);
  end if;

  select
    coalesce(jsonb_agg(page.item order by page.list_position, page.content_id), '[]'),
    count(*)
  into page_items, found_count
  from (
    select
      c.id as content_id,
      c.list_position,
      jsonb_build_object(
        'id', c.id,
        'versionId', v.id,
        'kind', c.kind,
        'title', v.body ->> 'title',
        'cover', coalesce(v.body -> 'cover', 'null'::jsonb),
        -- Seulement l'image de présentation (informations figées à la publication).
        'files', case
          when v.cover_media_id is not null and v.files ? v.cover_media_id::text then
            jsonb_build_object(v.cover_media_id::text, v.files -> v.cover_media_id::text)
          else '{}'::jsonb
        end,
        'categoryIds', to_jsonb(array(
          select cat.id from public.categories cat
          where cat.id = any (v.category_ids)
          order by cat.position, cat.id
        )),
        'level', case
          when l.level_id is null then null
          else jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
        end,
        'locked', not (l.level_id is null or coalesce(reader.rank >= l.level_rank, false)),
        -- Durée du son d'un épisode (media.duration_s, figée à la publication), même verrouillé.
        'durationS', case
          when c.kind = 'episode' then v.files #> array[v.body #>> '{audio,mediaId}', 'durationS']
        end,
        'publishedAt', v.published_at,
        'firstPublishedAt', c.first_published_at
      ) as item
    from private.live l
    join public.contents c on c.id = l.content_id
    join public.versions v on v.id = l.version_id
    left join public.access_levels al on al.id = l.level_id
    cross join (select private.reader_rank() as rank) reader
    where l.kind = wanted_kind
      and c.first_published_at is not null
      and (app_feed.category_id is null or v.category_ids @> array[app_feed.category_id])
      and (cursor_id is null or (c.list_position, c.id) > (cursor_position, cursor_id))
    order by c.list_position, c.id
    limit page_size + 1
  ) page;

  if found_count > page_size then
    -- Un élément de plus que demandé : il y a une page suivante, qui commence après le dernier
    -- élément gardé.
    page_items := page_items - page_size;
    last_id := (page_items -> (page_size - 1) ->> 'id')::uuid;
    return jsonb_build_object(
      'items', page_items,
      'nextCursor', private.feed_cursor(
        (select c.list_position from public.contents c where c.id = last_id),
        last_id
      )
    );
  end if;

  return jsonb_build_object('items', page_items, 'nextCursor', null);
end;
$function$;

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
$function$;

CREATE OR REPLACE FUNCTION public.media_outdated(media_id uuid)
 RETURNS TABLE(content_id uuid, kind text, title text, version_id uuid, version_number integer, published_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_staff();
  return query
    select c.id, c.kind, nullif(v.body ->> 'title', ''), v.id, v.number, v.published_at
    from private.media_stale_live(media_outdated.media_id) s
    join public.contents c on c.id = s.content_id
    join public.versions v on v.id = s.version_id
    order by v.body ->> 'title', c.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.template_outdated(template_id uuid)
 RETURNS TABLE(content_id uuid, kind text, title text, version_id uuid, version_number integer, published_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_staff();
  return query
    select c.id, c.kind, nullif(v.body ->> 'title', ''), v.id, v.number, v.published_at
    from private.template_stale_live(template_outdated.template_id) s
    join public.contents c on c.id = s.content_id
    join public.versions v on v.id = s.version_id
    order by v.body ->> 'title', c.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.media_push(media_id uuid)
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
$function$;

CREATE OR REPLACE FUNCTION public.media_replace_live(old_id uuid, new_id uuid)
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
$function$;

CREATE OR REPLACE FUNCTION private.media_uses(target_media_id uuid)
 RETURNS TABLE(content_id uuid, kind text, title text, in_draft boolean, in_app boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with uses as (
    select c.id, true as in_draft, false as in_app
    from public.contents c
    where c.draft_media_ids @> array[target_media_id]
    union all
    select l.content_id, false, true
    from private.live l
    join public.versions v on v.id = l.version_id
    where v.media_ids @> array[target_media_id]
  )
  select
    c.id,
    c.kind,
    nullif(c.title, ''),
    bool_or(u.in_draft),
    bool_or(u.in_app)
  from uses u
  join public.contents c on c.id = u.id
  group by c.id, c.kind, c.title
  order by c.title, c.id
$function$;

CREATE OR REPLACE FUNCTION public.media_replace(old_id uuid, new_id uuid)
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
    where c.id = target.id;
    replaced := replaced + 1;
  end loop;

  perform set_config('ruche.detach_all', '', true);

  return jsonb_build_object('replaced', replaced, 'kept', kept);
end;
$function$;

CREATE OR REPLACE FUNCTION public.template_push(template_id uuid)
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
$function$;

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
    access_chosen = case
      when c.kind in ('article', 'episode', 'page') then true
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
$function$;

CREATE OR REPLACE FUNCTION public.save_draft(content_id uuid, base_rev integer, draft jsonb, settings jsonb DEFAULT NULL::jsonb, editor_session uuid DEFAULT NULL::uuid)
 RETURNS TABLE(draft_rev integer, draft_saved_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  saved_at timestamptz := now();
  s jsonb := coalesce(save_draft.settings, '{}'::jsonb);
  target public.contents;
  new_rev integer;
  new_slug text;
  new_level uuid;
  wanted_categories uuid[];
  failed_constraint text;
begin
  perform private.require_staff();

  if save_draft.content_id is null or save_draft.base_rev is null
    or save_draft.draft is null or jsonb_typeof(s) <> 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id, base_rev et draft sont obligatoires ; settings est un objet.';
  end if;

  -- Verrou de ligne : les enregistrements d'un même contenu passent un par un.
  select * into target from public.contents c where c.id = save_draft.content_id for update;
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
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
  end if;

  -- Tenir le verrou, c'est en être le détenteur, depuis la même ouverture de l'éditeur. Un
  -- verrou périmé mais que personne n'a repris reste le sien : l'enregistrement le rafraîchit.
  if not exists (
    select 1 from public.edit_locks l
    where l.content_id = target.id and l.holder_id = me
      and l.holder_session is not distinct from save_draft.editor_session
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_perdu',
      detail = 'Quelqu''un d''autre a pris la main sur ce brouillon.';
  end if;

  if target.draft_rev <> save_draft.base_rev then
    -- Réponse perdue (réseau coupé après l'enregistrement) : le même envoi a déjà donné la
    -- révision suivante. On renvoie ce qui est en base au lieu d'un faux conflit.
    if target.draft_rev = save_draft.base_rev + 1
      and target.draft_saved_by is not distinct from me
      and target.draft = save_draft.draft
      and private.settings_already_applied(target, s) then
      return query select target.draft_rev, target.draft_saved_at;
      return;
    end if;
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'Le brouillon a changé depuis ta dernière lecture (révision %s, et non %s).',
        target.draft_rev, save_draft.base_rev
      );
  end if;

  -- Réglages : clés connues et types attendus.
  if exists (
    select 1 from jsonb_object_keys(s) k
    where k not in ('slug', 'access_level_id', 'category_ids')
  )
    or (s ? 'slug' and jsonb_typeof(s -> 'slug') not in ('string', 'null'))
    or (s ? 'access_level_id' and (
      jsonb_typeof(s -> 'access_level_id') not in ('string', 'null')
      or coalesce(s ->> 'access_level_id', '00000000-0000-0000-0000-000000000000')
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ))
    or (s ? 'category_ids' and (
      jsonb_typeof(s -> 'category_ids') <> 'array'
      or exists (
        select 1 from jsonb_array_elements(s -> 'category_ids') x
        where jsonb_typeof(x) <> 'string'
          or (x #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    )) then
    raise exception using
      errcode = 'P0001',
      message = 'reglages_invalides',
      detail = 'Réglages attendus : slug (texte ou null), access_level_id (identifiant ou '
        'null), category_ids (liste d''identifiants).';
  end if;

  -- Niveau d'accès : Gratuit (null) ou une formule qui existe.
  if s ? 'access_level_id' then
    new_level := (s ->> 'access_level_id')::uuid;
    if new_level is not null
      and not exists (select 1 from public.access_levels a where a.id = new_level) then
      raise exception using
        errcode = 'P0001',
        message = 'niveau_invalide',
        detail = 'Cette formule n''existe plus.';
    end if;
  end if;

  if s ? 'slug' then
    new_slug := s ->> 'slug';
    if new_slug is not null and (
      char_length(new_slug) > 100 or new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_invalide',
        detail = 'L''adresse ne contient que des lettres minuscules sans accent, des chiffres et '
          'des tirets (100 caractères au plus).';
    end if;
    if new_slug is not null and exists (
      select 1 from public.contents c
      where c.kind = 'page' and c.slug = new_slug and c.deleted_at is null and c.id <> target.id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page a déjà cette adresse.';
    end if;
  end if;

  if s ? 'category_ids' then
    select coalesce(array_agg(distinct (x #>> '{}')::uuid), '{}')
    into wanted_categories
    from jsonb_array_elements(s -> 'category_ids') x;

    if exists (
      select 1 from unnest(wanted_categories) w (id)
      where not exists (select 1 from public.categories c where c.id = w.id)
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'categorie_invalide',
        detail = 'Une des catégories n''existe plus.';
    end if;
  end if;

  begin
    update public.contents c
    set draft = save_draft.draft,
      draft_rev = c.draft_rev + 1,
      draft_saved_at = saved_at,
      draft_saved_by = me,
      slug = case when s ? 'slug' then new_slug else c.slug end,
      access_level_id = case when s ? 'access_level_id' then new_level else c.access_level_id end,
      access_chosen = case when s ? 'access_level_id' then true else c.access_chosen end
    where c.id = target.id
    returning c.draft_rev into new_rev;
  exception
    -- Un réglage qui ne va pas avec la sorte (niveau d'accès sur un modèle…).
    when check_violation then
      get stacked diagnostics failed_constraint = constraint_name;
      if failed_constraint = 'contents_draft_size' then
        raise exception using
          errcode = 'P0001',
          message = 'brouillon_trop_lourd',
          detail = 'Le brouillon dépasse 256 Ko.';
      end if;
      raise exception using
        errcode = 'P0001',
        message = 'reglages_invalides',
        detail = 'Ce réglage ne s''applique pas à cette sorte de contenu.';
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page a déjà cette adresse.';
    -- La formule a été supprimée entre la vérification et l'enregistrement.
    when foreign_key_violation then
      raise exception using
        errcode = 'P0001',
        message = 'niveau_invalide',
        detail = 'Cette formule n''existe plus.';
  end;

  if s ? 'category_ids' then
    delete from public.content_categories cc
    where cc.content_id = target.id and cc.category_id <> all (wanted_categories);
    insert into public.content_categories (content_id, category_id)
    select target.id, w.id from unnest(wanted_categories) w (id)
    on conflict do nothing;
  end if;

  update public.edit_locks l
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = target.id;

  return query select new_rev, saved_at;
end;
$function$;

CREATE OR REPLACE FUNCTION private.run_due_publications()
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
$function$;

CREATE OR REPLACE FUNCTION public.trash(content_id uuid)
 RETURNS TABLE(needs_file_sync boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.housekeeping()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from cron.job_run_details d where d.end_time < now() - interval '14 days';
  delete from net._http_response r where r.created < now() - interval '7 days';
  delete from public.media_audit a
  where a.checked_at < now() - interval '90 days'
    and a.id <> (select max(b.id) from public.media_audit b);
  delete from public.edit_locks l where l.heartbeat_at < now() - interval '1 day';
end;
$function$;

-- 5. Droits ---------------------------------------------------------------------------------------

revoke execute on function
  public.app_content(uuid),
  public.app_page(text),
  public.app_feed(text, uuid, text, integer)
from public;
grant execute on function
  public.app_content(uuid),
  public.app_page(text),
  public.app_feed(text, uuid, text, integer)
to anon, authenticated, service_role;

revoke execute on function public.media_outdated(uuid), public.template_outdated(uuid)
from public, anon;
grant execute on function public.media_outdated(uuid), public.template_outdated(uuid)
to authenticated, service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;
