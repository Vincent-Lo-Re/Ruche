-- Les noms du Blog et des Podcasts, propres à chaque admin (Paramètres › Avancé, section « Noms des
-- sections » ; décidé le 09/10/2026, QCM : chaque forme écrite à la main). En français, trois
-- formes : le nom (menu, titres, listes : « Le Fil »), avec « le » (« le Fil ») et avec « du »
-- (« du Fil ») ; en anglais, le nom seul. Null : le nom d'origine. Les trois formes françaises
-- d'une section vont ensemble : toutes données, ou aucune.

-- Une forme : 1 à 40 caractères, sans espace au début ni à la fin.
create domain public.section_form as text
  check (value is null or (char_length(value) between 1 and 40 and value = btrim(value)));

alter table public.admin_identity
  add column blog_name_fr public.section_form,
  add column blog_le_fr public.section_form,
  add column blog_du_fr public.section_form,
  add column podcasts_name_fr public.section_form,
  add column podcasts_le_fr public.section_form,
  add column podcasts_du_fr public.section_form,
  add column blog_name_en public.section_form,
  add column podcasts_name_en public.section_form,
  add constraint admin_identity_blog_fr_check check (
    (blog_name_fr is null) = (blog_le_fr is null) and (blog_name_fr is null) = (blog_du_fr is null)
  ),
  add constraint admin_identity_podcasts_fr_check check (
    (podcasts_name_fr is null) = (podcasts_le_fr is null)
    and (podcasts_name_fr is null) = (podcasts_du_fr is null)
  );

comment on column public.admin_identity.blog_name_fr is
  'Le nom du Blog en français (menu, titres, listes). Null : « Blog ».';
comment on column public.admin_identity.blog_le_fr is
  'Le nom du Blog avec « le » (« le Blog », « la Gazette », « l''Agenda »).';
comment on column public.admin_identity.blog_du_fr is
  'Le nom du Blog avec « du » (« du Blog », « de la Gazette », « de l''Agenda »).';
comment on column public.admin_identity.podcasts_name_fr is
  'Le nom des Podcasts en français. Null : « Podcasts ».';
comment on column public.admin_identity.podcasts_le_fr is
  'Le nom des Podcasts avec « le » (« les Podcasts »).';
comment on column public.admin_identity.podcasts_du_fr is
  'Le nom des Podcasts avec « du » (« des Podcasts »).';
comment on column public.admin_identity.blog_name_en is
  'Le nom du Blog en anglais. Null : « Blog ».';
comment on column public.admin_identity.podcasts_name_en is
  'Le nom des Podcasts en anglais. Null : « Podcasts ».';

grant update (
  blog_name_fr, blog_le_fr, blog_du_fr, podcasts_name_fr, podcasts_le_fr, podcasts_du_fr,
  blog_name_en, podcasts_name_en
) on public.admin_identity to authenticated;

-- admin_brand() les donne aussi (lus au chargement, comme la langue).
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
  website_url text,
  time_zone text,
  locale text,
  initials text,
  blog_name_fr text,
  blog_le_fr text,
  blog_du_fr text,
  podcasts_name_fr text,
  podcasts_le_fr text,
  podcasts_du_fr text,
  blog_name_en text,
  podcasts_name_en text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email, i.language, i.website_url, i.time_zone, i.locale, i.initials,
    i.blog_name_fr, i.blog_le_fr, i.blog_du_fr, i.podcasts_name_fr, i.podcasts_le_fr,
    i.podcasts_du_fr, i.blog_name_en, i.podcasts_name_en
  from public.admin_identity i
  where i.id;
$$;

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;
