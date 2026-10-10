-- Un nom par modèle de bloc (décidé le 09/10/2026, docs/ADMINISTRATION.md, § 4) : deux modèles
-- ne portent pas le même nom, quelle que soit leur sorte (mise en forme, bloc partagé, point de
-- départ). Mêmes règles que pour les titres des contenus (…_titres_uniques.sql) : majuscules et
-- espaces ignorés, accents comptés, nom vide et corbeille hors règle, « (2) » au retour de la
-- corbeille.
--
-- private.title_taken, private.free_title et content_title_taken acceptent la sorte « template » ;
-- content_create, save_draft et restore suivent donc d'eux-mêmes. template_create_from
-- (« Enregistrer comme modèle ») refuse un nom pris (titre_pris). L'index unique s'étend aux
-- modèles ; les doublons déjà là sont renommés.

-- Les sortes concernées : une seule liste, lue par les fonctions ci-dessous.
create function private.unique_title_kind(content_kind text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select content_kind in ('article', 'episode', 'page', 'template')
$$;

revoke execute on function private.unique_title_kind(text) from public, anon, authenticated;

create or replace function private.title_taken(content_kind text, title text, except_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.unique_title_kind(content_kind)
    and private.title_key(title) <> ''
    and exists (
      select 1 from public.contents c
      where c.kind = content_kind
        and c.deleted_at is null
        and c.id is distinct from except_id
        and private.title_key(c.title) = private.title_key(title_taken.title)
    )
$$;

create or replace function private.free_title(content_kind text, title text, except_id uuid)
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
  if not private.unique_title_kind(content_kind) or private.title_key(title) = '' then
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

create or replace function public.content_title_taken(
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
    where private.unique_title_kind(content_title_taken.kind)
      and c.kind = content_title_taken.kind
      and c.deleted_at is null
      and c.id is distinct from content_title_taken.except_id
      and private.title_key(content_title_taken.title) <> ''
      and private.title_key(c.title) = private.title_key(content_title_taken.title)
    limit 1;
end;
$$;

-- Les modèles déjà en double : le plus ancien garde son nom, les autres sont renommés.
do $$
declare
  dup record;
  new_title text;
begin
  for dup in
    select c.id, c.title
    from (
      select c.*, row_number() over (
        partition by private.title_key(c.title) order by c.created_at, c.id
      ) as rank
      from public.contents c
      where c.kind = 'template'
        and c.deleted_at is null
        and private.title_key(c.title) <> ''
    ) c
    where c.rank > 1
    order by c.created_at, c.id
  loop
    new_title := private.free_title('template', dup.title, dup.id);
    update public.contents c
    set draft = jsonb_set(c.draft, '{title}', to_jsonb(new_title)),
      draft_rev = c.draft_rev + 1
    where c.id = dup.id;
  end loop;
end;
$$;

drop index public.contents_title_key;
create unique index contents_title_key
  on public.contents (kind, private.title_key(title))
  where kind in ('article', 'episode', 'page', 'template')
    and deleted_at is null
    and private.title_key(title) <> '';

-- « Enregistrer comme modèle » : un nom pris est refusé.
create or replace function public.template_create_from(content_id uuid, block_ids uuid[], name text, sort text, template_for text DEFAULT NULL::text)
returns public.contents
language plpgsql
security definer
set search_path = ''
as $$
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

  if private.title_taken('template', clean_name, null) then
    raise exception using
      errcode = 'P0001',
      message = 'titre_pris',
      detail = 'Un autre modèle porte déjà ce nom.';
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

  begin
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
  exception
    -- Le même nom posé au même moment par quelqu'un d'autre.
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'titre_pris',
        detail = 'Un autre modèle porte déjà ce nom.';
  end;

  return created;
end;
$$
