-- Ruche est une plateforme, installée pour chaque client (08/10/2026) : la base ne nomme plus
-- aucun client.
--
-- 1. Les noms techniques prennent le nom de Ruche, « ruche.* » : le réglage de transaction
--    ruche.detach_all (posé par media_replace et template_detach_all, lu par
--    contents_trash_guard) et les clés des verrous consultatifs (formules, catégories, listes,
--    adresses des pages). Les fonctions qui s'en servent sont recréées telles quelles, avec ce
--    seul changement, dans une seule transaction : posé et lu changent ensemble.
--
-- 2. L'adresse du site web du client (Paramètres, onglet « Identité de l'admin ») : le lien
--    « Site web » du header y mène ; vide, pas de lien. Elle était écrite dans le code.

create or replace function private.access_levels_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.name := normalize(btrim(new.name), NFC);
  if tg_op = 'INSERT' and new.rank is null then
    -- Deux ajouts en même temps ne prennent pas le même rang.
    perform pg_advisory_xact_lock(hashtext('ruche.access_levels'));
    select coalesce(max(a.rank), 0) + 1 into new.rank from public.access_levels a;
  end if;
  return new;
end;
$function$
;

create or replace function private.contents_trash_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  -- title est une colonne générée : pas encore calculée dans un déclencheur BEFORE.
  authors constant text[] := array['created_by', 'draft_saved_by', 'deleted_by', 'scheduled_by', 'title'];
  draft_columns constant text[] := array[
    'draft', 'draft_rev', 'draft_media_ids', 'draft_template_ids', 'draft_saved_at',
    'draft_saved_by', 'title'
  ];
begin
  if old.deleted_at is null or new.deleted_at is null then
    return new;
  end if;

  if (to_jsonb(new) - authors) = (to_jsonb(old) - authors)
    and (new.created_by is null or new.created_by = old.created_by)
    and (new.draft_saved_by is null or new.draft_saved_by = old.draft_saved_by)
    and (new.deleted_by is null or new.deleted_by = old.deleted_by)
    and (new.scheduled_by is null or new.scheduled_by = old.scheduled_by) then
    return new;
  end if;

  if coalesce(current_setting('ruche.detach_all', true), '') = 'on'
    and (to_jsonb(new) - draft_columns) = (to_jsonb(old) - draft_columns) then
    return new;
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'dans_la_corbeille',
    detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
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
    writer := private.active_writer(array[target.id], author_id);
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
    scheduled_set_at = null,
    schedule_error = null
  where c.id = target.id;

  return created;
end;
$function$
;

create or replace function public.access_levels_reorder(ids uuid[])
 RETURNS SETOF access_levels
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_admin();

  -- Un rangement à la fois.
  perform pg_advisory_xact_lock(hashtext('ruche.access_levels'));
  perform 1 from public.access_levels a order by a.id for update;

  if access_levels_reorder.ids is null
    or cardinality(access_levels_reorder.ids) <> (select count(*) from public.access_levels)
    or (select count(distinct x) from unnest(access_levels_reorder.ids) x)
      <> cardinality(access_levels_reorder.ids)
    or exists (
      select 1 from unnest(access_levels_reorder.ids) x
      where x is null or not exists (select 1 from public.access_levels a where a.id = x)
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La liste doit contenir toutes les formules, chacune une fois.';
  end if;

  update public.access_levels a
  set rank = o.position
  from unnest(access_levels_reorder.ids) with ordinality o (id, position)
  where a.id = o.id and a.rank <> o.position;

  return query select * from public.access_levels a order by a.rank;
end;
$function$
;

create or replace function public.categories_reorder(section text, ids uuid[])
 RETURNS SETOF categories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_staff();

  if categories_reorder.section is null
    or categories_reorder.section not in ('blog', 'podcasts') then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La section doit être blog ou podcasts.';
  end if;

  -- Un rangement à la fois par section ; une catégorie ajoutée ou supprimée entre-temps attend.
  perform pg_advisory_xact_lock(hashtext('ruche.categories:' || categories_reorder.section));
  perform 1 from public.categories c
  where c.section = categories_reorder.section
  order by c.id
  for update;

  if categories_reorder.ids is null
    or cardinality(categories_reorder.ids) <> (
      select count(*) from public.categories c where c.section = categories_reorder.section
    )
    or (select count(distinct x) from unnest(categories_reorder.ids) x)
      <> cardinality(categories_reorder.ids)
    or exists (
      select 1 from unnest(categories_reorder.ids) x
      where x is null or not exists (
        select 1 from public.categories c
        where c.id = x and c.section = categories_reorder.section
      )
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La liste doit contenir toutes les catégories de la section, chacune une fois.';
  end if;

  update public.categories c
  set position = o.n - 1
  from unnest(categories_reorder.ids) with ordinality o (id, n)
  where c.id = o.id and c.position <> o.n - 1;

  return query
  select * from public.categories c
  where c.section = categories_reorder.section
  order by c.position, c.id;
end;
$function$
;

create or replace function public.contents_reorder(kind text, ids uuid[])
 RETURNS TABLE(id uuid, list_position integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
begin
  perform private.require_staff();

  if contents_reorder.kind is null
    or contents_reorder.kind not in ('article', 'episode') then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Seuls les articles et les épisodes se rangent.';
  end if;

  -- Un rangement à la fois par sorte.
  perform pg_advisory_xact_lock(hashtext('ruche.list:' || contents_reorder.kind));
  perform 1 from public.contents c
  where c.kind = contents_reorder.kind and c.deleted_at is null
  order by c.id
  for update;

  if contents_reorder.ids is null
    or cardinality(contents_reorder.ids) <> (
      select count(*) from public.contents c
      where c.kind = contents_reorder.kind and c.deleted_at is null
    )
    or (select count(distinct x) from unnest(contents_reorder.ids) x)
      <> cardinality(contents_reorder.ids)
    or exists (
      select 1 from unnest(contents_reorder.ids) x
      where x is null or not exists (
        select 1 from public.contents c
        where c.id = x and c.kind = contents_reorder.kind and c.deleted_at is null
      )
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La liste doit contenir tous les contenus de la section, chacun une fois.';
  end if;

  update public.contents c
  set list_position = o.n - 1
  from unnest(contents_reorder.ids) with ordinality o (id, n)
  where c.id = o.id and c.list_position <> o.n - 1;

  return query
  select c.id, c.list_position from public.contents c
  where c.kind = contents_reorder.kind and c.deleted_at is null
  order by c.list_position, c.id;
end;
$function$
;

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
$function$
;

create or replace function public.restore(content_id uuid)
 RETURNS TABLE(restored integer, warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  target public.contents;
  root public.contents;
  root_slug text;
  roots integer := 0;
  notes text[] := '{}';
  affected integer;
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

  perform 1 from public.contents c
  where c.trash_batch = target.trash_batch
  order by c.id
  for update;

  -- Chaque élément du lot sort de la corbeille dans la même commande que son changement
  -- d'adresse : le garde de corbeille refuse toute autre modification d'un contenu qui y reste.
  for root in
    select c.*
    from public.contents c
    where c.trash_batch = target.trash_batch
    order by c.id
  loop
    root_slug := root.slug;

    if root.kind = 'page' and root.slug is not null then
      -- Deux restaurations en même temps avec la même adresse : l'une attend l'autre.
      perform pg_advisory_xact_lock(hashtext('ruche.page_slug:' || root.slug));
      if exists (
        select 1 from public.contents c
        where c.kind = 'page' and c.slug = root.slug and c.deleted_at is null and c.id <> root.id
      ) then
        root_slug := null;
        notes := notes || 'adresse_retiree'::text;
      end if;
    end if;

    update public.contents c
    set deleted_at = null,
      deleted_by = null,
      trash_batch = null,
      slug = root_slug
    where c.id = root.id;
    roots := roots + 1;
  end loop;

  update public.contents c
  set deleted_at = null, deleted_by = null, trash_batch = null
  where c.trash_batch = target.trash_batch;
  get diagnostics affected = row_count;

  return query select affected + roots, notes;
end;
$function$
;

create or replace function public.template_detach_all(template_id uuid)
 RETURNS TABLE(content_id uuid, draft_rev integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  tpl public.contents;
  tpl_block jsonb;
  users uuid[];
  writer record;
  target record;
  new_blocks jsonb;
  new_rev integer;
begin
  perform private.require_staff();

  -- En partage : le modèle ne change pas pendant le geste. Un brouillon qui ajoute un bloc lié
  -- prend aussi un verrou partagé (pas d'attente croisée) : il sera nommé par « trash » s'il
  -- arrive pendant le geste.
  select * into tpl from public.contents t where t.id = template_detach_all.template_id for share;
  if not found or tpl.kind <> 'template' or tpl.template_sort <> 'shared' then
    raise exception using
      errcode = 'P0001',
      message = 'modele_introuvable',
      detail = 'Ce modèle n''existe plus, ou n''est pas un bloc partagé.';
  end if;
  -- null si le modèle est vide (ancien état) : ses blocs liés sont alors simplement retirés.
  tpl_block := tpl.draft -> 'blocks' -> 0;

  select coalesce(array_agg(c.id order by c.id), '{}') into users
  from public.contents c
  where c.draft_template_ids @> array[tpl.id] and c.id <> tpl.id;

  perform 1 from public.contents c where c.id = any (users) order by c.id for update;

  select
    coalesce(nullif(p.full_name, ''), p.email, '') as name,
    coalesce(nullif(c.title, ''), 'Sans titre') as title
  into writer
  from public.edit_locks l
  join public.contents c on c.id = l.content_id
  left join public.profiles p on p.id = l.holder_id
  where l.content_id = any (users)
    and l.holder_id is not null
    and l.holder_id is distinct from me
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1;

  if found then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_tenu',
      detail = format(
        '%s écrit « %s », qui utilise ce modèle : attends qu''il ait fini, ou reprends la main '
          'sur ce brouillon.',
        coalesce(nullif(writer.name, ''), 'Un autre membre'), writer.title
      ),
      hint = writer.name;
  end if;

  -- Le garde de corbeille laisse passer ces changements du brouillon (§ 3.2, cas 3).
  perform set_config('ruche.detach_all', 'on', true);

  for target in
    select c.id, c.draft from public.contents c where c.id = any (users) order by c.id
  loop
    select coalesce(
      jsonb_agg(
        case
          when b ->> 'type' = 'linked' and b ->> 'templateId' = tpl.id::text
            then private.detached_copy(tpl_block, b ->> 'id')
          else b
        end
        order by n
      ),
      '[]'::jsonb
    )
    into new_blocks
    from jsonb_array_elements(target.draft -> 'blocks') with ordinality list (b, n)
    where not (
      b ->> 'type' = 'linked' and b ->> 'templateId' = tpl.id::text and tpl_block is null
    );

    update public.contents c
    set draft = jsonb_set(c.draft, '{blocks}', new_blocks),
      draft_rev = c.draft_rev + 1,
      draft_saved_at = now(),
      draft_saved_by = me
    where c.id = target.id
    returning c.draft_rev into new_rev;

    update public.edit_locks l
    set draft_rev = new_rev
    where l.content_id = target.id;

    return query select target.id, new_rev;
  end loop;

  perform set_config('ruche.detach_all', '', true);
end;
$function$
;


alter table public.admin_identity
  add column website_url text check (
    website_url is null
    or (
      char_length(website_url) <= 2048
      and website_url ~ '^https://[^\s/?#]+\.[^\s/?#]+(/\S*)?$'
    )
  );

comment on column public.admin_identity.website_url is
  'L''adresse du site web du client (https), où mène le lien « Site web » du header ; null : pas '
  'de lien.';

grant update (website_url) on public.admin_identity to authenticated;

-- admin_brand() la donne aussi, avec le reste de l'identité. Sa forme change, elle est donc
-- recréée.
drop function public.admin_brand();

create function public.admin_brand()
returns table (
  name text,
  logotype_light text,
  logotype_dark text,
  monogram_light text,
  monogram_dark text,
  login_image text,
  login_monogram_motion boolean,
  login_monogram_motions text[],
  contact_email text,
  language text,
  website_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email, i.language, i.website_url
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, adresse de contact, site web, logotype et monogramme pour fond '
  'clair et sombre, image et monogramme animé de l''écran de connexion) et sa langue, lisibles '
  'sans compte pour la page de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;
