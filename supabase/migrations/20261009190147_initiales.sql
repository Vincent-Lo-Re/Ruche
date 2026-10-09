-- Les initiales de la marque (Paramètres › Identité de l'admin, à côté du nom ; décidé le
-- 09/10/2026) : 1 à 3 caractères, montrés là où il faut un monogramme et qu'aucun n'a été envoyé
-- (l'onglet du navigateur, l'écran de connexion). Vides : la première lettre du nom.

alter table public.admin_identity
  add column initials text
    constraint admin_identity_initials_check
    check (initials is null or (char_length(initials) between 1 and 3 and initials = btrim(initials)));

comment on column public.admin_identity.initials is
  'Les initiales de la marque (1 à 3 caractères) : à la place d''un monogramme qui n''a pas été '
  'envoyé. Null : la première lettre du nom.';

grant update (initials) on public.admin_identity to authenticated;

-- admin_brand() les donne aussi (à tout le monde, comme le nom : l'écran de connexion).
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
  initials text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email, i.language, i.website_url, i.time_zone, i.locale, i.initials
  from public.admin_identity i
  where i.id;
$$;

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;
