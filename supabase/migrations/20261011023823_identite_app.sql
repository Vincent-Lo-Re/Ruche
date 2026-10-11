-- Identité de l'app (groupe « App mobile » du menu, page Identité ; ADMIN § 1, décidé le
-- 10/10/2026) : les sections de Paramètres › Identité de l'admin, reprises pour l'app mobile.
-- - Marque : nom, initiale(s), adresse de contact, site web, à part de ceux de l'admin ;
-- - Écran de chargement (celui qui suit le tout premier écran figé du démarrage) : une image de
--   fond facultative et le monogramme de l'app, animé ou non, avec les mêmes animations à cocher ;
-- - Logos : logotype et monogramme, pour fond clair et pour fond sombre, sans déclinaisons par
--   palette (l'app n'a pas encore de charte).
-- Ni brouillon ni publication : un changement enregistré est lu par l'app à sa prochaine
-- ouverture, par app_brand().

-- ---------------------------------------------------------------------------------------------
-- Les fichiers de l'app : le même espace public « marque » que ceux de l'admin (l'app les montre
-- avant toute connexion), dans leurs propres dossiers, préfixés « app- », pour qu'un fichier de
-- l'app ne se confonde jamais avec un de l'admin. Le type brand_path garde tous les chemins
-- acceptés jusqu'ici ; les règles de l'espace « marque » (envoi par un admin au chemin attendu,
-- lecture par l'équipe, retrait par un admin) s'en servent et couvrent donc aussi ces dossiers.
-- ---------------------------------------------------------------------------------------------

alter domain public.brand_path drop constraint brand_path_check;
alter domain public.brand_path add constraint brand_path_check
  check (
    value ~ '^(logotype|monogramme)-(clair|sombre|palettes)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp)$'
    or value ~ '^connexion/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp|jpg)$'
    -- Les logos de l'app : « app-logotype-clair/<uuid>.svg »… (pas de déclinaisons par palette).
    or value ~ '^app-(logotype|monogramme)-(clair|sombre)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp)$'
    -- L'image de l'écran de chargement : une photo réduite par l'admin, en JPEG au besoin, comme
    -- celle de l'écran de connexion.
    or value ~ '^app-chargement/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp|jpg)$'
  );

-- ---------------------------------------------------------------------------------------------
-- L'identité de l'app : une seule ligne (id toujours vrai), ni ajout ni suppression. Mêmes règles
-- que les colonnes correspondantes d'admin_identity.
-- ---------------------------------------------------------------------------------------------

create table public.app_identity (
  id boolean primary key default true check (id),
  -- Le nom de la marque dans l'app, sans espace autour ; null : pas de nom.
  name text
    constraint app_identity_name_check
    check (name is null or (char_length(name) between 1 and 40 and name = btrim(name))),
  -- 1 à 3 caractères, à la place d'un monogramme qui n'a pas été envoyé ; null : la première
  -- lettre du nom.
  initials text
    constraint app_identity_initials_check
    check (initials is null or (char_length(initials) between 1 and 3 and initials = btrim(initials))),
  contact_email text
    constraint app_identity_contact_email_check
    check (
      contact_email is null
      or (
        char_length(contact_email) <= 254
        and contact_email = btrim(contact_email)
        and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      )
    ),
  website_url text
    constraint app_identity_website_url_check
    check (
      website_url is null
      or (
        char_length(website_url) <= 2048
        and website_url ~ '^https://[^\s/?#]+\.[^\s/?#]+(/\S*)?$'
      )
    ),
  -- Les fichiers (chemins dans l'espace « marque », dossiers « app-… ») ; null : pas de fichier.
  logotype_light public.brand_path,
  logotype_dark public.brand_path,
  monogram_light public.brand_path,
  monogram_dark public.brand_path,
  -- L'écran de chargement : l'image de fond (null : un fond uni, clair ou sombre selon le
  -- téléphone), le monogramme animé ou immobile, et ses animations cochées.
  loading_image public.brand_path,
  loading_monogram_motion boolean not null default false,
  loading_monogram_motions text[] not null default '{}'
    constraint app_identity_loading_monogram_motions_check
    check (
      cardinality(loading_monogram_motions) <= 7
      and loading_monogram_motions <@ array['trace', 'cascade', 'glint', 'shine', 'halo', 'sway', 'breathe']
    ),
  -- La sortie de l'écran de chargement, une fois l'app prête et le tour d'animation en cours
  -- terminé : un fondu, ou un zoom du monogramme qui s'ouvre sur l'app.
  loading_exit text not null default 'fade'
    constraint app_identity_loading_exit_check
    check (loading_exit in ('fade', 'zoom'))
);

comment on table public.app_identity is
  'Identité de l''app mobile, une seule ligne : nom, initiales, adresse de contact, site web, '
  'logotype et monogramme pour fond clair et sombre, écran de chargement (chemins dans l''espace '
  '« marque », dossiers « app-… »). Préremplie à sa création avec la marque de l''admin, puis '
  'indépendante. Lecture par l''équipe, modification par un admin ; app_brand() la donne à l''app.';
comment on column public.app_identity.loading_image is
  'L''image de fond de l''écran de chargement ; null : un fond uni, clair ou sombre selon le '
  'téléphone.';
comment on column public.app_identity.loading_monogram_motion is
  'Le monogramme de l''écran de chargement est animé ; faux : immobile.';
comment on column public.app_identity.loading_monogram_motions is
  'Les animations cochées du monogramme (tracé, cascade, lueur, reflet, halo, balancement, '
  'respiration), jouées dans cet ordre-là quel que soit l''ordre du tableau.';
comment on column public.app_identity.loading_exit is
  'La sortie de l''écran de chargement, quand l''app est prête et que le tour d''animation en '
  'cours est fini : « fade » (fondu) ou « zoom » (le monogramme grossit et s''ouvre sur l''app).';

-- Préremplie avec la marque de l'admin telle qu'elle est à la création (nom, initiales, adresse
-- de contact, site web) : le plus souvent, l'app porte la même. Ensuite, les deux sont à part :
-- changer l'une ne change pas l'autre. Les fichiers et l'écran de chargement partent vides (les
-- fichiers de l'admin sont faits pour l'admin ; l'app a ses propres dossiers).
insert into public.app_identity (name, initials, contact_email, website_url)
select a.name, a.initials, a.contact_email, a.website_url
from public.admin_identity a
where a.id;

-- Une installation sans ligne d'identité de l'admin (ne devrait pas arriver) a quand même la
-- sienne.
insert into public.app_identity default values on conflict (id) do nothing;

alter table public.app_identity enable row level security;
revoke all on public.app_identity from anon, authenticated;
grant select,
  update (
    name, initials, contact_email, website_url,
    logotype_light, logotype_dark, monogram_light, monogram_dark,
    loading_image, loading_monogram_motion, loading_monogram_motions, loading_exit
  )
  on public.app_identity to authenticated;

create policy "Identité de l'app : lecture par l'équipe"
  on public.app_identity
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Identité de l'app : modification par un admin"
  on public.app_identity
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- L'identité pour l'app, lue à chaque ouverture, avant toute connexion : rien que des réglages
-- montrés à tous et des chemins de fichiers déjà publics. Sans brouillon, ce qui est enregistré
-- est en ligne.
create function public.app_brand()
returns table (
  name text,
  initials text,
  contact_email text,
  website_url text,
  logotype_light text,
  logotype_dark text,
  monogram_light text,
  monogram_dark text,
  loading_image text,
  loading_monogram_motion boolean,
  loading_monogram_motions text[],
  loading_exit text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.initials, i.contact_email, i.website_url,
    i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.loading_image, i.loading_monogram_motion, i.loading_monogram_motions, i.loading_exit
  from public.app_identity i
  where i.id;
$$;

comment on function public.app_brand() is
  'L''identité de l''app (nom, initiales, adresse de contact, site web, logotype et monogramme '
  'pour fond clair et sombre, écran de chargement), lisible sans compte par l''app.';

revoke execute on function public.app_brand() from public;
grant execute on function public.app_brand() to anon, authenticated, service_role;
