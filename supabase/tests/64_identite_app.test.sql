-- Identité de l'app (groupe « App mobile », page Identité) : le nom, les initiales, l'adresse de
-- contact, le site web, le logotype et le monogramme (fond clair et sombre), l'écran de
-- chargement. Une seule ligne, préremplie avec la marque de l'admin à sa création puis à part ;
-- lecture par l'équipe en aal2, modification par un admin ; app_brand() la donne à tout le
-- monde. Les fichiers : l'espace public « marque », dossiers « app-… ».
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(55);

select pg_temp.create_people();

create function pg_temp.upload(object_name text)
returns void
language sql
as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('marque', object_name, auth.uid()::text, '{"size": 10, "mimetype": "image/svg+xml"}')
$$;
grant execute on function pg_temp.upload(text) to public;

-- Une seule ligne, et les colonnes attendues.
select is((select count(*)::int from public.app_identity), 1, 'une seule ligne');
select columns_are(
  'public', 'app_identity',
  array[
    'id', 'name', 'initials', 'contact_email', 'website_url',
    'logotype_light', 'logotype_dark', 'monogram_light', 'monogram_dark',
    'loading_image', 'loading_monogram_motion', 'loading_monogram_motions', 'loading_exit'
  ],
  'les colonnes de l''identité de l''app'
);
select col_default_is(
  'public', 'app_identity', 'loading_monogram_motion', false, 'monogramme immobile au départ'
);
select col_default_is(
  'public', 'app_identity', 'loading_monogram_motions', '{}'::text[],
  'aucune animation cochée au départ'
);
select col_default_is('public', 'app_identity', 'loading_exit', 'fade', 'sortie en fondu au départ');

-- Le préremplissage : les requêtes de la migration, rejouées sur une marque de l'admin remplie,
-- copient le nom, les initiales, l'adresse et le site ; les fichiers et l'écran de chargement
-- partent vides. (Les requêtes sont lues dans l'historique des migrations : c'est bien celles
-- de la migration qui sont testées.)
update public.admin_identity set
  name = 'Essaim', initials = 'ES', contact_email = 'aide@exemple.fr',
  website_url = 'https://example.com', login_image = 'connexion/00000000-0000-4000-8000-000000000010.jpg',
  logotype_light = 'logotype-clair/00000000-0000-4000-8000-000000000011.svg';
delete from public.app_identity;
select is(
  (select count(*)::int
   from supabase_migrations.schema_migrations m, unnest(m.statements) s
   where m.name = 'identite_app' and s ~* 'insert into public\.app_identity'),
  2, 'la migration a deux requêtes de préremplissage'
);
do $$
declare
  statement text;
begin
  for statement in
    select st from supabase_migrations.schema_migrations m, unnest(m.statements) st
    where m.name = 'identite_app' and st ~* 'insert into public\.app_identity'
  loop
    execute statement;
  end loop;
end;
$$;
select is(
  (select row(name, initials, contact_email, website_url)::text from public.app_identity),
  row('Essaim', 'ES', 'aide@exemple.fr', 'https://example.com')::text,
  'préremplie avec la marque de l''admin'
);
select is(
  (select row(logotype_light, logotype_dark, monogram_light, monogram_dark, loading_image,
     loading_monogram_motion, loading_monogram_motions)::text from public.app_identity),
  row(null::text, null::text, null::text, null::text, null::text, false, '{}'::text[])::text,
  'fichiers et écran de chargement vides au départ'
);
-- Ensuite, les deux sont à part.
update public.admin_identity set name = 'Ruche';
select is((select name from public.app_identity), 'Essaim', 'changer l''admin ne change pas l''app');

-- anon : l'identité par app_brand(), rien de la table.
select pg_temp.as_anon();
select is((select count(*)::int from public.app_brand()), 1, 'anon : app_brand() répond');
select is((select name from public.app_brand()), 'Essaim', 'anon : le nom de l''app');
select throws_ok(
  'select * from public.app_identity', '42501', null, 'anon : pas de lecture de la table'
);
select throws_ok(
  $$select pg_temp.upload('app-logotype-clair/00000000-0000-4000-8000-000000000001.svg')$$,
  '42501', null, 'anon : pas d''envoi dans l''espace « marque »'
);

-- Un compte sans fiche d'équipe et un éditeur en aal1 ne voient rien.
select pg_temp.as_person('reader');
select is((select count(*)::int from public.app_identity), 0, 'lecteur : ne voit pas la ligne');
select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.app_identity), 0, 'éditeur aal1 : ne voit pas la ligne');

-- Un éditeur en aal2 la lit, mais ne la modifie pas et n'envoie rien.
select pg_temp.as_person('editor');
select is((select count(*)::int from public.app_identity), 1, 'éditeur : lit la ligne');
select is(
  pg_temp.affected($$update public.app_identity set name = 'Ruche'$$), 0,
  'éditeur : ne change pas le nom'
);
select is(
  pg_temp.affected('update public.app_identity set loading_monogram_motion = true'), 0,
  'éditeur : n''anime pas le monogramme'
);
select throws_ok(
  $$select pg_temp.upload('app-logotype-clair/00000000-0000-4000-8000-000000000001.svg')$$,
  '42501', null, 'éditeur : pas d''envoi dans l''espace « marque »'
);

-- Un admin change le nom ; app_brand() le donne aussitôt, à tout le monde, sans toucher l'admin.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$update public.app_identity set name = 'Ruche mobile'$$), 1,
  'admin : change le nom'
);
select is((select name from public.admin_identity), 'Ruche', 'le nom de l''admin ne bouge pas');
select pg_temp.as_anon();
select is((select name from public.app_brand()), 'Ruche mobile', 'anon : le nouveau nom');

-- Les règles de la marque, les mêmes que pour l'admin.
select pg_temp.as_person('admin');
select throws_ok(
  $$update public.app_identity set name = ' Essaim '$$, '23514', null,
  'un nom avec des espaces autour est refusé'
);
select throws_ok($$update public.app_identity set name = ''$$, '23514', null, 'un nom vide est refusé');
select throws_ok(
  format('update public.app_identity set name = %L', repeat('a', 41)), '23514', null,
  'un nom de plus de 40 caractères est refusé'
);
select throws_ok(
  $$update public.app_identity set initials = 'ABCD'$$, '23514', null,
  'des initiales de plus de 3 caractères sont refusées'
);
select throws_ok(
  $$update public.app_identity set initials = ''$$, '23514', null, 'des initiales vides sont refusées'
);
select throws_ok(
  $$update public.app_identity set contact_email = 'pas-une-adresse'$$, '23514', null,
  'une adresse de contact mal écrite est refusée'
);
select throws_ok(
  $$update public.app_identity set website_url = 'http://example.com'$$, '23514', null,
  'un site web en http est refusé'
);
select throws_ok(
  $$update public.app_identity set website_url = 'https://example com'$$, '23514', null,
  'un site web mal écrit est refusé'
);
select is(
  pg_temp.affected($$update public.app_identity
    set initials = 'RM', contact_email = 'app@exemple.fr', website_url = 'https://example.com/app'$$), 1,
  'admin : enregistre initiales, adresse et site'
);
select pg_temp.as_anon();
select is(
  (select row(initials, contact_email, website_url)::text from public.app_brand()),
  row('RM', 'app@exemple.fr', 'https://example.com/app')::text,
  'anon : initiales, adresse et site'
);

-- Les fichiers de l'app : ses propres dossiers, dans l'espace « marque ».
select pg_temp.as_person('admin');
select lives_ok(
  $$select pg_temp.upload('app-logotype-clair/00000000-0000-4000-8000-000000000001.svg')$$,
  'admin : envoie le logotype de l''app pour fond clair'
);
select lives_ok(
  $$select pg_temp.upload('app-monogramme-sombre/00000000-0000-4000-8000-000000000002.webp')$$,
  'admin : envoie le monogramme de l''app pour fond sombre'
);
select lives_ok(
  $$select pg_temp.upload('app-chargement/00000000-0000-4000-8000-000000000003.jpg')$$,
  'admin : envoie l''image de l''écran de chargement'
);
select throws_ok(
  $$select pg_temp.upload('app-logotype-palettes/00000000-0000-4000-8000-000000000004.svg')$$,
  '23514', null, 'admin : pas de déclinaison par palette pour l''app'
);
select throws_ok(
  $$select pg_temp.upload('app-logotype-clair/00000000-0000-4000-8000-000000000005.jpg')$$,
  '23514', null, 'admin : pas de logotype de l''app en JPEG'
);
select throws_ok(
  $$select pg_temp.upload('app-chargement/photo.jpg')$$,
  '23514', null, 'admin : pas d''image de chargement sous un autre nom'
);
select throws_ok(
  $$select pg_temp.upload('app/00000000-0000-4000-8000-000000000006.svg')$$,
  '23514', null, 'admin : pas d''envoi hors des dossiers de l''app'
);
-- Les chemins de l'admin restent acceptés.
select lives_ok(
  $$select pg_temp.upload('connexion/00000000-0000-4000-8000-000000000007.jpg')$$,
  'admin : l''image de connexion de l''admin reste acceptée'
);
select is(
  pg_temp.affected($$update public.app_identity set
    logotype_light = 'app-logotype-clair/00000000-0000-4000-8000-000000000001.svg',
    monogram_dark = 'app-monogramme-sombre/00000000-0000-4000-8000-000000000002.webp',
    loading_image = 'app-chargement/00000000-0000-4000-8000-000000000003.jpg'$$), 1,
  'admin : enregistre les fichiers de l''app'
);
select throws_ok(
  $$update public.app_identity set logotype_dark = 'app-logotype-sombre/logo.exe'$$,
  '23514', null, 'un chemin de fichier inattendu est refusé'
);
select pg_temp.as_anon();
select is(
  (select row(logotype_light, monogram_dark, loading_image)::text from public.app_brand()),
  row(
    'app-logotype-clair/00000000-0000-4000-8000-000000000001.svg',
    'app-monogramme-sombre/00000000-0000-4000-8000-000000000002.webp',
    'app-chargement/00000000-0000-4000-8000-000000000003.jpg'
  )::text,
  'anon : les chemins des fichiers de l''app'
);

-- Le monogramme de l'écran de chargement : un admin l'anime et coche ses animations parmi les
-- sept connues, ou aucune.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$update public.app_identity
    set loading_monogram_motion = true, loading_monogram_motions = array['trace', 'halo']$$), 1,
  'admin : anime le monogramme, avec le tracé et le halo'
);
select throws_ok(
  $$update public.app_identity set loading_monogram_motions = array['spin']$$, '23514', null,
  'une animation inconnue est refusée'
);
select is(
  pg_temp.affected($$update public.app_identity set loading_monogram_motions = array[]::text[]$$), 1,
  'admin : ne coche aucune animation'
);
select is(
  pg_temp.affected($$update public.app_identity set loading_monogram_motions = array['trace', 'halo']$$), 1,
  'admin : coche de nouveau le tracé et le halo'
);
select pg_temp.as_anon();
select is(
  (select row(loading_monogram_motion, loading_monogram_motions)::text from public.app_brand()),
  row(true, array['trace', 'halo'])::text,
  'anon : le monogramme animé et ses animations'
);

-- La sortie de l'écran de chargement : un fondu ou un zoom, rien d'autre.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$update public.app_identity set loading_exit = 'zoom'$$), 1,
  'admin : choisit la sortie en zoom'
);
select throws_ok(
  $$update public.app_identity set loading_exit = 'slide'$$, '23514', null,
  'une sortie inconnue est refusée'
);
select pg_temp.as_anon();
select is((select loading_exit from public.app_brand()), 'zoom', 'anon : la sortie en zoom');

-- Une seule ligne : ni ajout ni suppression, même pour un admin.
select pg_temp.as_person('admin');
select throws_ok(
  $$insert into public.app_identity (id) values (true)$$, '42501', null, 'admin : pas d''ajout'
);
select throws_ok('delete from public.app_identity', '42501', null, 'admin : pas de suppression');

-- app_brand() : security definer, stable, search_path vide ; exécutable par anon.
select pg_temp.as_postgres();
select is(
  (select p.prosecdef and p.provolatile = 's' and 'search_path=""' = any (p.proconfig)
   from pg_proc p where p.oid = 'public.app_brand()'::regprocedure),
  true, 'app_brand : security definer, stable, search_path vide'
);
select ok(
  has_function_privilege('anon', 'public.app_brand()', 'execute'), 'anon : exécute app_brand()'
);

select * from finish();
rollback;
