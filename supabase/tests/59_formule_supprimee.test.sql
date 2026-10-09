-- Une formule utilisée seulement par d'anciennes versions se supprime (QCM du 09/10/2026, migration
-- …_formule_supprimable.sql) : chaque version garde le nom de sa formule ; la formule supprimée,
-- son lien passe à null ; « Revenir à cette version » remet le niveau à choisir. Une formule
-- reste non supprimable tant qu'un brouillon, un contenu en ligne ou un abonné l'utilise.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(11);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

select pg_temp.as_person('editor');

-- Un article publié avec « Essentiel », puis republié en « Gratuit ».
select pg_temp.create_content('article', 'article', content_title => 'Café');
select pg_temp.save(
  'article', pg_temp.draft('[]', 'Café', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('essentiel'))
);
select pg_temp.publish('article');
select is(
  (select access_level_name from public.versions
    where content_id = pg_temp.cid('article') and number = 1),
  'Essentiel',
  'une version garde le nom de sa formule'
);
select pg_temp.save('article', pg_temp.draft('[]', 'Café', pg_temp.cover()), '{"access_level_id": null}');
select pg_temp.publish('article');
select is(
  (select access_level_name from public.versions
    where content_id = pg_temp.cid('article') and number = 2),
  null,
  'une version gratuite n''a pas de nom de formule'
);

-- Un autre article, en ligne avec « Complet », mais dont le brouillon est passé en « Gratuit ».
select pg_temp.create_content('reserve', 'article', content_title => 'Réservé');
select pg_temp.save(
  'reserve', pg_temp.draft('[]', 'Réservé', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('complet'))
);
select pg_temp.publish('reserve');
select pg_temp.save('reserve', pg_temp.draft('[]', 'Réservé', pg_temp.cover()), '{"access_level_id": null}');

select pg_temp.as_person('admin');
select throws_ok(
  $$delete from public.access_levels where id = pg_temp.lid('complet')$$, 'P0001', 'formule_utilisee',
  'une formule d''un contenu en ligne ne se supprime pas'
);
select is(
  pg_temp.affected($$delete from public.access_levels where id = pg_temp.lid('essentiel')$$), 1,
  'une formule utilisée seulement par une ancienne version se supprime'
);
select pg_temp.as_postgres();
select is(
  (select array[coalesce(access_level_id::text, 'aucun'), access_level_name] from public.versions
    where content_id = pg_temp.cid('article') and number = 1),
  array['aucun', 'Essentiel'],
  'l''ancienne version perd le lien et garde le nom'
);
select throws_ok(
  $$update public.versions set access_level_name = 'Autre'
    where content_id = pg_temp.cid('article') and number = 1$$,
  'P0001', 'version_immuable', 'une version ne se modifie toujours pas'
);

-- Revenir à la version de la formule supprimée : le niveau est à choisir de nouveau.
select pg_temp.as_person('editor');
select is(
  (select warnings from public.revert_to_version((select v.id from public.versions v
    where v.content_id = pg_temp.cid('article') and v.number = 1))),
  array['formule_supprimee'],
  'revenir à cette version le dit'
);
select is(
  (select array[access_chosen::text, coalesce(access_level_id::text, 'aucun')]
    from public.contents where id = pg_temp.cid('article')),
  array['false', 'aucun'],
  'le niveau d''accès est à choisir'
);
select throws_ok(
  $$select pg_temp.publish('article')$$, 'P0001', 'acces_a_choisir',
  'et se choisit avant de publier'
);

-- Un brouillon ou un abonné bloquent aussi.
select pg_temp.as_postgres();
insert into public.access_levels (id, name) values ('40000000-0000-4000-8000-000000000003', 'Découverte');
insert into public.reader_access (user_id, access_level_id)
values (pg_temp.person_id('reader'), '40000000-0000-4000-8000-000000000003');
select pg_temp.as_person('admin');
select throws_ok(
  $$delete from public.access_levels where id = '40000000-0000-4000-8000-000000000003'$$,
  'P0001', 'formule_utilisee', 'une formule d''un abonné ne se supprime pas'
);
select pg_temp.as_postgres();
update public.contents set access_level_id = pg_temp.lid('complet') where id = pg_temp.cid('article');
select pg_temp.as_person('admin');
select throws_ok(
  $$delete from public.access_levels where id = pg_temp.lid('complet')$$, 'P0001', 'formule_utilisee',
  'une formule d''un brouillon ne se supprime pas'
);

select * from finish();
rollback;
