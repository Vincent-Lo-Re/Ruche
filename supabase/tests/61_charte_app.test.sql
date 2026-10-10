-- La charte graphique de l'app (ADMIN § 1, section « App ») : une seule ligne, lue par l'équipe ;
-- le brouillon s'enregistre, se publie ou revient à la version publiée par un admin, avec la
-- révision attendue ; la base refuse une charte qui n'a pas la forme de la variante « style » ou
-- dont un usage désigne une couleur ou une police absente, ou qui a un nom en double ; l'app lit
-- la version publiée par app_style(), sans compte.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
\ir aides/blocs-cas.inc
select plan(36);

select pg_temp.create_people();

-- La charte neutre des cas partagés, et des variantes.
create function pg_temp.neutral()
returns jsonb
language sql
as $$
  select data from blocks_cases where name = 'accepte-charte-neutre'
$$;
create function pg_temp.save_command(doc jsonb, rev integer)
returns text
language sql
as $$
  select format('select public.style_save(%L::jsonb, %s)', doc, rev)
$$;
grant execute on function pg_temp.neutral(), pg_temp.save_command(jsonb, integer) to public;

-- Au départ : une ligne, sans brouillon ni version publiée.
select is((select count(*)::int from public.app_style), 1, 'une seule ligne au départ');
select is(
  (select row(draft, draft_rev, published, published_at)::text from public.app_style),
  '(,0,,)', 'ni brouillon ni version publiée au départ, révision 0'
);
select is(
  jsonb_array_length(private.style_problems(pg_temp.neutral())), 0,
  'la charte neutre des cas partagés n''a aucun problème'
);

-- anon : la charte publiée par app_style(), rien de la table ni des écritures.
select pg_temp.as_anon();
select is(public.app_style(), null, 'anon : app_style() vide tant que rien n''est publié');
select throws_ok('select * from public.app_style', '42501', null, 'anon : pas de lecture de la table');
select throws_ok(
  'select public.style_save(''{}''::jsonb, 0)', '42501', null, 'anon : style_save non exécutable'
);

-- Un lecteur ne voit pas la ligne ; un éditeur la lit, sans l'écrire.
select pg_temp.as_person('reader');
select is((select count(*)::int from public.app_style), 0, 'lecteur : la ligne est cachée');
select pg_temp.as_person('editor');
select is((select count(*)::int from public.app_style), 1, 'éditeur : lit la charte (aperçu de l''éditeur)');
select throws_ok(
  pg_temp.save_command(pg_temp.neutral(), 0), '42501', 'reserve_aux_admins',
  'éditeur : n''enregistre pas la charte'
);
select throws_ok('select public.style_publish(0)', '42501', 'reserve_aux_admins', 'éditeur : ne publie pas');
select throws_ok('select public.style_discard(0)', '42501', 'reserve_aux_admins', 'éditeur : ne revient pas en arrière');
select pg_temp.as_person('admin', 'aal1');
select throws_ok(
  pg_temp.save_command(pg_temp.neutral(), 0), '42501', 'reserve_aux_admins',
  'admin sans la double vérification : refusé'
);

-- Un admin enregistre, avec la révision attendue.
select pg_temp.as_person('admin');
select is(public.style_save(pg_temp.neutral(), 0), 1, 'admin : enregistre, révision 1');
select is((select draft from public.app_style), pg_temp.neutral(), 'le brouillon est la charte envoyée');
select throws_ok(
  pg_temp.save_command(pg_temp.neutral(), 0), 'P0001', 'conflit_revision',
  'une révision dépassée est refusée'
);

-- Les chartes refusées, et ce que l'admin en saura (les faits dans hint).
select is(
  pg_temp.facts_of(pg_temp.save_command(null, 1)),
  '{"code": "charte_invalide", "hint": [{"rule": "shape", "message": "null"}]}'::jsonb,
  'pas de charte : refusée'
);
select is(
  pg_temp.facts_of(pg_temp.save_command('{"v": 1}', 1)) -> 'hint' -> 0 ->> 'rule',
  'shape',
  'une charte d''une autre forme : refusée, rule « shape »'
);
select is(
  pg_temp.facts_of(pg_temp.save_command(
    jsonb_set(pg_temp.neutral(), '{roles,text}', '"00000000-0000-4000-8000-000000000999"'), 1
  )),
  '{"code": "charte_invalide", "hint": [{"rule": "reference", "at": "roles.text"}]}'::jsonb,
  'un usage qui désigne une couleur absente : refusé'
);
select is(
  pg_temp.facts_of(pg_temp.save_command(
    jsonb_set(pg_temp.neutral(), '{fontRoles,body}', '"00000000-0000-4000-8000-000000000999"'), 1
  )) -> 'hint',
  '[{"rule": "reference", "at": "fontRoles.body"}]'::jsonb,
  'un usage qui désigne une police absente : refusé'
);
select is(
  pg_temp.facts_of(pg_temp.save_command(
    jsonb_set(pg_temp.neutral(), '{tints,0,fill}', '"00000000-0000-4000-8000-000000000999"'), 1
  )) -> 'hint',
  '[{"rule": "reference", "at": "tints.0.fill"}]'::jsonb,
  'une teinte qui désigne une couleur absente : refusée'
);
select is(
  pg_temp.facts_of(pg_temp.save_command(
    jsonb_set(pg_temp.neutral(), '{buttons,2,end}', '"00000000-0000-4000-8000-000000000999"'), 1
  )) -> 'hint',
  '[{"rule": "reference", "at": "buttons.2.end"}]'::jsonb,
  'un bouton qui désigne une couleur absente, même inutilisée par son style : refusé'
);
select is(
  pg_temp.facts_of(pg_temp.save_command(
    jsonb_set(pg_temp.neutral(), '{colors,1,name}', '"WHITE"'), 1
  )) -> 'hint',
  '[{"rule": "duplicateName", "list": "colors", "name": "WHITE"}]'::jsonb,
  'deux couleurs du même nom (majuscules ignorées) : refusé'
);
select is(
  pg_temp.facts_of(pg_temp.save_command(
    jsonb_set(pg_temp.neutral(), '{badges,1}', pg_temp.neutral() -> 'badges' -> 0
      || '{"name": "Other"}'), 1
  )) -> 'hint',
  '[{"rule": "duplicateId", "list": "badges", "id": "00000000-0000-4000-8000-000000000400"}]'::jsonb,
  'deux pastilles du même identifiant : refusé'
);
select is((select draft_rev from public.app_style), 1, 'rien n''a changé après les refus');

-- Publier : l'app lit la charte publiée ; un nouveau brouillon ne la change pas.
select throws_ok('select public.style_publish(0)', 'P0001', 'conflit_revision', 'publier : révision dépassée refusée');
select is(public.style_publish(1), 1, 'publier rend la révision, inchangée');
select ok((select published_at is not null from public.app_style), 'publiée : la date est notée');
select pg_temp.as_anon();
select is(public.app_style(), pg_temp.neutral(), 'anon : app_style() donne la charte publiée');
select pg_temp.as_person('admin');
select is(
  public.style_save(jsonb_set(pg_temp.neutral(), '{darkMode}', '"light"'), 1), 2,
  'un nouveau brouillon, révision 2'
);
select pg_temp.as_anon();
select is(public.app_style() ->> 'darkMode', 'auto', 'l''app garde la version publiée');

-- Revenir à la version publiée.
select pg_temp.as_person('admin');
select throws_ok('select public.style_discard(1)', 'P0001', 'conflit_revision', 'revenir : révision dépassée refusée');
select is(public.style_discard(2), 3, 'revenir à la version publiée, révision 3');
select is(
  (select draft from public.app_style), pg_temp.neutral(), 'le brouillon est la version publiée'
);

-- La table tient la règle, même sans les fonctions ; ni ajout ni suppression.
select pg_temp.as_postgres();
select throws_ok(
  'update public.app_style set draft = ''{"v": 1}''', '23514', null,
  'la table refuse une charte d''une autre forme'
);
select throws_ok(
  format(
    'update public.app_style set published = %L',
    jsonb_set(pg_temp.neutral(), '{roles,card}', '"00000000-0000-4000-8000-000000000999"')
  ),
  '23514', null,
  'la table refuse une charte publiée dont un usage désigne une couleur absente'
);
select throws_ok('insert into public.app_style (id) values (true)', '23505', null, 'pas de deuxième ligne');

select * from finish();
rollback;
