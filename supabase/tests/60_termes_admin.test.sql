-- Les termes de l'admin (Paramètres › Avancé) : le nom d'une section dans l'interface de l'admin,
-- en anglais ou en français, avec ses traits grammaticaux.
-- Lecture par l'équipe en aal2, écriture par un admin ; rien pour un anonyme (l'app n'en a pas).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(14);

select pg_temp.create_people();
delete from public.admin_terms;

select is((select count(*)::int from public.admin_terms), 0, 'aucun terme au départ');

-- Un admin nomme le Blog en français et en anglais.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$
    insert into public.admin_terms (key, language, name, traits) values
      ('blog', 'fr', 'Actualités', '{"gender": "feminine", "plural": true}'),
      ('blog', 'en', 'News', '{}')
  $$), 2,
  'admin : nomme le Blog en français et en anglais'
);
select is(
  pg_temp.affected($$update public.admin_terms set name = 'Agenda', traits = '{"gender": "masculine", "elided": true}' where key = 'blog' and language = 'fr'$$),
  1, 'admin : renomme un terme'
);
select ok(
  (select updated_at = now() from public.admin_terms where key = 'blog' and language = 'fr'),
  'la date de modification suit le changement'
);

-- Les règles.
select throws_ok(
  $$insert into public.admin_terms (key, language, name) values ('podcasts', 'de', 'Podcasts')$$,
  '23514', null, 'une langue qui n''est pas celle de l''interface est refusée'
);
select throws_ok(
  $$insert into public.admin_terms (key, language, name) values ('Podcasts!', 'en', 'Podcasts')$$,
  '23514', null, 'une clé mal écrite est refusée'
);
select throws_ok(
  $$insert into public.admin_terms (key, language, name, traits) values ('podcasts', 'fr', 'Émissions', '{"gender": "neuter"}')$$,
  '23514', null, 'un genre inconnu est refusé'
);
select throws_ok(
  $$insert into public.admin_terms (key, language, name, traits) values ('podcasts', 'en', 'Shows', '{"color": "blue"}')$$,
  '23514', null, 'un trait inconnu est refusé'
);
select throws_ok(
  $$insert into public.admin_terms (key, language, name) values ('podcasts', 'en', ' Shows')$$,
  '23514', null, 'un nom avec une espace autour est refusé'
);
select lives_ok(
  $$insert into public.admin_terms (key, language, name) values ('evenements', 'fr', 'Agenda')$$,
  'une section à venir (un autre métier) se nomme sans migration'
);

-- Un éditeur lit mais n'écrit pas ; sans double vérification, il ne lit rien ; un anonyme rien.
select pg_temp.as_person('editor');
select is((select count(*)::int from public.admin_terms), 3, 'éditeur : lit les termes');
select is(
  pg_temp.affected($$update public.admin_terms set name = 'Journal' where key = 'blog'$$), 0,
  'éditeur : ne renomme pas'
);
select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.admin_terms), 0, 'éditeur aal1 : ne lit rien');
select pg_temp.as_anon();
select throws_ok(
  $$select count(*) from public.admin_terms$$, '42501', null, 'anon : ne lit rien'
);

select * from finish();
rollback;
