-- Le monogramme de l'écran de connexion n'est plus animé au départ, et aucune animation n'est
-- cochée (décidé le 09/10/2026) : c'est un admin qui l'anime et choisit ses animations. Une liste
-- vide est donc permise. Une installation qui avait encore les réglages de départ d'avant
-- (animé, tracé, lueur, respiration) passe aux nouveaux.

alter table public.admin_identity
  alter column login_monogram_motion set default false,
  alter column login_monogram_motions set default '{}',
  drop constraint admin_identity_login_monogram_motions_check,
  add constraint admin_identity_login_monogram_motions_check check (
    cardinality(login_monogram_motions) <= 7
    and login_monogram_motions <@ array['trace', 'cascade', 'glint', 'shine', 'halo', 'sway', 'breathe']
  );

update public.admin_identity
set login_monogram_motion = false, login_monogram_motions = '{}'
where login_monogram_motion
  and login_monogram_motions = array['trace', 'glint', 'breathe'];
