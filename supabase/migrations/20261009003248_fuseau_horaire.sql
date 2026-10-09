-- Le fuseau horaire de toute l'admin (Paramètres, onglet « Avancé ») : les dates s'affichent à son
-- heure, et l'heure d'une publication programmée s'y comprend. Paris au départ, ce qu'était l'admin
-- jusqu'ici. La base, elle, ne range que des instants (timestamptz) : rien d'autre ne change.

alter table public.admin_identity
  add column time_zone text not null default 'Europe/Paris';

comment on column public.admin_identity.time_zone is
  'Le fuseau horaire de l''admin (nom IANA, « Europe/Paris ») : les dates s''affichent à son heure, '
  'et l''heure d''une publication programmée s''y comprend.';

grant update (time_zone) on public.admin_identity to authenticated;

-- Un fuseau que Postgres ne connaît pas est refusé. Par un déclencheur et non un check : un check
-- appellerait la fonction avec les droits du membre, qui n'exécute rien dans private.
create function private.admin_identity_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names t where t.name = new.time_zone) then
    raise exception 'fuseau_inconnu'
      using errcode = '23514', detail = 'Ce fuseau horaire n''existe pas.';
  end if;
  return new;
end;
$$;

create trigger admin_identity_time_zone
  before insert or update of time_zone on public.admin_identity
  for each row execute function private.admin_identity_time_zone();

-- admin_brand() le donne aussi, avec le reste de l'identité : la page de connexion le lit sans
-- compte, comme la langue. Sa forme change, elle est donc recréée.
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
  time_zone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email, i.language, i.website_url, i.time_zone
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, adresse de contact, site web, logotype et monogramme pour fond '
  'clair et sombre, image et monogramme animé de l''écran de connexion), sa langue et son fuseau '
  'horaire, lisibles sans compte pour la page de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;
