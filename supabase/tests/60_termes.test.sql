-- Les termes de l'installation (Paramètres › Langues) : le nom affiché d'une section dans chaque
-- langue de l'installation, avec ses traits grammaticaux.
-- Lecture par l'équipe en aal2, écriture par un admin ; une langue retirée emporte ses termes ;
-- app_terms() donne ceux des langues actives à tout le monde.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(17);

select pg_temp.create_people();
select pg_temp.reset_languages();
insert into public.languages (code) values ('en'), ('de');

select is((select count(*)::int from public.terms), 0, 'aucun terme au départ');

-- Un admin nomme le Blog dans trois langues, chacune avec ses traits.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$
    insert into public.terms (key, language, name, traits) values
      ('blog', 'fr', 'Actualités', '{"gender": "feminine", "plural": true}'),
      ('blog', 'en', 'News', '{}'),
      ('blog', 'de', 'Blog', '{"gender": "neuter", "forms": {"genitive": "Blogs"}}')
  $$), 3,
  'admin : nomme le Blog en français, en anglais et en allemand'
);
select is(
  pg_temp.affected($$update public.terms set name = 'Agenda', traits = '{"gender": "masculine", "elided": true}' where key = 'blog' and language = 'fr'$$),
  1, 'admin : renomme un terme'
);
select ok(
  (select updated_at = now() from public.terms where key = 'blog' and language = 'fr'),
  'la date de modification suit le changement'
);

-- Les règles.
select throws_ok(
  $$insert into public.terms (key, language, name) values ('podcasts', 'it', 'Podcast')$$,
  '23503', null, 'une langue absente de l''installation est refusée'
);
select throws_ok(
  $$insert into public.terms (key, language, name) values ('Podcasts!', 'en', 'Podcasts')$$,
  '23514', null, 'une clé mal écrite est refusée'
);
select throws_ok(
  $$insert into public.terms (key, language, name, traits) values ('podcasts', 'en', 'Shows', '{"gender": "plural"}')$$,
  '23514', null, 'un genre inconnu est refusé'
);
select throws_ok(
  $$insert into public.terms (key, language, name, traits) values ('podcasts', 'en', 'Shows', '{"color": "blue"}')$$,
  '23514', null, 'un trait inconnu est refusé'
);
select throws_ok(
  $$insert into public.terms (key, language, name, traits) values ('podcasts', 'de', 'Podcasts', '{"forms": {"genitive": ""}}')$$,
  '23514', null, 'une forme vide est refusée'
);
select throws_ok(
  $$insert into public.terms (key, language, name) values ('podcasts', 'en', ' Shows')$$,
  '23514', null, 'un nom avec une espace autour est refusé'
);
select lives_ok(
  $$insert into public.terms (key, language, name) values ('evenements', 'fr', 'Agenda')$$,
  'une section à venir (un autre métier) s''ajoute sans migration'
);

-- Un éditeur lit mais n'écrit pas ; sans double vérification, il ne lit rien.
select pg_temp.as_person('editor');
select is((select count(*)::int from public.terms), 4, 'éditeur : lit les termes');
select is(
  pg_temp.affected($$update public.terms set name = 'Journal' where key = 'blog'$$), 0,
  'éditeur : ne renomme pas'
);
select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.terms), 0, 'éditeur aal1 : ne lit rien');

-- L'app : les termes des langues actives seulement.
select pg_temp.as_person('admin');
update public.languages set enabled = false where code = 'de';
select pg_temp.as_anon();
select is(
  (select array_agg(language || ':' || name order by language) from public.app_terms() where key = 'blog'),
  array['en:News', 'fr:Agenda'], 'anon : les termes des langues actives (l''allemand est arrêté)'
);

-- Une langue retirée emporte ses termes.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$delete from public.languages where code = 'de'$$), 1, 'admin : retire l''allemand'
);
select is(
  (select count(*)::int from public.terms where language = 'de'), 0,
  'ses termes partent avec elle'
);

select * from finish();
rollback;
