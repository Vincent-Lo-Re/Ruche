-- Le format régional de toute l'admin (Paramètres, onglet « Avancé ») : l'écriture des dates, de
-- l'heure (12 ou 24 heures), l'ordre du jour et du mois à la saisie, et celle des nombres
-- (« fr-FR », « en-GB »). Null : celui qui va avec la langue de l'admin. Un membre peut choisir le
-- sien dans Mon compte (user_metadata.locale).

alter table public.admin_identity
  add column locale text check (locale ~ '^[a-z]{2,3}-[A-Z]{2}$');

comment on column public.admin_identity.locale is
  'Le format régional de l''admin pour toute l''équipe (« fr-FR », « en-GB ») ; null : celui de '
  'la langue. Un membre peut choisir le sien dans Mon compte (user_metadata.locale).';

grant update (locale) on public.admin_identity to authenticated;

-- admin_brand() le donne aussi : la page de connexion le lit sans compte, comme la langue et le
-- fuseau. Sa forme change, elle est donc recréée.
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
  locale text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email, i.language, i.website_url, i.time_zone, i.locale
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, adresse de contact, site web, logotype et monogramme pour fond '
  'clair et sombre, image et monogramme animé de l''écran de connexion), sa langue, son fuseau '
  'horaire et son format régional, lisibles sans compte pour la page de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;
