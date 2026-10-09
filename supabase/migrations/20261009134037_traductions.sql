-- Les traductions des contenus (ADMIN § 7 bis, étape 1 : la base). Décidé le 09/10/2026.
--
-- La langue d'origine d'un contenu décide de sa structure : elle reste le contenu tel qu'il est
-- (contents.draft, sa publication, sa programmation, son verrou), et les fonctions existantes la
-- servent sans changement. Une traduction (content_translations) ne garde que ses textes : son
-- titre, le texte de chaque bloc et la légende ou le texte alternatif de chaque image, repérés par
-- l'identifiant du bloc d'origine, et le son d'un épisode. À la publication, la base assemble la
-- structure d'origine et les textes traduits en une version figée de cette langue.
--
-- Chaque langue a son état (brouillon, en ligne, programmé) et son historique (versions.language,
-- null pour la langue d'origine) ; son verrou (translation_locks). Ce qui est commun à toutes les
-- langues (catégories, formule, adresse, image de présentation, place dans la liste) se règle
-- depuis la langue d'origine, et une traduction le reprend à sa publication.
--
-- « À revoir » : à chaque texte enregistré, la base note une empreinte du texte d'origine
-- (source_marks) ; si le texte d'origine change ensuite, l'empreinte ne correspond plus.
-- « Traduit automatiquement » : les textes remplis par la machine (machine_blocks), jusqu'à ce
-- qu'une personne les modifie ou les valide.
--
-- L'app demande une langue (app_feed, app_page, app_content) : elle reçoit la traduction en ligne
-- dans cette langue ; sinon, selon le choix fait pour le contenu (contents.untranslated), la langue
-- par défaut ou la langue d'origine, ou rien. Elle reçoit aussi la langue servie, pour l'afficher.
--
-- Les blocs partagés (modèles) restent dans la langue d'origine : leurs traductions viendront
-- dans une étape suivante.

-- 1. La langue d'origine d'un contenu, et ce que voit un lecteur sans traduction ------------------

create function private.default_language()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select l.code from public.languages l where l.is_default
$$;

-- Les contenus existants prennent la langue par défaut (une valeur fixe, pour ne réveiller aucun
-- déclencheur de contents) ; les nouveaux aussi, au moment de leur création.
do $$
begin
  execute format(
    'alter table public.contents add column source_language text not null default %L',
    coalesce(private.default_language(), 'fr')
  );
end;
$$;

alter table public.contents
  alter column source_language set default private.default_language(),
  add constraint contents_source_language_fkey
    foreign key (source_language) references public.languages (code),
  add column untranslated text not null default 'show_default'
    constraint contents_untranslated_check check (untranslated in ('show_default', 'hide'));

create index contents_source_language_idx on public.contents (source_language);

comment on column public.contents.source_language is
  'La langue d''origine : celle du brouillon, qui décide de la structure des traductions. Elle ne '
  'change que tant que le contenu n''a aucune traduction.';
comment on column public.contents.untranslated is
  'Ce que voit un lecteur dont la langue n''a pas de traduction en ligne : show_default (la langue '
  'par défaut, sinon la langue d''origine) ou hide (rien).';

-- 2. Les versions de chaque langue ----------------------------------------------------------------

alter table public.versions
  add column language text
    constraint versions_language_check check (language is null or language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  add column source_rev integer;

comment on column public.versions.language is
  'La langue d''une version traduite ; null pour la langue d''origine du contenu.';
comment on column public.versions.source_rev is
  'Pour une version traduite : la révision du brouillon d''origine dont elle a pris la structure.';

-- Un historique par langue : les numéros reprennent à 1 dans chaque langue.
alter table public.versions
  drop constraint versions_number_key,
  add constraint versions_number_key unique nulls not distinct (content_id, language, number),
  add constraint versions_id_content_language_key unique (id, content_id, language);

-- 3. Les traductions -----------------------------------------------------------------------------

create table public.content_translations (
  content_id uuid not null references public.contents (id) on delete cascade,
  language text not null references public.languages (code),
  title text not null default '' check (char_length(title) <= 200),
  -- { "<id du bloc>": { "doc": … } } pour un texte, { "caption": …, "alt": … } pour une image.
  texts jsonb not null default '{}'
    check (jsonb_typeof(texts) = 'object' and octet_length(texts::text) <= 262144),
  -- Le son d'un épisode dans cette langue ({ "mediaId": … }), exigé pour publier.
  audio jsonb check (audio is null or jsonb_typeof(audio) = 'object'),
  audio_media_id uuid generated always as ((audio ->> 'mediaId')::uuid) stored,
  -- Empreinte du texte d'origine au moment de la traduction, par bloc (et « title »).
  source_marks jsonb not null default '{}' check (jsonb_typeof(source_marks) = 'object'),
  -- Les textes remplis par la traduction automatique, pas encore relus.
  machine_blocks text[] not null default '{}',
  draft_rev integer not null default 1 check (draft_rev >= 1),
  draft_saved_at timestamptz not null default now(),
  draft_saved_by uuid references public.profiles (id) on delete set null,
  live_version_id uuid,
  first_published_at timestamptz,
  scheduled_at timestamptz,
  scheduled_by uuid references public.profiles (id) on delete set null,
  scheduled_rev integer,
  schedule_error text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  primary key (content_id, language),
  constraint content_translations_schedule_complete
    check (scheduled_at is null or scheduled_rev is not null),
  constraint content_translations_live_version_fkey
    foreign key (live_version_id, content_id, language)
    references public.versions (id, content_id, language)
    on delete set null (live_version_id)
);

create index content_translations_language_idx on public.content_translations (language);
create index content_translations_live_version_fk_idx
  on public.content_translations (live_version_id, content_id, language)
  where live_version_id is not null;
create index content_translations_scheduled_idx
  on public.content_translations (scheduled_at) where scheduled_at is not null;
create index content_translations_audio_idx
  on public.content_translations (audio_media_id) where audio_media_id is not null;
create index content_translations_draft_saved_by_idx
  on public.content_translations (draft_saved_by);
create index content_translations_scheduled_by_idx on public.content_translations (scheduled_by);
create index content_translations_created_by_idx on public.content_translations (created_by);

comment on table public.content_translations is
  'Les traductions d''un contenu, une par langue : les textes seulement (titre, texte des blocs, '
  'légende et texte alternatif des images, son d''un épisode), sur la structure de la langue '
  'd''origine ; avec leur publication et leur programmation. Lecture par l''équipe ; écriture par '
  'les fonctions translation_*.';

alter table public.content_translations enable row level security;
revoke all on public.content_translations from anon, authenticated;
grant select on public.content_translations to authenticated;

create policy "Traductions : lecture par l'équipe"
  on public.content_translations
  for select
  to authenticated
  using ((select public.is_staff()));

-- Une traduction : un article, un épisode ou une page, dans une autre langue que l'origine.
create function private.content_translations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contents;
begin
  select * into target from public.contents c where c.id = new.content_id;
  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se traduisent.';
  end if;
  if new.language = target.source_language then
    raise exception using
      errcode = 'P0001',
      message = 'langue_d_origine',
      detail = 'C''est la langue d''origine de ce contenu.';
  end if;
  return new;
end;
$$;

create trigger content_translations_check
  before insert or update of content_id, language on public.content_translations
  for each row execute function private.content_translations_check();

-- La langue d'origine ne change plus dès qu'une traduction existe : leurs empreintes
-- deviendraient fausses.
create function private.contents_source_language_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_language is distinct from old.source_language and exists (
    select 1 from public.content_translations t where t.content_id = new.id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'langue_d_origine_fixee',
      detail = 'Ce contenu a des traductions : sa langue d''origine ne change plus.';
  end if;
  return new;
end;
$$;

create trigger contents_40_source_language
  before update of source_language on public.contents
  for each row execute function private.contents_source_language_check();

-- Une langue utilisée par un contenu ne se retire pas : on l'arrête (elle disparaît de l'app, et
-- ses traductions restent).
create function private.languages_keep_used()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.contents c where c.source_language = old.code)
    or exists (select 1 from public.content_translations t where t.language = old.code) then
    raise exception 'langue_utilisee'
      using errcode = '23514',
        detail = 'Des contenus sont écrits ou traduits dans cette langue : arrête-la plutôt.';
  end if;
  return old;
end;
$$;

create trigger languages_keep_used
  before delete on public.languages
  for each row execute function private.languages_keep_used();

-- 4. Le verrou d'une traduction (comme edit_locks, par langue) -----------------------------------

create table public.translation_locks (
  content_id uuid not null,
  language text not null,
  holder_id uuid references public.profiles (id) on delete set null,
  holder_session uuid,
  taken_at timestamptz,
  heartbeat_at timestamptz not null default now(),
  draft_rev integer not null default 1,
  primary key (content_id, language),
  foreign key (content_id, language)
    references public.content_translations (content_id, language) on delete cascade,
  constraint translation_locks_session check (holder_id is not null or holder_session is null),
  constraint translation_locks_taken check (holder_id is null or taken_at is not null)
);

create index translation_locks_holder_idx on public.translation_locks (holder_id);

comment on table public.translation_locks is
  'Qui écrit la traduction d''un contenu dans une langue (comme edit_locks pour la langue '
  'd''origine). Lecture par l''équipe ; écriture par translation_lock_*.';

alter table public.translation_locks enable row level security;
revoke all on public.translation_locks from anon, authenticated;
grant select on public.translation_locks to authenticated;

create policy "Verrous des traductions : lecture par l'équipe"
  on public.translation_locks
  for select
  to authenticated
  using ((select public.is_staff()));

alter publication supabase_realtime add table public.translation_locks;

-- 5. Ce qui est en ligne : chaque langue -----------------------------------------------------------

-- Une ligne par version en ligne : celle de la langue d'origine (language null) et celle de chaque
-- traduction dans une langue active. served_language : la langue de la version.
create or replace view private.live as
  select
    c.id as content_id,
    c.kind,
    v.id as version_id,
    v.access_level_id as level_id,
    al.rank as level_rank,
    null::text as language,
    c.source_language as served_language,
    c.first_published_at
  from public.contents c
  join public.versions v on v.id = c.live_version_id and v.content_id = c.id
  left join public.access_levels al on al.id = v.access_level_id
  where c.deleted_at is null and c.kind in ('article', 'episode', 'page')
  union all
  select
    c.id,
    c.kind,
    v.id,
    v.access_level_id,
    al.rank,
    t.language,
    t.language,
    t.first_published_at
  from public.content_translations t
  join public.contents c on c.id = t.content_id
  join public.languages lang on lang.code = t.language and lang.enabled
  join public.versions v on v.id = t.live_version_id and v.content_id = t.content_id
  left join public.access_levels al on al.id = v.access_level_id
  where c.deleted_at is null and c.kind in ('article', 'episode', 'page');

-- La langue que sert l'app : celle demandée si elle est active, sinon la langue par défaut.
create function private.reader_language(wanted text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select l.code from public.languages l where l.code = wanted and l.enabled),
    private.default_language()
  )
$$;

-- La version d'un contenu que voit un lecteur de cette langue : sa traduction ; sinon, si le
-- contenu le permet, la langue par défaut, puis la langue d'origine ; sinon rien.
create function private.served_version(target_content_id uuid, reader text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.version_id
  from private.live l
  join public.contents c on c.id = l.content_id
  where l.content_id = target_content_id
    and (
      l.served_language = reader
      or (
        c.untranslated = 'show_default'
        and (l.served_language = private.default_language() or l.language is null)
      )
    )
  order by
    case
      when l.served_language = reader then 0
      when l.served_language = private.default_language() then 1
      else 2
    end
  limit 1
$$;

create or replace function private.app_content_json(target_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.content_id,
    'versionId', v.id,
    'kind', l.kind,
    'language', l.served_language,
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
    'firstPublishedAt', l.first_published_at
  )
  from private.live l
  join public.versions v on v.id = l.version_id
  left join public.access_levels al on al.id = l.level_id
  cross join lateral (
    select private.reader_rank() as rank
  ) reader
  cross join lateral (
    select l.level_id is null or coalesce(reader.rank >= l.level_rank, false) as unlocked
  ) access
  where l.version_id = target_version_id
  limit 1
$$;

-- 6. Les lectures de l'app reçoivent la langue du lecteur -------------------------------------------

drop function public.app_content(uuid);
create function public.app_content(content_id uuid, language text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.app_content_json(
    private.served_version(app_content.content_id, private.reader_language(app_content.language))
  )
$$;

drop function public.app_page(text);
create function public.app_page(slug text, language text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.app_content_json(
    private.served_version(page.content_id, private.reader_language(app_page.language))
  )
  from (
    select l.content_id
    from private.live l
    join public.versions v on v.id = l.version_id
    where l.kind = 'page' and v.slug = app_page.slug
    order by v.published_at desc
    limit 1
  ) page
$$;

drop function public.app_feed(text, uuid, text, integer);
create function public.app_feed(
  section text,
  category_id uuid default null,
  before text default null,
  lim integer default 20,
  language text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_kind text;
  reader text := private.reader_language(app_feed.language);
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
        'language', l.served_language,
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
        'locked', not (l.level_id is null or coalesce(reader_rank.rank >= l.level_rank, false)),
        -- Durée du son d'un épisode (media.duration_s, figée à la publication), même verrouillé.
        'durationS', case
          when c.kind = 'episode' then v.files #> array[v.body #>> '{audio,mediaId}', 'durationS']
        end,
        'publishedAt', v.published_at,
        'firstPublishedAt', l.first_published_at
      ) as item
    from public.contents c
    cross join lateral (select private.served_version(c.id, reader) as version_id) served
    join private.live l on l.version_id = served.version_id
    join public.versions v on v.id = l.version_id
    left join public.access_levels al on al.id = l.level_id
    cross join (select private.reader_rank() as rank) reader_rank
    where c.kind = wanted_kind
      and c.deleted_at is null
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
$$;

revoke execute on function
  public.app_content(uuid, text),
  public.app_page(text, text),
  public.app_feed(text, uuid, text, integer, text)
from public;
grant execute on function
  public.app_content(uuid, text),
  public.app_page(text, text),
  public.app_feed(text, uuid, text, integer, text)
to anon, authenticated, service_role;

-- 7. Les textes d'une traduction : unités, empreintes, assemblage -----------------------------------

-- Les blocs d'origine, au premier niveau et dans les encadrés (un bloc lié reste dans la langue
-- d'origine).
create function private.source_blocks(draft jsonb)
returns table (block jsonb)
language sql
immutable
set search_path = ''
as $$
  select b
  from jsonb_array_elements(coalesce(draft -> 'blocks', '[]'::jsonb)) b
  where b ->> 'type' in ('text', 'image')
  union all
  select inner_block
  from jsonb_array_elements(coalesce(draft -> 'blocks', '[]'::jsonb)) b
  cross join lateral jsonb_array_elements(
    case when b ->> 'type' = 'box' then b -> 'blocks' else '[]'::jsonb end
  ) inner_block
  where inner_block ->> 'type' in ('text', 'image')
$$;

-- Un texte (doc de Tiptap) qui contient autre chose que des espaces.
create function private.doc_has_text(doc jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_path_query(coalesce(doc, 'null'::jsonb), 'lax $.**.text') x
    where jsonb_typeof(x) = 'string' and (x #>> '{}') ~ '[^[:space:]]'
  )
$$;

-- Ce qui se traduit dans un brouillon d'origine : le titre et chaque bloc de texte ou d'image.
-- required : il faut une traduction pour publier (un texte non vide, une légende non vide ; le
-- texte alternatif d'une image se traduit sans être exigé). mark : l'empreinte du texte d'origine.
create function private.translation_units(draft jsonb)
returns table (unit text, required boolean, mark text)
language sql
immutable
set search_path = ''
as $$
  select 'title', coalesce(draft ->> 'title', '') ~ '[^[:space:]]', md5(coalesce(draft ->> 'title', ''))
  union all
  select
    b ->> 'id',
    case
      when b ->> 'type' = 'text' then private.doc_has_text(b -> 'doc')
      else coalesce(b ->> 'caption', '') ~ '[^[:space:]]'
    end,
    case
      when b ->> 'type' = 'text' then md5(coalesce(b -> 'doc', 'null'::jsonb)::text)
      else md5(jsonb_build_array(b -> 'caption', b -> 'alt')::text)
    end
  from private.source_blocks(draft) b (b)
$$;

-- Un bloc de texte ou d'image avec ses textes traduits (une légende ou un texte alternatif vide
-- garde celui de l'origine).
create function private.translated_leaf(block jsonb, texts jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'text' and jsonb_typeof(texts -> (block ->> 'id') -> 'doc') = 'object' then
      block || jsonb_build_object('doc', texts -> (block ->> 'id') -> 'doc')
    when block ->> 'type' = 'image' and texts ? (block ->> 'id') then
      block
        || case
          when coalesce(texts -> (block ->> 'id') ->> 'caption', '') ~ '[^[:space:]]'
          then jsonb_build_object('caption', texts -> (block ->> 'id') -> 'caption')
          else '{}'::jsonb
        end
        || case
          when coalesce(texts -> (block ->> 'id') ->> 'alt', '') ~ '[^[:space:]]'
          then jsonb_build_object('alt', texts -> (block ->> 'id') -> 'alt')
          else '{}'::jsonb
        end
    else block
  end
$$;

-- Un bloc d'origine avec ses textes traduits, encadrés compris (un encadré ne contient pas
-- d'encadré).
create function private.translated_block(block jsonb, texts jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'box' then
      jsonb_set(
        block,
        '{blocks}',
        coalesce(
          (
            select jsonb_agg(private.translated_leaf(inner_block, texts) order by n)
            from jsonb_array_elements(block -> 'blocks') with ordinality inner_list (inner_block, n)
          ),
          '[]'::jsonb
        )
      )
    else private.translated_leaf(block, texts)
  end
$$;

-- Le brouillon d'une traduction : la structure d'origine, ses textes, et le son d'un épisode.
create function private.translated_draft(source public.contents, t public.content_translations)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_set(
    source.draft
      || jsonb_build_object(
        'title', t.title,
        'audio', case
          when source.kind = 'episode' then coalesce(t.audio, 'null'::jsonb)
          else coalesce(source.draft -> 'audio', 'null'::jsonb)
        end
      ),
    '{blocks}',
    coalesce(
      (
        select jsonb_agg(private.translated_block(b, t.texts) order by n)
        from jsonb_array_elements(coalesce(source.draft -> 'blocks', '[]'::jsonb)) with ordinality list (b, n)
      ),
      '[]'::jsonb
    )
  )
$$;

-- L'état des textes d'une traduction : ce qui manque pour publier, ce qui est à revoir (le texte
-- d'origine a changé depuis), ce que la machine a rempli sans relecture.
create function private.translation_progress(source public.contents, t public.content_translations)
returns table (missing text[], review text[], machine text[])
language sql
stable
set search_path = ''
as $$
  with units as (
    select * from private.translation_units(source.draft)
  ),
  translated as (
    select
      u.unit,
      u.required,
      u.mark,
      case
        when u.unit = 'title' then t.title ~ '[^[:space:]]'
        when jsonb_typeof(t.texts -> u.unit -> 'doc') = 'object' then
          private.doc_has_text(t.texts -> u.unit -> 'doc')
        -- Une image : sa légende, exigée si l'origine en a une ; sinon son texte alternatif.
        else coalesce(t.texts -> u.unit ->> 'caption', '') ~ '[^[:space:]]'
          or (not u.required and coalesce(t.texts -> u.unit ->> 'alt', '') ~ '[^[:space:]]')
      end as done
    from units u
  )
  select
    coalesce(array_agg(x.unit order by x.unit) filter (where x.required and not x.done), '{}'),
    coalesce(
      array_agg(x.unit order by x.unit) filter (
        where x.done and t.source_marks ? x.unit and t.source_marks ->> x.unit <> x.mark
      ),
      '{}'
    ),
    coalesce(
      array_agg(x.unit order by x.unit) filter (where x.unit = any (t.machine_blocks)),
      '{}'
    )
  from translated x
$$;

-- 8. Créer, enregistrer, supprimer une traduction --------------------------------------------------

create function private.translation_lock_state(
  target_content_id uuid,
  target_language text,
  editor_session uuid
)
returns table (
  mine boolean,
  holder_id uuid,
  holder_name text,
  taken_at timestamptz,
  heartbeat_at timestamptz,
  is_active boolean,
  draft_rev integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      l.holder_id = (select auth.uid()) and l.holder_session is not distinct from editor_session,
      false
    ),
    l.holder_id,
    case when l.holder_id is not null then coalesce(nullif(p.full_name, ''), p.email) end,
    case when l.holder_id is not null then l.taken_at end,
    l.heartbeat_at,
    coalesce(l.holder_id is not null and l.heartbeat_at >= now() - private.lock_ttl(), false),
    t.draft_rev
  from public.content_translations t
  left join public.translation_locks l
    on l.content_id = t.content_id and l.language = t.language
  left join public.profiles p on p.id = l.holder_id
  where t.content_id = target_content_id and t.language = target_language
$$;

-- Quelqu'un d'autre écrit ce contenu, dans sa langue d'origine ou dans une traduction.
create function private.any_writer(content uuid, except_member uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(p.full_name, ''), p.email, '')
  from (
    select l.holder_id, l.heartbeat_at
    from public.edit_locks l
    where l.content_id = content
    union all
    select l.holder_id, l.heartbeat_at
    from public.translation_locks l
    where l.content_id = content
  ) l
  left join public.profiles p on p.id = l.holder_id
  where l.holder_id is not null
    and l.holder_id is distinct from except_member
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1
$$;

-- Quelqu'un d'autre écrit cette traduction.
create function private.translation_writer(content uuid, lang text, except_member uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(p.full_name, ''), p.email, '')
  from public.translation_locks l
  left join public.profiles p on p.id = l.holder_id
  where l.content_id = content
    and l.language = lang
    and l.holder_id is not null
    and l.holder_id is distinct from except_member
    and l.heartbeat_at >= now() - private.lock_ttl()
$$;

-- Le contenu et sa traduction, verrouillés (contenu en partage, traduction en écriture) ; refuse
-- un contenu absent ou à la corbeille, et une traduction absente.
create function private.translation_target(
  target_content_id uuid,
  target_language text,
  out source public.contents,
  out t public.content_translations
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  select * into source from public.contents c where c.id = target_content_id for share;
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
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
  end if;

  select * into t
  from public.content_translations x
  where x.content_id = target_content_id and x.language = target_language
  for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'traduction_introuvable',
      detail = 'Ce contenu n''a pas de traduction dans cette langue.';
  end if;
end;
$$;

create function public.translation_create(
  content_id uuid,
  language text,
  editor_session uuid default null
)
returns public.content_translations
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target public.contents;
  created public.content_translations;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = translation_create.content_id for share;
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
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le traduire.';
  end if;

  if not exists (
    select 1 from public.languages l where l.code = translation_create.language and l.enabled
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'langue_invalide',
      detail = 'Cette langue n''est pas une langue active de l''installation.';
  end if;

  if exists (
    select 1 from public.content_translations t
    where t.content_id = target.id and t.language = translation_create.language
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'traduction_existante',
      detail = 'Ce contenu a déjà une traduction dans cette langue.';
  end if;

  insert into public.content_translations (content_id, language, draft_saved_by, created_by)
  values (target.id, translation_create.language, me, me)
  returning * into created;

  insert into public.translation_locks (
    content_id, language, holder_id, holder_session, taken_at, heartbeat_at, draft_rev
  )
  values (
    created.content_id, created.language, me, translation_create.editor_session, now(), now(),
    created.draft_rev
  );

  return created;
end;
$$;

create function public.translation_save(
  content_id uuid,
  language text,
  base_rev integer,
  title text,
  texts jsonb,
  audio jsonb default null,
  editor_session uuid default null,
  reviewed text[] default '{}',
  machine text[] default '{}'
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
  target record;
  source public.contents;
  t public.content_translations;
  clean_title text := normalize(btrim(coalesce(translation_save.title, '')), NFC);
  new_audio jsonb := case
    when jsonb_typeof(translation_save.audio) = 'object' then translation_save.audio
  end;
  shape_ok boolean;
  shape_errors text[];
  changed text[];
  touched text[];
  marks jsonb;
  new_rev integer;
begin
  perform private.require_staff();

  if translation_save.content_id is null or translation_save.language is null
    or translation_save.base_rev is null or translation_save.texts is null
    or jsonb_typeof(translation_save.texts) <> 'object'
    or (translation_save.audio is not null
      and jsonb_typeof(translation_save.audio) not in ('object', 'null')) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id, language, base_rev et texts (un objet) sont obligatoires ; audio est '
        'un objet ou null.';
  end if;

  select * into target from private.translation_target(translation_save.content_id, translation_save.language);
  source := target.source;
  t := target.t;

  if not exists (
    select 1 from public.translation_locks l
    where l.content_id = t.content_id and l.language = t.language and l.holder_id = me
      and l.holder_session is not distinct from translation_save.editor_session
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_perdu',
      detail = 'Quelqu''un d''autre a pris la main sur cette traduction.';
  end if;

  if t.draft_rev <> translation_save.base_rev then
    -- Réponse perdue : le même envoi a déjà donné la révision suivante.
    if t.draft_rev = translation_save.base_rev + 1
      and t.draft_saved_by is not distinct from me
      and t.title = clean_title
      and t.texts = translation_save.texts
      and t.audio is not distinct from new_audio then
      return query select t.draft_rev, t.draft_saved_at;
      return;
    end if;
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'La traduction a changé depuis ta dernière lecture (révision %s, et non %s).',
        t.draft_rev, translation_save.base_rev
      );
  end if;

  if char_length(clean_title) > 200 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Le titre fait 200 caractères au plus.';
  end if;

  -- Les textes : { id: { doc } } ou { id: { caption, alt } }, vérifiés par le schéma des blocs.
  if exists (
    select 1
    from jsonb_each(translation_save.texts) e
    where jsonb_typeof(e.value) <> 'object'
      or e.value = '{}'::jsonb
      or exists (
        select 1 from jsonb_object_keys(e.value) k where k not in ('doc', 'caption', 'alt')
      )
      or (e.value ? 'doc' and (e.value ? 'caption' or e.value ? 'alt'))
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'forme_invalide',
      detail = 'Chaque texte traduit est { doc } pour un bloc de texte, { caption, alt } pour une '
        'image.';
  end if;

  if octet_length(translation_save.texts::text) > 262144 then
    raise exception using
      errcode = 'P0001',
      message = 'brouillon_trop_lourd',
      detail = 'La traduction dépasse 256 Ko.';
  end if;

  begin
    shape_ok := extensions.jsonb_matches_schema(
      private.blocks_schema('draft'),
      private.empty_draft('') || jsonb_build_object(
        'blocks',
        coalesce(
          (
            select jsonb_agg(
              case
                when e.value ? 'doc' then
                  jsonb_build_object('id', e.key, 'type', 'text', 'doc', e.value -> 'doc')
                else jsonb_build_object(
                  'id', e.key, 'type', 'image', 'mediaId', null,
                  'caption', coalesce(e.value -> 'caption', 'null'::jsonb),
                  'alt', coalesce(e.value -> 'alt', 'null'::jsonb)
                )
              end
            )
            from jsonb_each(translation_save.texts) e
          ),
          '[]'::jsonb
        )
      )
    );
  exception
    when internal_error then
      raise exception using
        errcode = 'P0001',
        message = 'brouillon_trop_imbrique',
        detail = 'La traduction a trop de niveaux imbriqués (listes dans des listes).';
  end;
  if not shape_ok then
    raise exception using
      errcode = 'P0001',
      message = 'forme_invalide',
      detail = 'Un texte traduit n''a pas la forme attendue.';
  end if;

  -- Le son d'un épisode : un fichier audio prêt.
  if new_audio is not null then
    if source.kind <> 'episode'
      or coalesce(new_audio ->> 'mediaId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or exists (select 1 from jsonb_object_keys(new_audio) k where k <> 'mediaId') then
      raise exception using
        errcode = 'P0001',
        message = 'forme_invalide',
        detail = 'Le son d''une traduction est { mediaId }, pour un épisode seulement.';
    end if;
    perform 1 from public.media m where m.id = (new_audio ->> 'mediaId')::uuid for share;
    if not exists (
      select 1 from public.media m
      where m.id = (new_audio ->> 'mediaId')::uuid
        and m.status = 'ready' and m.deleted_at is null
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_indisponible',
        detail = 'Ce son n''existe plus, est dans la corbeille ou n''est pas encore prêt.';
    end if;
    if exists (
      select 1 from public.media m
      where m.id = (new_audio ->> 'mediaId')::uuid and m.kind <> 'audio'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_inadapte',
        detail = 'Ce fichier n''est pas un son.';
    end if;
  end if;

  -- Ce qui a changé, ce qui est validé : l'empreinte d'origine du moment.
  changed := array(
    select 'title' where t.title is distinct from clean_title
    union
    select k
    from (
      select jsonb_object_keys(translation_save.texts) k
      union
      select jsonb_object_keys(t.texts)
    ) keys
    where translation_save.texts -> k is distinct from t.texts -> k
  );
  touched := array(
    select unnest(changed)
    union
    select unnest(coalesce(translation_save.reviewed, '{}'))
    union
    select unnest(coalesce(translation_save.machine, '{}'))
  );

  select t.source_marks || coalesce(jsonb_object_agg(u.unit, u.mark), '{}'::jsonb)
  into marks
  from private.translation_units(source.draft) u
  where u.unit = any (touched);

  update public.content_translations x
  set title = clean_title,
    texts = translation_save.texts,
    audio = new_audio,
    source_marks = marks,
    machine_blocks = array(
      select m from unnest(x.machine_blocks) m
      where not (m = any (changed)) and not (m = any (coalesce(translation_save.reviewed, '{}')))
      union
      select unnest(coalesce(translation_save.machine, '{}'))
    ),
    draft_rev = x.draft_rev + 1,
    draft_saved_at = saved_at,
    draft_saved_by = me
  where x.content_id = t.content_id and x.language = t.language
  returning x.draft_rev into new_rev;

  update public.translation_locks l
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = t.content_id and l.language = t.language;

  return query select new_rev, saved_at;
end;
$$;

create function public.translation_delete(content_id uuid, language text)
returns table (needs_file_sync boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target record;
  writer text;
begin
  perform private.require_staff();

  select * into target from private.translation_target(translation_delete.content_id, translation_delete.language);

  writer := private.translation_writer((target.t).content_id, (target.t).language, me);
  if writer is not null then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_tenu',
      detail = writer || ' écrit cette traduction : attends qu''il ait fini, ou reprends la main.',
      hint = writer;
  end if;

  delete from public.content_translations t
  where t.content_id = (target.t).content_id and t.language = (target.t).language;

  return query select exists (select 1 from private.files_to_move());
end;
$$;

-- L'état de chaque traduction d'un contenu, pour l'admin.
create function public.translation_state(content_id uuid)
returns table (
  language text,
  missing text[],
  review text[],
  machine text[],
  ready boolean,
  modified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  source public.contents;
begin
  perform private.require_staff();

  select * into source from public.contents c where c.id = translation_state.content_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  return query
    select
      t.language,
      p.missing,
      p.review,
      p.machine,
      cardinality(p.missing) = 0 and (source.kind <> 'episode' or t.audio is not null),
      v.id is not null and (
        v.draft_rev <> t.draft_rev or v.source_rev is distinct from source.draft_rev
      )
    from public.content_translations t
    cross join lateral private.translation_progress(source, t) p
    left join public.versions v on v.id = t.live_version_id
    where t.content_id = source.id
    order by t.language;
end;
$$;

-- 9. Le verrou d'une traduction --------------------------------------------------------------------

create function public.translation_lock_take(
  content_id uuid,
  language text,
  force boolean default false,
  editor_session uuid default null
)
returns table (
  mine boolean,
  holder_id uuid,
  holder_name text,
  taken_at timestamptz,
  heartbeat_at timestamptz,
  is_active boolean,
  draft_rev integer
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target record;
begin
  perform private.require_staff();

  select * into target
  from private.translation_target(translation_lock_take.content_id, translation_lock_take.language);

  insert into public.translation_locks as l (
    content_id, language, holder_id, holder_session, taken_at, heartbeat_at, draft_rev
  )
  values (
    (target.t).content_id, (target.t).language, me, translation_lock_take.editor_session,
    now(), now(), (target.t).draft_rev
  )
  on conflict on constraint translation_locks_pkey do update
  set holder_id = excluded.holder_id,
    holder_session = excluded.holder_session,
    taken_at = case
      when l.holder_id = excluded.holder_id
        and l.holder_session is not distinct from excluded.holder_session
      then l.taken_at
      else excluded.taken_at
    end,
    heartbeat_at = excluded.heartbeat_at,
    draft_rev = excluded.draft_rev
  where l.holder_id is null
    or l.holder_id = excluded.holder_id
    or l.heartbeat_at < now() - private.lock_ttl()
    or coalesce(translation_lock_take.force, false);

  return query
    select * from private.translation_lock_state(
      (target.t).content_id, (target.t).language, translation_lock_take.editor_session
    );
end;
$$;

create function public.translation_lock_heartbeat(
  content_id uuid,
  language text,
  editor_session uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  update public.translation_locks l
  set heartbeat_at = now()
  where l.content_id = translation_lock_heartbeat.content_id
    and l.language = translation_lock_heartbeat.language
    and l.holder_id = (select auth.uid())
    and l.holder_session is not distinct from translation_lock_heartbeat.editor_session;
  return found;
end;
$$;

create function public.translation_lock_release(
  content_id uuid,
  language text,
  editor_session uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  update public.translation_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = translation_lock_release.content_id
    and l.language = translation_lock_release.language
    and l.holder_id = (select auth.uid())
    and l.holder_session is not distinct from translation_lock_release.editor_session;
  return found;
end;
$$;

create function public.translation_lock_status(
  content_id uuid,
  language text,
  editor_session uuid default null
)
returns table (
  mine boolean,
  holder_id uuid,
  holder_name text,
  taken_at timestamptz,
  heartbeat_at timestamptz,
  is_active boolean,
  draft_rev integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  if not exists (
    select 1 from public.content_translations t
    where t.content_id = translation_lock_status.content_id
      and t.language = translation_lock_status.language
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'traduction_introuvable',
      detail = 'Ce contenu n''a pas de traduction dans cette langue.';
  end if;

  return query
    select * from private.translation_lock_state(
      translation_lock_status.content_id,
      translation_lock_status.language,
      translation_lock_status.editor_session
    );
end;
$$;

-- 10. Publier, programmer, retirer une traduction ---------------------------------------------------

-- Ce que la publication d'une traduction exige, en plus de ce qu'exige le contenu : tous les
-- textes traduits, et le son d'un épisode.
create function private.check_translation_ready(source public.contents, t public.content_translations)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  missing text[];
begin
  select p.missing into missing from private.translation_progress(source, t) p;
  if cardinality(missing) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'traduction_incomplete',
      detail = format('Il reste %s texte(s) à traduire.', cardinality(missing)),
      hint = to_jsonb(missing)::text;
  end if;
end;
$$;

create function private.do_publish_translation(
  target_content_id uuid,
  target_language text,
  author_id uuid,
  publish_origin text,
  expected_rev integer default null
)
returns public.versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  source public.contents;
  t public.content_translations;
  writer text;
  translated public.contents;
  prepared public.versions;
  created public.versions;
begin
  select * into target from private.translation_target(target_content_id, target_language);
  source := target.source;
  t := target.t;

  if source.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se publient.';
  end if;

  if not source.access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de publier.';
  end if;

  if publish_origin = 'manual' then
    writer := private.translation_writer(t.content_id, t.language, author_id);
    if writer is not null then
      raise exception using
        errcode = 'P0001',
        message = 'verrou_tenu',
        detail = writer || ' écrit cette traduction : reprends la main ou attends qu''il ait fini.',
        hint = writer;
    end if;
  end if;

  if expected_rev is not null and t.draft_rev <> expected_rev then
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'La traduction vient de changer (révision %s, et non %s) : relis-la avant de publier.',
        t.draft_rev, expected_rev
      );
  end if;

  perform private.check_translation_ready(source, t);

  if source.kind = 'page' then
    if source.slug is null then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_manquante',
        detail = 'Choisis l''adresse de la page avant de la publier.';
    end if;
    perform pg_advisory_xact_lock(hashtext('ruche.page_slug:' || source.slug));
    if exists (
      select 1
      from private.live l
      join public.versions v on v.id = l.version_id
      where l.kind = 'page' and v.slug = source.slug and l.content_id <> source.id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page en ligne a déjà cette adresse.';
    end if;
  end if;

  translated := source;
  translated.draft := private.translated_draft(source, t);

  prepared := private.prepare_version(translated, private.resolve_linked(translated.draft));
  prepared.language := t.language;
  prepared.draft_rev := t.draft_rev;
  prepared.source_rev := source.draft_rev;
  created := private.insert_version(prepared, publish_origin, author_id);

  update public.content_translations x
  set live_version_id = created.id,
    first_published_at = coalesce(x.first_published_at, created.published_at),
    scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    schedule_error = null
  where x.content_id = t.content_id and x.language = t.language;

  return created;
end;
$$;

create function public.translation_publish(content_id uuid, language text, expected_rev integer)
returns table (
  version_id uuid,
  version_number integer,
  published_at timestamptz,
  needs_file_sync boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.versions;
begin
  perform private.require_staff();

  if translation_publish.content_id is null or translation_publish.language is null
    or translation_publish.expected_rev is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id, language et expected_rev sont obligatoires.';
  end if;

  created := private.do_publish_translation(
    translation_publish.content_id,
    translation_publish.language,
    (select auth.uid()),
    'manual',
    translation_publish.expected_rev
  );

  return query select
    created.id,
    created.number,
    created.published_at,
    exists (select 1 from private.files_to_move());
end;
$$;

create function public.translation_schedule(content_id uuid, language text, at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  perform private.require_staff();

  if translation_schedule.content_id is null or translation_schedule.language is null
    or translation_schedule.at is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id, language et at sont obligatoires.';
  end if;

  select * into target
  from private.translation_target(translation_schedule.content_id, translation_schedule.language);

  if (target.source).kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se programment.';
  end if;

  if not (target.source).access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de programmer.';
  end if;

  perform private.check_translation_ready(target.source, target.t);
  perform private.check_publish_requirements(
    (target.source).kind, private.translated_draft(target.source, target.t)
  );

  if translation_schedule.at <= now() then
    raise exception using
      errcode = 'P0001',
      message = 'date_passee',
      detail = 'Choisis une date et une heure à venir.';
  end if;

  update public.content_translations x
  set scheduled_at = translation_schedule.at,
    scheduled_by = (select auth.uid()),
    scheduled_rev = x.draft_rev,
    schedule_error = null
  where x.content_id = (target.t).content_id and x.language = (target.t).language;

  return translation_schedule.at;
end;
$$;

create function public.translation_unschedule(content_id uuid, language text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.content_translations;
begin
  perform private.require_staff();

  select * into t
  from public.content_translations x
  where x.content_id = translation_unschedule.content_id
    and x.language = translation_unschedule.language
  for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'traduction_introuvable',
      detail = 'Ce contenu n''a pas de traduction dans cette langue.';
  end if;

  if t.scheduled_at is null and t.schedule_error is null and t.scheduled_by is null then
    return false;
  end if;

  update public.content_translations x
  set scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    schedule_error = null
  where x.content_id = t.content_id and x.language = t.language;
  return true;
end;
$$;

create function public.translation_unpublish(content_id uuid, language text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  perform private.require_staff();

  select * into target
  from private.translation_target(translation_unpublish.content_id, translation_unpublish.language);

  if (target.t).live_version_id is not null or (target.t).scheduled_at is not null
    or (target.t).schedule_error is not null then
    update public.content_translations x
    set live_version_id = null,
      scheduled_at = null,
      scheduled_by = null,
      scheduled_rev = null,
      schedule_error = null
    where x.content_id = (target.t).content_id and x.language = (target.t).language;
  end if;

  return exists (select 1 from private.files_to_move());
end;
$$;

-- 11. Les versions : numérotées par langue ; la version en ligne de sa langue --------------------

create or replace function private.insert_version(
  prepared public.versions,
  version_origin text,
  author_id uuid
)
returns public.versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.versions;
begin
  insert into public.versions (
    content_id, language, number, origin, body, files, access_level_id, slug,
    category_ids, media_ids, cover_media_id, template_ids, block_types, draft_rev, source_rev,
    published_by, published_by_name
  )
  values (
    prepared.content_id,
    prepared.language,
    coalesce(
      (
        select max(v.number) from public.versions v
        where v.content_id = prepared.content_id
          and v.language is not distinct from prepared.language
      ),
      0
    ) + 1,
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
    prepared.source_rev,
    author_id,
    (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = author_id)
  )
  returning * into created;
  return created;
end;
$$;

-- Une nouvelle version devient celle en ligne de sa langue.
create function private.set_live_version(created public.versions)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if created.language is null then
    update public.contents c set live_version_id = created.id where c.id = created.content_id;
  else
    update public.content_translations t
    set live_version_id = created.id
    where t.content_id = created.content_id and t.language = created.language;
  end if;
end;
$$;

-- 12. Mettre à jour ce qui est en ligne (fichiers, blocs partagés) : chaque langue ---------------

drop function public.media_outdated(uuid);
create function public.media_outdated(media_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  version_id uuid,
  version_number integer,
  published_at timestamptz,
  language text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();
  return query
    select c.id, c.kind, nullif(v.body ->> 'title', ''), v.id, v.number, v.published_at, v.language
    from private.media_stale_live(media_outdated.media_id) s
    join public.contents c on c.id = s.content_id
    join public.versions v on v.id = s.version_id
    order by v.body ->> 'title', c.id, v.language nulls first;
end;
$$;

drop function public.template_outdated(uuid);
create function public.template_outdated(template_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  version_id uuid,
  version_number integer,
  published_at timestamptz,
  language text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();
  return query
    select c.id, c.kind, nullif(v.body ->> 'title', ''), v.id, v.number, v.published_at, v.language
    from private.template_stale_live(template_outdated.template_id) s
    join public.contents c on c.id = s.content_id
    join public.versions v on v.id = s.version_id
    order by v.body ->> 'title', c.id, v.language nulls first;
end;
$$;

revoke execute on function public.media_outdated(uuid), public.template_outdated(uuid)
from public, anon;
grant execute on function public.media_outdated(uuid), public.template_outdated(uuid)
to authenticated, service_role;

create or replace function public.media_push(media_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target public.media;
  stale_ids uuid[];
  stale_version uuid;
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

  -- Chaque version en ligne (une par langue), relue sous le verrou : une publication a pu
  -- passer entre-temps.
  for stale_version in
    select s.version_id from private.media_stale_live(target.id) s order by s.content_id, s.version_id
  loop
    select v.* into src from public.versions v where v.id = stale_version;

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
    perform private.set_live_version(created);

    return query select src.content_id, created.id, created.number;
  end loop;
end;
$$;

create or replace function public.media_replace_live(old_id uuid, new_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_media public.media;
  stale_ids uuid[];
  stale_version uuid;
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

  -- Chaque version en ligne (une par langue), relue sous le verrou.
  for stale_version in
    select l.version_id
    from private.live l
    join public.versions v on v.id = l.version_id
    where v.media_ids @> array[media_replace_live.old_id]
    order by l.content_id, l.version_id
  loop
    select v.* into src from public.versions v where v.id = stale_version;

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
    perform private.set_live_version(created);

    return query select src.content_id, created.id, created.number;
  end loop;
end;
$$;

-- Un fichier est utilisé aussi par le son d'une traduction.
create or replace function private.media_uses(target_media_id uuid)
returns table (content_id uuid, kind text, title text, in_draft boolean, in_app boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with uses as (
    select c.id, true as in_draft, false as in_app
    from public.contents c
    where c.draft_media_ids @> array[target_media_id]
    union all
    select t.content_id, true, false
    from public.content_translations t
    where t.audio_media_id = target_media_id
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
$$;

-- Remplacer un fichier : dans les brouillons, y compris le son des traductions.
create or replace function public.media_replace(old_id uuid, new_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Le son des traductions (un épisode), sauf celles que quelqu'un écrit.
  for target in
    select t.content_id, t.language, c.title
    from public.content_translations t
    join public.contents c on c.id = t.content_id
    where t.audio_media_id = media_replace.old_id
    order by t.content_id, t.language
    for update of t
  loop
    holder := private.translation_writer(target.content_id, target.language, null);
    if holder is not null then
      kept := kept || jsonb_build_object(
        'id', target.content_id, 'title', coalesce(target.title, ''), 'holder', holder,
        'language', target.language
      );
      continue;
    end if;

    update public.content_translations t
    set audio = jsonb_build_object('mediaId', media_replace.new_id),
      draft_rev = t.draft_rev + 1,
      draft_saved_at = now(),
      draft_saved_by = me
    where t.content_id = target.content_id and t.language = target.language;
    replaced := replaced + 1;
  end loop;

  return jsonb_build_object('replaced', replaced, 'kept', kept);
end;
$$;

create or replace function public.template_push(template_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  tpl public.contents;
  tpl_block jsonb;
  stale_ids uuid[];
  stale_version uuid;
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

  -- Chaque version en ligne (une par langue : le bloc partagé y est dans la langue d'origine),
  -- relue sous le verrou : une publication, un retrait ou un détachement a pu passer.
  for stale_version in
    select s.version_id from private.template_stale_live(tpl.id) s order by s.content_id, s.version_id
  loop
    select v.* into src from public.versions v where v.id = stale_version;

    select coalesce(array_agg(d ->> 'id'), '{}') into linked_ids
    from public.contents c
    cross join lateral jsonb_array_elements(c.draft -> 'blocks') d
    where c.id = src.content_id
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
    perform private.set_live_version(created);

    return query select src.content_id, created.id, created.number;
  end loop;
end;
$$;

-- 13. Revenir à une version : celle d'une traduction reprend ses textes -----------------------------

-- Les textes d'une version (titre à part) : { id: { doc } } ou { id: { caption, alt } } ; un
-- texte alternatif pris dans la médiathèque n'est pas une traduction.
create function private.version_texts(body jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(
      b ->> 'id',
      case
        when b ->> 'type' = 'text' then jsonb_build_object('doc', b -> 'doc')
        else jsonb_build_object(
          'caption', b -> 'caption',
          'alt', case when b -> 'altFromLibrary' = 'true'::jsonb then 'null'::jsonb else b -> 'alt' end
        )
      end
    ),
    '{}'::jsonb
  )
  from private.source_blocks(body) b (b)
  where not (b ? 'templateId')
$$;

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
  t public.content_translations;
  found_target record;
  new_draft jsonb;
  new_texts jsonb;
  new_audio jsonb;
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

  -- La version d'une traduction : ses textes et son son reviennent, la structure reste celle de
  -- la langue d'origine. Les textes repris sont à revoir (le texte d'origine a pu changer depuis).
  if src.language is not null then
    select * into found_target from private.translation_target(src.content_id, src.language);
    target := found_target.source;
    t := found_target.t;

    if not exists (
      select 1 from public.translation_locks l
      where l.content_id = t.content_id and l.language = t.language and l.holder_id = me
        and l.holder_session is not distinct from revert_to_version.editor_session
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'verrou_perdu',
        detail = 'Prends la main sur cette traduction pour revenir à une version.';
    end if;

    new_texts := private.version_texts(src.body);
    new_audio := case
      when target.kind = 'episode'
        and jsonb_typeof(src.body -> 'audio') = 'object'
        and private.media_available((src.body #>> '{audio,mediaId}')::uuid)
      then jsonb_build_object('mediaId', src.body #> '{audio,mediaId}')
    end;
    if target.kind = 'episode' and jsonb_typeof(src.body -> 'audio') = 'object' and new_audio is null then
      notes := notes || 'fichier_retire'::text;
    end if;

    update public.content_translations x
    set title = coalesce(src.body ->> 'title', ''),
      texts = new_texts,
      audio = new_audio,
      source_marks = x.source_marks || coalesce(
        (
          select jsonb_object_agg(k, to_jsonb('revert'::text))
          from (
            select 'title' as k where x.title is distinct from coalesce(src.body ->> 'title', '')
            union
            select k from jsonb_object_keys(new_texts) k
            where new_texts -> k is distinct from x.texts -> k
          ) changed
        ),
        '{}'::jsonb
      ),
      draft_rev = x.draft_rev + 1,
      draft_saved_at = saved_at,
      draft_saved_by = me
    where x.content_id = t.content_id and x.language = t.language
    returning x.draft_rev into new_rev;

    update public.translation_locks l
    set draft_rev = new_rev, heartbeat_at = saved_at
    where l.content_id = t.content_id and l.language = t.language;

    return query select new_rev, saved_at, notes;
    return;
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
$$;

-- 14. Les réglages communs : la langue d'origine et ce que voit un lecteur sans traduction --------

create or replace function private.settings_already_applied(target public.contents, s jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if s is null or s = '{}'::jsonb then
    return true;
  end if;
  if jsonb_typeof(s) <> 'object' or exists (
    select 1 from jsonb_object_keys(s) k
    where k not in ('slug', 'access_level_id', 'category_ids', 'source_language', 'untranslated')
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
  if s ? 'source_language' and target.source_language is distinct from s ->> 'source_language' then
    return false;
  end if;
  if s ? 'untranslated' and target.untranslated is distinct from s ->> 'untranslated' then
    return false;
  end if;
  return true;
exception
  when others then
    return false;
end;
$$;

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
    where k not in ('slug', 'access_level_id', 'category_ids', 'source_language', 'untranslated')
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
    ))
    or (s ? 'source_language' and jsonb_typeof(s -> 'source_language') <> 'string')
    or (s ? 'untranslated' and coalesce(s ->> 'untranslated', '') not in ('show_default', 'hide'))
  then
    raise exception using
      errcode = 'P0001',
      message = 'reglages_invalides',
      detail = 'Réglages attendus : slug (texte ou null), access_level_id (identifiant ou '
        'null), category_ids (liste d''identifiants), source_language (une langue), '
        'untranslated (show_default ou hide).';
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

  -- Langue d'origine : une langue active, tant que le contenu n'a aucune traduction.
  if s ? 'source_language' and (s ->> 'source_language') is distinct from target.source_language then
    if not exists (
      select 1 from public.languages l where l.code = s ->> 'source_language' and l.enabled
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'langue_invalide',
        detail = 'Cette langue n''est pas une langue active de l''installation.';
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
      access_chosen = case when s ? 'access_level_id' then true else c.access_chosen end,
      source_language = case
        when s ? 'source_language' then s ->> 'source_language' else c.source_language
      end,
      untranslated = case when s ? 'untranslated' then s ->> 'untranslated' else c.untranslated end
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
$$;

-- 15. Programmations dues, corbeille : chaque langue -----------------------------------------------

create or replace function private.run_due_publications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Les traductions programmées : chaque langue à son heure.
  for due in
    select t.content_id, t.language, t.scheduled_at, t.scheduled_by, t.scheduled_rev
    from public.content_translations t
    join public.contents c on c.id = t.content_id
    where t.scheduled_at <= now() and c.deleted_at is null
    order by t.scheduled_at, t.content_id, t.language
    for update of t skip locked
  loop
    failure := null;
    begin
      if due.scheduled_by is null
        or not exists (select 1 from public.profiles p where p.id = due.scheduled_by) then
        failure := 'auteur_parti';
      else
        select exists (
          select 1
          from public.translation_locks l
          join public.content_translations x
            on x.content_id = l.content_id and x.language = l.language
          where l.content_id = due.content_id
            and l.language = due.language
            and l.holder_id is not null
            and l.heartbeat_at >= now() - private.lock_ttl()
            and x.draft_rev <> due.scheduled_rev
        ) into writing;

        if writing then
          if due.scheduled_at < now() - interval '1 hour' then
            failure := 'brouillon_en_cours_d_ecriture';
          end if;
        else
          perform private.do_publish_translation(
            due.content_id, due.language, due.scheduled_by, 'scheduled'
          );
          published := published + 1;
        end if;
      end if;
    exception
      when others then
        failure := case when sqlstate = 'P0001' then sqlerrm else 'erreur_inattendue' end;
    end;

    if failure is not null then
      update public.content_translations t
      set scheduled_at = null,
        scheduled_rev = null,
        schedule_error = left(failure, 100)
      where t.content_id = due.content_id and t.language = due.language;
    end if;
  end loop;

  if published > 0 then
    perform private.kick_files();
  end if;
  return published;
end;
$$;

create or replace function public.trash(content_id uuid)
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

  -- Personne d'autre n'écrit ce contenu, dans aucune langue.
  writer := private.any_writer(target.id, me);
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

  -- Ses traductions quittent l'app aussi.
  update public.content_translations t
  set live_version_id = null,
    scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    schedule_error = null
  where t.content_id = target.id;

  update public.edit_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = target.id
    and l.holder_id is not null;

  update public.translation_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = target.id
    and l.holder_id is not null;

  return query select exists (select 1 from private.files_to_move());
end;
$$;

-- Les verrous des traductions oubliés partent avec ceux des contenus.
create or replace function private.housekeeping()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from cron.job_run_details d where d.end_time < now() - interval '14 days';
  delete from net._http_response r where r.created < now() - interval '7 days';
  delete from public.media_audit a
  where a.checked_at < now() - interval '90 days'
    and a.id <> (select max(b.id) from public.media_audit b);
  delete from public.edit_locks l where l.heartbeat_at < now() - interval '1 day';
  delete from public.translation_locks l where l.heartbeat_at < now() - interval '1 day';
end;
$$;

-- 16. Droits ---------------------------------------------------------------------------------------

revoke execute on function
  public.translation_create(uuid, text, uuid),
  public.translation_save(uuid, text, integer, text, jsonb, jsonb, uuid, text[], text[]),
  public.translation_delete(uuid, text),
  public.translation_state(uuid),
  public.translation_lock_take(uuid, text, boolean, uuid),
  public.translation_lock_heartbeat(uuid, text, uuid),
  public.translation_lock_release(uuid, text, uuid),
  public.translation_lock_status(uuid, text, uuid),
  public.translation_publish(uuid, text, integer),
  public.translation_schedule(uuid, text, timestamptz),
  public.translation_unschedule(uuid, text),
  public.translation_unpublish(uuid, text)
from public, anon;
grant execute on function
  public.translation_create(uuid, text, uuid),
  public.translation_save(uuid, text, integer, text, jsonb, jsonb, uuid, text[], text[]),
  public.translation_delete(uuid, text),
  public.translation_state(uuid),
  public.translation_lock_take(uuid, text, boolean, uuid),
  public.translation_lock_heartbeat(uuid, text, uuid),
  public.translation_lock_release(uuid, text, uuid),
  public.translation_lock_status(uuid, text, uuid),
  public.translation_publish(uuid, text, integer),
  public.translation_schedule(uuid, text, timestamptz),
  public.translation_unschedule(uuid, text),
  public.translation_unpublish(uuid, text)
to authenticated, service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;
