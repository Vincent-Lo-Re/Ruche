-- Un titre par section (décidé le 09/10/2026, docs/ADMINISTRATION.md, § 4) : deux articles, deux
-- épisodes ou deux pages ne portent pas le même titre. Un article et un épisode le peuvent ; les
-- modèles de bloc ne sont pas concernés. Les majuscules et les espaces ne comptent pas (« Mon
-- article » et « mon  Article » sont le même titre), les accents si. Un titre vide ne compte pas
-- (un brouillon sans titre ne se publie pas). La corbeille libère le titre : un contenu restauré
-- dont le titre a été repris revient renommé (« Mon article (2) »), de même pour une version
-- d'un titre repris depuis.
--
-- content_create et save_draft refusent un titre pris (titre_pris) ; restore et
-- revert_to_version renomment et le disent (avertissement titre_renomme). L'index unique tient la
-- règle quoi qu'il arrive. content_title_taken dit à l'admin, pendant qu'on tape, quel contenu
-- porte déjà ce titre.

-- La forme comparée d'un titre : NFC, espaces du bord retirés, espaces du milieu réduits à un
-- seul, en minuscules.
create function private.title_key(title text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(
    regexp_replace(normalize(coalesce(title, ''), NFC), '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    '[[:space:]]+', ' ', 'g'
  ))
$$;

revoke execute on function private.title_key(text) from public, anon, authenticated;

-- Vrai si un autre contenu de la même section, hors corbeille, porte déjà ce titre.
create function private.title_taken(content_kind text, title text, except_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select content_kind in ('article', 'episode', 'page')
    and private.title_key(title) <> ''
    and exists (
      select 1 from public.contents c
      where c.kind = content_kind
        and c.deleted_at is null
        and c.id is distinct from except_id
        and private.title_key(c.title) = private.title_key(title_taken.title)
    )
$$;

revoke execute on function private.title_taken(text, text, uuid) from public, anon, authenticated;

-- Un titre libre pour ce contenu : le sien s'il l'est, sinon « Titre (2) », « Titre (3) »… (un
-- « (n) » déjà au bout est remplacé), 200 caractères au plus. Attend, le temps de la transaction,
-- qu'une autre commande qui pose le même titre ait fini.
create function private.free_title(content_kind text, title text, except_id uuid)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text;
  suffix text;
  candidate text := title;
  n integer := 1;
begin
  if content_kind not in ('article', 'episode', 'page') or private.title_key(title) = '' then
    return title;
  end if;
  perform pg_advisory_xact_lock(hashtext('ruche.title:' || content_kind || ':' || private.title_key(title)));
  if not private.title_taken(content_kind, title, except_id) then
    return title;
  end if;
  base := regexp_replace(title, '[[:space:]]*\([0-9]+\)[[:space:]]*$', '');
  loop
    n := n + 1;
    suffix := ' (' || n || ')';
    candidate := left(base, 200 - char_length(suffix)) || suffix;
    exit when not private.title_taken(content_kind, candidate, except_id);
  end loop;
  return candidate;
end;
$$;

revoke execute on function private.free_title(text, text, uuid) from public, anon, authenticated;

-- Les doublons déjà là (une installation qui en a) : le plus ancien garde son titre, les autres
-- sont renommés « (2) », « (3) »…
do $$
declare
  dup record;
  new_title text;
begin
  for dup in
    select c.id, c.kind, c.title
    from (
      select c.*, row_number() over (
        partition by c.kind, private.title_key(c.title) order by c.created_at, c.id
      ) as rank
      from public.contents c
      where c.kind in ('article', 'episode', 'page')
        and c.deleted_at is null
        and private.title_key(c.title) <> ''
    ) c
    where c.rank > 1
    order by c.created_at, c.id
  loop
    new_title := private.free_title(dup.kind, dup.title, dup.id);
    update public.contents c
    set draft = jsonb_set(c.draft, '{title}', to_jsonb(new_title)),
      draft_rev = c.draft_rev + 1
    where c.id = dup.id;
  end loop;
end;
$$;

create unique index contents_title_key
  on public.contents (kind, private.title_key(title))
  where kind in ('article', 'episode', 'page')
    and deleted_at is null
    and private.title_key(title) <> '';

-- Pendant qu'on tape : le contenu de la section qui porte déjà ce titre (aucun s'il est libre).
-- L'équipe seulement.
create function public.content_title_taken(
  kind text,
  title text,
  except_id uuid default null
)
returns table (taken_id uuid, taken_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_staff();
  return query
    select c.id, c.title
    from public.contents c
    where content_title_taken.kind in ('article', 'episode', 'page')
      and c.kind = content_title_taken.kind
      and c.deleted_at is null
      and c.id is distinct from content_title_taken.except_id
      and private.title_key(content_title_taken.title) <> ''
      and private.title_key(c.title) = private.title_key(content_title_taken.title)
    limit 1;
end;
$$;

revoke execute on function public.content_title_taken(text, text, uuid) from public, anon;
grant execute on function public.content_title_taken(text, text, uuid) to authenticated;

-- content_create : un titre pris est refusé.
create or replace function public.content_create(
  kind text,
  title text default '',
  template_sort text default null,
  from_template_id uuid default null,
  template_for text default null
)
returns public.contents
language plpgsql
security definer
set search_path = ''
as $$
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

  if private.title_taken(content_create.kind, clean_title, null) then
    raise exception using
      errcode = 'P0001',
      message = 'titre_pris',
      detail = 'Un autre contenu de cette section porte déjà ce titre.';
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

  begin
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
  exception
    -- Le même titre posé au même moment par quelqu'un d'autre.
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'titre_pris',
        detail = 'Un autre contenu de cette section porte déjà ce titre.';
  end;

  insert into public.edit_locks (content_id, holder_id, taken_at, heartbeat_at, draft_rev)
  values (created.id, me, now(), now(), created.draft_rev);

  return created;
end;
$$;

-- save_draft : un titre pris est refusé, comme une adresse prise.
create or replace function public.save_draft(
  content_id uuid,
  base_rev integer,
  draft jsonb,
  settings jsonb default null,
  editor_session uuid default null
)
returns table (draft_rev integer, draft_saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Le titre : un seul par section (hors corbeille).
  if private.title_taken(target.kind, save_draft.draft ->> 'title', target.id) then
    raise exception using
      errcode = 'P0001',
      message = 'titre_pris',
      detail = 'Un autre contenu de cette section porte déjà ce titre.';
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
    -- Le même titre ou la même adresse posés au même moment par quelqu'un d'autre.
    when unique_violation then
      get stacked diagnostics failed_constraint = constraint_name;
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
$$;

-- restore : un titre repris entre-temps revient renommé (avertissement titre_renomme) ; le titre
-- du contenu restauré est renvoyé (title), pour que l'admin le dise.
drop function public.restore(uuid);
create function public.restore(content_id uuid)
returns table (restored integer, warnings text[], title text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  target public.contents;
  new_slug text;
  new_title text;
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

  return query select 1, notes, new_title;
end;
$$;

revoke execute on function public.restore(uuid) from public, anon;
grant execute on function public.restore(uuid) to authenticated;

-- revert_to_version : le titre d'une version repris depuis par un autre contenu revient renommé
-- (avertissement titre_renomme).
create or replace function public.revert_to_version(
  version_id uuid,
  editor_session uuid default null
)
returns table (draft_rev integer, draft_saved_at timestamptz, warnings text[])
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
