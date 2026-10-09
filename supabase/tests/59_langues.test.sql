-- Les langues de l'installation (Paramètres › Langues) : celles de l'app, comme des données.
-- Lecture par l'équipe en aal2, écriture par un admin ; une seule langue par défaut, toujours
-- active, qui ne se retire pas et ne change que par languages_set_default ; app_languages() donne
-- les langues actives à tout le monde.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(20);

select pg_temp.create_people();

-- Au départ : le français, par défaut.
select is(
  (select array_agg(code || ':' || is_default::text) from public.languages),
  array['fr:true'], 'au départ : le français, par défaut'
);

-- Un admin ajoute des langues.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$insert into public.languages (code) values ('en'), ('pt-BR')$$), 2,
  'admin : ajoute l''anglais et le portugais du Brésil'
);
select throws_ok(
  $$insert into public.languages (code) values ('Allemand')$$, '23514', null,
  'un code mal écrit est refusé'
);
select throws_ok(
  $$insert into public.languages (code) values ('en')$$, '23505', null,
  'une langue n''est ajoutée qu''une fois'
);
select throws_ok(
  $$insert into public.languages (code, is_default) values ('de', true)$$, '42501', null,
  'la langue par défaut ne se choisit pas à l''ajout'
);
select throws_ok(
  $$update public.languages set is_default = true where code = 'en'$$, '42501', null,
  'ni par une modification directe'
);

-- La langue par défaut.
select lives_ok(
  $$select public.languages_set_default('en')$$, 'admin : l''anglais devient la langue par défaut'
);
select is(
  (select array_agg(code order by code) from public.languages where is_default),
  array['en'], 'une seule langue par défaut'
);
select throws_ok(
  $$select public.languages_set_default('de')$$, 'P0001', 'langue_introuvable',
  'une langue absente ne devient pas la langue par défaut'
);
select throws_ok(
  $$update public.languages set enabled = false where code = 'en'$$, '23514', null,
  'la langue par défaut ne s''arrête pas'
);
select throws_ok(
  $$delete from public.languages where code = 'en'$$, '23514', 'langue_par_defaut',
  'la langue par défaut ne se retire pas'
);
select is(
  pg_temp.affected($$update public.languages set enabled = false where code = 'pt-BR'$$), 1,
  'admin : arrête une autre langue'
);
select is(
  pg_temp.affected($$delete from public.languages where code = 'fr'$$), 1,
  'admin : retire une autre langue'
);

-- Un éditeur lit, n'écrit pas ; sans double vérification, il ne lit rien.
select pg_temp.as_person('editor');
select is((select count(*)::int from public.languages), 2, 'éditeur : lit les langues');
select is(
  pg_temp.affected($$update public.languages set enabled = true where code = 'pt-BR'$$), 0,
  'éditeur : ne change pas une langue'
);
select throws_ok(
  $$insert into public.languages (code) values ('de')$$, '42501', null,
  'éditeur : n''ajoute pas de langue'
);
select throws_ok(
  $$select public.languages_set_default('pt-BR')$$, '42501', 'reserve_aux_admins',
  'éditeur : ne change pas la langue par défaut'
);
select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.languages), 0, 'éditeur aal1 : ne lit rien');

-- L'app : les langues actives, la langue par défaut d'abord ; pas de changement sans compte.
select pg_temp.as_anon();
select is(
  (select array_agg(code || ':' || is_default::text) from public.app_languages()),
  array['en:true'], 'anon : les langues actives (le portugais est arrêté)'
);
select throws_ok(
  $$select public.languages_set_default('en')$$, '42501', null,
  'anon : ne change pas la langue par défaut'
);

select * from finish();
rollback;
