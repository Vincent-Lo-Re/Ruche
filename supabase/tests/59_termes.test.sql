-- Les termes de l'installation (Paramètres › Avancé) : le nom affiché du Blog et des Podcasts, par
-- langue, avec son genre (français), son nombre et son élision.
-- Lecture par l'équipe en aal2, écriture par un admin ; app_terms() les donne à tout le monde.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(16);

select pg_temp.create_people();
delete from public.terms;

-- Au départ : aucun terme (l'admin et l'app gardent leurs mots).
select is((select count(*)::int from public.terms), 0, 'aucun terme au départ');

-- Un admin nomme le Blog en français et en anglais.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$
    insert into public.terms (key, language, name, gender, plural)
    values ('blog', 'fr', 'Actualités', 'feminine', true), ('blog', 'en', 'News', null, true)
  $$), 2,
  'admin : nomme le Blog en français et en anglais'
);
select is(
  pg_temp.affected($$update public.terms set name = 'Agenda', gender = 'masculine', plural = false, elided = true where key = 'blog' and language = 'fr'$$),
  1, 'admin : renomme un terme'
);
select ok(
  (select updated_at = now() from public.terms where key = 'blog' and language = 'fr'),
  'la date de modification suit le changement'
);

-- Les règles.
select throws_ok(
  $$insert into public.terms (key, language, name, gender) values ('methodes', 'fr', 'Méthodes', 'feminine')$$,
  '23514', null, 'une section inconnue est refusée'
);
select throws_ok(
  $$insert into public.terms (key, language, name, gender) values ('podcasts', 'de', 'Podcasts', null)$$,
  '23514', null, 'une langue inconnue est refusée'
);
select throws_ok(
  $$insert into public.terms (key, language, name) values ('podcasts', 'fr', 'Émissions')$$,
  '23514', null, 'en français, le genre est obligatoire'
);
select throws_ok(
  $$insert into public.terms (key, language, name, gender) values ('podcasts', 'en', 'Shows', 'feminine')$$,
  '23514', null, 'en anglais, pas de genre'
);
select throws_ok(
  $$insert into public.terms (key, language, name, gender) values ('podcasts', 'fr', ' Émissions', 'feminine')$$,
  '23514', null, 'un nom avec une espace autour est refusé'
);
select throws_ok(
  $$insert into public.terms (key, language, name, gender) values ('blog', 'en', 'Blog', null)$$,
  '23505', null, 'un seul nom par section et par langue'
);

-- Un éditeur lit mais n'écrit pas ; un éditeur sans double vérification ne lit rien.
select pg_temp.as_person('editor');
select is((select count(*)::int from public.terms), 2, 'éditeur : lit les termes');
select is(
  pg_temp.affected($$update public.terms set name = 'Journal' where key = 'blog'$$), 0,
  'éditeur : ne renomme pas'
);
select throws_ok(
  $$insert into public.terms (key, language, name, gender) values ('podcasts', 'fr', 'Émissions', 'feminine')$$,
  '42501', null, 'éditeur : n''ajoute pas de terme'
);
select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.terms), 0, 'éditeur aal1 : ne lit rien');

-- L'app les lit sans compte.
select pg_temp.as_anon();
select is(
  (select array_agg(name order by language) from public.app_terms() where key = 'blog'),
  array['News', 'Agenda'], 'anon : app_terms() donne les termes'
);
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$delete from public.terms where key = 'blog' and language = 'en'$$), 1,
  'admin : retire un terme (le mot par défaut revient)'
);

select * from finish();
rollback;
