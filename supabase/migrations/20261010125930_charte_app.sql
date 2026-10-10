-- La charte graphique de l'app (ADMIN § 1, section « App », onglet « Charte graphique ») : un seul
-- document, de la forme de la variante « style » de blocks/blocks.schema.json. Un brouillon que
-- les admins composent, et la version publiée, la seule que lit l'app (app_style()).

-- ---------------------------------------------------------------------------------------------
-- Ce que le schéma ne dit pas : chaque usage désigne une couleur ou une police de la liste, et
-- dans chaque liste (couleurs, teintes, pastilles, boutons, polices), ni identifiant ni nom en
-- double (majuscules et espaces ignorés, comme les titres : private.title_key ; le nom gardé
-- est celui du dernier). Rend la liste des problèmes, vide si tout va bien : { "rule": "reference", "at": "tints.0.fill" },
-- { "rule": "duplicateId", "list": "colors", "id": … }, { "rule": "duplicateName", "list": …,
-- "name": … }. Les mêmes règles que styleProblems de l'admin.
-- ---------------------------------------------------------------------------------------------

create function private.style_problems(doc jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems jsonb := '[]'::jsonb;
  color_ids text[] := array(select c ->> 'id' from jsonb_array_elements(doc -> 'colors') c);
  font_ids text[] := array(select f ->> 'id' from jsonb_array_elements(doc -> 'fonts') f);
  list text;
  parts text[];
  entry record;
  part text;
begin
  foreach list in array array['colors', 'tints', 'badges', 'buttons', 'fonts'] loop
    problems := problems || coalesce((
      select jsonb_agg(jsonb_build_object('rule', 'duplicateId', 'list', list, 'id', d.id))
      from (
        select e ->> 'id' as id
        from jsonb_array_elements(doc -> list) e
        group by 1
        having count(*) > 1
      ) d
    ), '[]'::jsonb);
    problems := problems || coalesce((
      select jsonb_agg(jsonb_build_object('rule', 'duplicateName', 'list', list, 'name', d.name))
      from (
        -- Le nom du dernier de la liste : celui qu'on vient d'ajouter, en général.
        select (array_agg(e.value ->> 'name' order by e.ordinality desc))[1] as name
        from jsonb_array_elements(doc -> list) with ordinality e
        group by private.title_key(e.value ->> 'name')
        having count(*) > 1
      ) d
    ), '[]'::jsonb);
  end loop;

  -- Où va chaque couleur, et chaque police.
  problems := problems || coalesce((
    select jsonb_agg(jsonb_build_object('rule', 'reference', 'at', 'roles.' || r.key) order by r.key)
    from jsonb_each_text(doc -> 'roles') r
    where not r.value = any (color_ids)
  ), '[]'::jsonb);
  problems := problems || coalesce((
    select jsonb_agg(jsonb_build_object('rule', 'reference', 'at', 'fontRoles.' || r.key) order by r.key)
    from jsonb_each_text(doc -> 'fontRoles') r
    where not r.value = any (font_ids)
  ), '[]'::jsonb);

  -- Les couleurs des teintes, des pastilles et des boutons.
  foreach list in array array['tints', 'badges', 'buttons'] loop
    parts := case list
      when 'tints' then array['fill', 'border', 'title', 'text', 'link']
      when 'badges' then array['fill', 'border', 'text']
      else array['fill', 'end', 'border', 'label']
    end;
    for entry in
      select e.value as item, e.ordinality - 1 as position
      from jsonb_array_elements(doc -> list) with ordinality e
    loop
      foreach part in array parts loop
        if not (entry.item ->> part) = any (color_ids) then
          problems := problems || jsonb_build_array(jsonb_build_object(
            'rule', 'reference', 'at', format('%s.%s.%s', list, entry.position, part)
          ));
        end if;
      end loop;
    end loop;
  end loop;

  return problems;
end;
$$;

comment on function private.style_problems(jsonb) is
  'Les problèmes d''une charte que le schéma ne voit pas (références, doublons), en JSON ; vide '
  'si tout va bien. À n''appeler que sur un document de la bonne forme.';

-- La charte est valable : la forme (variante « style ») et les règles ci-dessus.
create function private.style_is_valid(doc jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select extensions.jsonb_matches_schema(private.blocks_schema('style'), doc)
    and jsonb_array_length(private.style_problems(doc)) = 0;
$$;

-- Refuse une charte qui n'est pas valable : « charte_invalide », avec les problèmes en JSON dans
-- hint (la forme : { "rule": "shape", "message": … }, le premier message de pg_jsonschema).
create function private.check_style(doc jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems jsonb;
begin
  if doc is null or not extensions.jsonb_matches_schema(private.blocks_schema('style'), doc) then
    problems := jsonb_build_array(jsonb_build_object(
      'rule', 'shape',
      'message', case when doc is null then 'null' else (
        extensions.jsonschema_validation_errors(private.blocks_schema('style'), doc::json)
      )[1] end
    ));
  else
    problems := private.style_problems(doc);
  end if;
  if jsonb_array_length(problems) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'charte_invalide',
      detail = 'La charte n''a pas la forme attendue, ou un usage désigne une couleur ou une police absente.',
      hint = problems::text;
  end if;
end;
$$;

revoke execute on function private.style_problems(jsonb), private.style_is_valid(jsonb),
  private.check_style(jsonb)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- La charte : une seule ligne (id toujours vrai), ni ajout ni suppression.
-- ---------------------------------------------------------------------------------------------

create table public.app_style (
  id boolean primary key default true check (id),
  -- Le brouillon ; null : la charte neutre de Ruche, que l'admin compose dans sa langue.
  draft jsonb check (draft is null or private.style_is_valid(draft)),
  -- Change à chaque enregistrement : deux admins ne s'écrasent pas.
  draft_rev integer not null default 0,
  -- La version publiée, celle de l'app ; null : jamais publiée (l'app garde sa charte neutre).
  published jsonb check (published is null or private.style_is_valid(published)),
  published_at timestamptz,
  updated_at timestamptz
);

comment on table public.app_style is
  'La charte graphique de l''app, une seule ligne : le brouillon (null : la charte neutre) et la '
  'version publiée, que lit l''app par app_style(). Lecture par l''équipe ; écriture par les '
  'fonctions style_save, style_publish et style_discard, réservées aux admins.';

insert into public.app_style default values;

alter table public.app_style enable row level security;
revoke all on public.app_style from anon, authenticated;
grant select on public.app_style to authenticated;

-- L'équipe la lit : les admins pour la composer, les éditeurs pour l'aperçu de l'éditeur.
create policy "Charte de l'app : lecture par l'équipe"
  on public.app_style
  for select
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Les écritures, par un admin : enregistrer le brouillon, le publier, ou revenir à la version
-- publiée. Chacune donne la révision attendue (sinon « conflit_revision ») et rend la nouvelle.
-- ---------------------------------------------------------------------------------------------

-- La ligne de la charte, verrouillée, si la révision attendue est la bonne.
create function private.style_for_update(expected_rev integer)
returns public.app_style
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_style public.app_style;
begin
  perform private.require_admin();
  select * into current_style from public.app_style s where s.id for update;
  if current_style.draft_rev <> expected_rev then
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'La charte vient de changer (révision %s, et non %s) : relis-la avant de continuer.',
        current_style.draft_rev, expected_rev
      );
  end if;
  return current_style;
end;
$$;

revoke execute on function private.style_for_update(integer) from public, anon, authenticated;

create function public.style_save(new_draft jsonb, expected_rev integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_rev integer;
begin
  perform private.style_for_update(expected_rev);
  perform private.check_style(new_draft);
  update public.app_style s
  set draft = new_draft, draft_rev = s.draft_rev + 1, updated_at = now()
  where s.id
  returning s.draft_rev into new_rev;
  return new_rev;
end;
$$;

comment on function public.style_save(jsonb, integer) is
  'Enregistre le brouillon de la charte (admins) : la révision attendue, sinon conflit_revision ; '
  'une charte qui n''est pas valable, charte_invalide. Rend la nouvelle révision.';

create function public.style_publish(expected_rev integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_style public.app_style;
begin
  current_style := private.style_for_update(expected_rev);
  update public.app_style s
  set published = current_style.draft, published_at = now()
  where s.id;
  return current_style.draft_rev;
end;
$$;

comment on function public.style_publish(integer) is
  'Publie le brouillon de la charte (admins) : l''app le lit dès lors par app_style(). Un brouillon '
  'vide publie la charte neutre. Rend la révision, inchangée.';

create function public.style_discard(expected_rev integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_rev integer;
begin
  perform private.style_for_update(expected_rev);
  update public.app_style s
  set draft = s.published, draft_rev = s.draft_rev + 1, updated_at = now()
  where s.id
  returning s.draft_rev into new_rev;
  return new_rev;
end;
$$;

comment on function public.style_discard(integer) is
  'Remet le brouillon de la charte à la version publiée (admins ; jamais publiée : la charte '
  'neutre). Rend la nouvelle révision.';

revoke execute on function public.style_save(jsonb, integer), public.style_publish(integer),
  public.style_discard(integer)
from public, anon;
grant execute on function public.style_save(jsonb, integer), public.style_publish(integer),
  public.style_discard(integer)
to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Ce que lit l'app : la charte publiée, sans compte. null : jamais publiée.
-- ---------------------------------------------------------------------------------------------

create function public.app_style()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.published from public.app_style s where s.id;
$$;

comment on function public.app_style() is
  'La charte graphique publiée de l''app (null : jamais publiée, l''app garde sa charte neutre).';

revoke execute on function public.app_style() from public;
grant execute on function public.app_style() to anon, authenticated, service_role;
