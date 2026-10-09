-- Un titre par section (09/10/2026, migration …_titres_uniques.sql) : deux articles, deux épisodes
-- ou deux pages ne portent pas le même titre ; majuscules et espaces ne comptent pas, les accents
-- si ; un titre vide, un modèle de bloc et la corbeille ne comptent pas. Un contenu restauré ou
-- une version dont le titre a été repris revient renommé (« (2) »).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(24);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

select pg_temp.as_person('editor');

-- Création.
select lives_ok(
  $$select pg_temp.create_content('a', 'article', content_title => 'Mon article')$$,
  'un article « Mon article »'
);
select throws_ok(
  $$select pg_temp.create_content('a2', 'article', content_title => 'Mon article')$$,
  'P0001', 'titre_pris', 'un second article du même titre est refusé'
);
select throws_ok(
  $$select pg_temp.create_content('a2', 'article', content_title => E'  mon \t ARTICLE ')$$,
  'P0001', 'titre_pris', 'majuscules et espaces ne comptent pas'
);
select lives_ok(
  $$select pg_temp.create_content('accent', 'article', content_title => 'Mon articlé')$$,
  'les accents comptent'
);
select lives_ok(
  $$select pg_temp.create_content('e', 'episode', content_title => 'Mon article')$$,
  'un épisode peut porter le titre d''un article'
);
select lives_ok(
  $$select pg_temp.create_content('p', 'page', content_title => 'Mon article')$$,
  'une page aussi'
);
select throws_ok(
  $$select pg_temp.create_content('p2', 'page', content_title => 'MON ARTICLE')$$,
  'P0001', 'titre_pris', 'mais pas une seconde page'
);
select lives_ok(
  $$select pg_temp.create_content('t1', 'template', content_title => 'Bandeau', sort => 'style')$$
  || $$; select pg_temp.create_content('t2', 'template', content_title => 'Bandeau', sort => 'style')$$,
  'deux modèles de bloc du même titre'
);
select lives_ok(
  $$select pg_temp.create_content('v1', 'article'); select pg_temp.create_content('v2', 'article')$$,
  'deux articles sans titre'
);

-- Enregistrement.
select throws_ok(
  $$select pg_temp.save('accent', pg_temp.draft('[]', 'mon article'))$$,
  'P0001', 'titre_pris', 'save_draft : un titre pris est refusé'
);
select is(
  (select title from public.contents where id = pg_temp.cid('accent')), 'Mon articlé',
  'le brouillon garde son titre'
);
select lives_ok(
  $$select pg_temp.save('a', pg_temp.draft('[]', 'MON ARTICLE'))$$,
  'un contenu peut changer la forme de son propre titre'
);

-- Pendant qu'on tape.
select results_eq(
  format($$select taken_id from public.content_title_taken('article', ' mon article ')$$),
  format($$values (%L::uuid)$$, pg_temp.cid('a')),
  'content_title_taken : le contenu qui porte le titre'
);
select is_empty(
  format($$select * from public.content_title_taken('article', 'Mon article', %L)$$, pg_temp.cid('a')),
  'sans le contenu lui-même'
);
select is_empty(
  $$select * from public.content_title_taken('template', 'Bandeau')$$,
  'un modèle n''est jamais concerné'
);
select pg_temp.as_anon();
select throws_ok(
  $$select * from public.content_title_taken('article', 'Mon article')$$,
  '42501', null, 'anon : ne peut pas appeler content_title_taken'
);
select pg_temp.as_person('reader');
select throws_ok(
  $$select * from public.content_title_taken('article', 'Mon article')$$,
  '42501', 'reserve_a_l_equipe', 'un lecteur non plus'
);

-- Corbeille : le titre est libéré, et revient renommé.
select pg_temp.as_person('editor');
select public.trash(pg_temp.cid('a'));
select lives_ok(
  $$select pg_temp.create_content('b', 'article', content_title => 'Mon article')$$,
  'le titre d''un contenu à la corbeille est libre'
);
select results_eq(
  format('select warnings, title from public.restore(%L)', pg_temp.cid('a')),
  $$values (array['titre_renomme'], 'MON ARTICLE (2)')$$,
  'restore : le titre repris, avertissement titre_renomme et le nouveau titre'
);
select is(
  (select title from public.contents where id = pg_temp.cid('a')), 'MON ARTICLE (2)',
  'le contenu restauré est renommé « (2) »'
);
select public.trash(pg_temp.cid('a'));
select pg_temp.save('b', pg_temp.draft('[]', 'Mon article (2)'));
select public.restore(pg_temp.cid('a'));
select is(
  (select title from public.contents where id = pg_temp.cid('a')), 'MON ARTICLE (3)',
  'un « (n) » déjà au bout est remplacé, pas ajouté'
);

-- Version : son titre repris depuis revient renommé.
select pg_temp.create_content('r', 'article', content_title => 'Version');
select pg_temp.save('r', pg_temp.draft('[]', 'Version', pg_temp.cover()), '{"access_level_id": null}');
select pg_temp.publish('r');
select pg_temp.save('r', pg_temp.draft('[]', 'Autre', pg_temp.cover()));
select pg_temp.create_content('r2', 'article', content_title => 'Version');
select is(
  (select warnings from public.revert_to_version(
    (select v.id from public.versions v where v.content_id = pg_temp.cid('r')))),
  array['titre_renomme'],
  'revert_to_version : le titre de la version repris, avertissement titre_renomme'
);
select is(
  (select title from public.contents where id = pg_temp.cid('r')), 'Version (2)',
  'le brouillon revient renommé'
);

-- L'index tient la règle, même sans les fonctions.
select pg_temp.as_postgres();
select throws_ok(
  format(
    $$update public.contents set draft = jsonb_set(draft, '{title}', '"mon articlé"') where id = %L$$,
    pg_temp.cid('b')
  ),
  '23505', null, 'l''index unique refuse un doublon écrit directement'
);

select * from finish();
rollback;
