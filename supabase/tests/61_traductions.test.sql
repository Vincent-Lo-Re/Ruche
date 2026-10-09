-- Les traductions des contenus (ADMIN § 7 bis ; migration …_traductions.sql) : langue d'origine,
-- création, enregistrement des textes (forme, révision, verrou), ce qui manque, ce qui est à
-- revoir, ce que la machine a rempli, publication et historique par langue, son d'un épisode,
-- lecture par l'app (langue demandée, langue par défaut, rien), langue arrêtée, programmation,
-- retrait, corbeille, retour à une version, remplacement d'un fichier en ligne, droits.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(71);

select pg_temp.create_people();
select pg_temp.empty_media_library();
-- Le français seul, par défaut, et aucun contenu.
select pg_temp.reset_languages();
\ir aides/publication.inc

insert into public.languages (code) values ('en'), ('es');
insert into public.languages (code, enabled) values ('de', false);

-- Les blocs de l'article : un texte, une image avec sa légende, un encadré avec un texte.
create function pg_temp.bid(n text)
returns text
language sql
immutable
as $$
  select '00000000-0000-4000-8000-0000000000' || n
$$;

create function pg_temp.doc(body text)
returns jsonb
language sql
immutable
as $$
  select pg_temp.text_block('x', body) -> 'doc'
$$;

create function pg_temp.article_draft(first_text text default 'Bonjour')
returns jsonb
language sql
immutable
as $$
  select pg_temp.draft(
    jsonb_build_array(
      pg_temp.text_block(pg_temp.bid('b1'), first_text),
      pg_temp.image_block(pg_temp.bid('b2'), pg_temp.mid('photo')) || '{"caption": "Un chat"}',
      pg_temp.box_block(pg_temp.bid('b3'), jsonb_build_array(pg_temp.text_block(pg_temp.bid('b4'), 'Dedans')))
    ),
    'Café',
    pg_temp.cover()
  )
$$;

create function pg_temp.english(first_text text default 'Hello')
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    pg_temp.bid('b1'), jsonb_build_object('doc', pg_temp.doc(first_text)),
    pg_temp.bid('b2'), jsonb_build_object('caption', 'A cat', 'alt', null),
    pg_temp.bid('b4'), jsonb_build_object('doc', pg_temp.doc('Inside'))
  )
$$;

-- La révision d'une traduction (lue sans les politiques).
create function pg_temp.trev(content_name text, lang text)
returns integer
language sql
stable
security definer
as $$
  select draft_rev from public.content_translations
  where content_id = pg_temp.cid(content_name) and language = lang
$$;

create function pg_temp.tsave(
  content_name text,
  lang text,
  title text,
  texts jsonb,
  audio jsonb default null,
  reviewed text[] default '{}',
  machine text[] default '{}'
)
returns integer
language sql
as $$
  select (public.translation_save(
    pg_temp.cid(content_name), lang, pg_temp.trev(content_name, lang), title, texts, audio,
    null, reviewed, machine
  )).draft_rev
$$;

create function pg_temp.state(content_name text, lang text)
returns record
language sql
as $$
  select row(s.missing, s.review, s.machine, s.ready, s.modified)
  from public.translation_state(pg_temp.cid(content_name)) s
  where s.language = lang
$$;

grant execute on function
  pg_temp.bid(text),
  pg_temp.doc(text),
  pg_temp.article_draft(text),
  pg_temp.english(text),
  pg_temp.trev(text, text),
  pg_temp.tsave(text, text, text, jsonb, jsonb, text[], text[]),
  pg_temp.state(text, text)
to public;

select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- La langue d'origine, et la création d'une traduction
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('article', 'article', content_title => 'Café');
select pg_temp.save('article', pg_temp.article_draft(), '{"access_level_id": null}');

select is(
  (select array[source_language, untranslated] from public.contents where id = pg_temp.cid('article')),
  array['fr', 'show_default'],
  'un contenu est écrit dans la langue par défaut, et se montre dans cette langue sans traduction'
);
select throws_ok(
  $$select public.translation_create(pg_temp.cid('article'), 'fr')$$, 'P0001', 'langue_d_origine',
  'pas de traduction dans la langue d''origine'
);
select throws_ok(
  $$select public.translation_create(pg_temp.cid('article'), 'de')$$, 'P0001', 'langue_invalide',
  'pas de traduction dans une langue arrêtée'
);
select throws_ok(
  $$select public.translation_create(pg_temp.cid('article'), 'it')$$, 'P0001', 'langue_invalide',
  'pas de traduction dans une langue que l''installation n''a pas'
);
select lives_ok(
  $$select public.translation_create(pg_temp.cid('article'), 'en')$$, 'une traduction en anglais'
);
select is(
  (select mine from public.translation_lock_status(pg_temp.cid('article'), 'en')),
  true,
  'qui crée une traduction en tient le verrou'
);
select throws_ok(
  $$select public.translation_create(pg_temp.cid('article'), 'en')$$, 'P0001', 'traduction_existante',
  'une seule traduction par langue'
);
select pg_temp.create_content('modele', 'template', 'Mise en forme', 'style');
select throws_ok(
  $$select public.translation_create(pg_temp.cid('modele'), 'en')$$, 'P0001', 'sorte_invalide',
  'un modèle ne se traduit pas (pour l''instant)'
);

-- ---------------------------------------------------------------------------------------------
-- Les textes : ce qui manque, la forme, la révision, le verrou
-- ---------------------------------------------------------------------------------------------

select is(
  pg_temp.state('article', 'en'),
  row(
    array[pg_temp.bid('b1'), pg_temp.bid('b2'), pg_temp.bid('b4'), 'title'], '{}'::text[], '{}'::text[],
    false, false
  ),
  'une traduction neuve : il manque le titre, les deux textes et la légende'
);
select throws_ok(
  $$select (public.translation_publish(pg_temp.cid('article'), 'en', pg_temp.trev('article', 'en'))).version_id$$,
  'P0001', 'traduction_incomplete', 'une traduction incomplète ne se publie pas'
);
select throws_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee',
    jsonb_build_object(pg_temp.bid('b1'), jsonb_build_object('doc', pg_temp.doc('Hi'), 'caption', 'x')))$$,
  'P0001', 'forme_invalide', 'un texte est { doc } ou { caption, alt }, pas les deux'
);
select throws_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee',
    jsonb_build_object(pg_temp.bid('b1'), jsonb_build_object('doc', 'Hi')))$$,
  'P0001', 'forme_invalide', 'un texte traduit suit le schéma des blocs'
);
select throws_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee', '{"pas-un-id": {"doc": null}}')$$,
  'P0001', 'forme_invalide', 'un texte traduit est rangé sous l''identifiant d''un bloc'
);
select lives_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee', pg_temp.english())$$,
  'les textes traduits s''enregistrent'
);
select is(
  pg_temp.state('article', 'en'),
  row('{}'::text[], '{}'::text[], '{}'::text[], true, false),
  'tout est traduit : la traduction est prête'
);
select throws_ok(
  $$select public.translation_save(pg_temp.cid('article'), 'en', pg_temp.trev('article', 'en') - 1,
    'Coffee', pg_temp.english('Hey'))$$,
  'P0001', 'conflit_revision', 'une traduction qui a changé depuis sa lecture est refusée'
);
select lives_ok(
  $$select public.translation_save(pg_temp.cid('article'), 'en', pg_temp.trev('article', 'en') - 1,
    'Coffee', pg_temp.english())$$,
  'le même envoi rejoué (réponse perdue) est accepté'
);

select pg_temp.as_person('editor2');
select throws_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee', pg_temp.english('Hey'))$$,
  'P0001', 'verrou_perdu', 'sans le verrou de la traduction, on ne l''enregistre pas'
);
select throws_ok(
  $$select public.translation_lock_take(pg_temp.cid('article'), 'es')$$,
  'P0001', 'traduction_introuvable', 'pas de verrou sur une traduction qui n''existe pas'
);
select is(
  (select mine from public.translation_lock_take(pg_temp.cid('article'), 'en')),
  false,
  'le verrou d''un autre, encore actif, ne se prend pas sans le demander'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Publier une traduction ; ce que voit l'app
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select public.translation_publish(pg_temp.cid('article'), 'en', pg_temp.trev('article', 'en'))$$,
  'la traduction anglaise se publie, avant même la langue d''origine'
);
select is(
  (select array[v.language, v.number::text] from public.content_translations t
    join public.versions v on v.id = t.live_version_id
    where t.content_id = pg_temp.cid('article') and t.language = 'en'),
  array['en', '1'],
  'sa version est la première de l''anglais'
);

select pg_temp.as_anon();
select is(
  (select array[
    c ->> 'language', c ->> 'title', c #>> '{blocks,0,doc,content,0,content,0,text}',
    c #>> '{blocks,1,caption}', c #>> '{blocks,2,blocks,0,doc,content,0,content,0,text}'
  ] from (select public.app_content(pg_temp.cid('article'), 'en') c) x),
  array['en', 'Coffee', 'Hello', 'A cat', 'Inside'],
  'l''app lit l''anglais : la structure d''origine avec les textes traduits'
);
select is(
  public.app_content(pg_temp.cid('article'), 'fr'), null,
  'en français, rien : ni la langue par défaut ni la langue d''origine ne sont en ligne'
);
select pg_temp.as_person('editor');

select pg_temp.publish('article');
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('article'), 'es') ->> 'language', 'fr',
  'en espagnol (sans traduction) : la langue par défaut'
);
select is(
  public.app_content(pg_temp.cid('article')) ->> 'language', 'fr',
  'sans langue demandée : la langue par défaut'
);
select is(
  public.app_content(pg_temp.cid('article'), 'xx') ->> 'language', 'fr',
  'une langue que l''installation n''a pas : la langue par défaut'
);
select is(
  (select array[i ->> 'language', i ->> 'title']
    from jsonb_array_elements(public.app_feed('blog', language => 'en') -> 'items') i),
  array['en', 'Coffee'],
  'la liste du Blog en anglais'
);
select is(
  (select array[i ->> 'language', i ->> 'title']
    from jsonb_array_elements(public.app_feed('blog') -> 'items') i),
  array['fr', 'Café'],
  'la liste du Blog dans la langue par défaut'
);
select pg_temp.as_person('editor');

select lives_ok(
  $$select pg_temp.save('article', pg_temp.article_draft(), '{"untranslated": "hide"}')$$,
  'le contenu se cache aux lecteurs dont la langue n''a pas de traduction'
);
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('article'), 'es'), null,
  'caché : en espagnol, rien'
);
select is(
  jsonb_array_length(public.app_feed('blog', language => 'es') -> 'items'), 0,
  'caché : la liste du Blog en espagnol est vide'
);
select is(
  public.app_content(pg_temp.cid('article'), 'en') ->> 'language', 'en',
  'caché : en anglais, la traduction'
);
select pg_temp.as_postgres();
update public.languages set enabled = false where code = 'en';
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('article'), 'en') ->> 'language', 'fr',
  'une langue arrêtée disparaît de l''app : ses lecteurs ont la langue par défaut'
);
select pg_temp.as_postgres();
update public.languages set enabled = true where code = 'en';
select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.save('article', pg_temp.article_draft(), '{"untranslated": "parfois"}')$$,
  'P0001', 'reglages_invalides', 'untranslated : show_default ou hide'
);

-- ---------------------------------------------------------------------------------------------
-- À revoir, traduit automatiquement, modifié
-- ---------------------------------------------------------------------------------------------

select pg_temp.save('article', pg_temp.article_draft('Bonjour à tous'));
select is(
  pg_temp.state('article', 'en'),
  row('{}'::text[], array[pg_temp.bid('b1')], '{}'::text[], true, true),
  'le texte d''origine a changé : son bloc est à revoir, et la traduction en ligne est modifiée'
);
select lives_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee', pg_temp.english(), reviewed => array[pg_temp.bid('b1')])$$,
  'valider un texte sans le changer'
);
select is(
  (select s.review from public.translation_state(pg_temp.cid('article')) s where s.language = 'en'),
  '{}'::text[],
  'validé : plus rien à revoir'
);
select lives_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee', pg_temp.english('Hello everyone'),
    machine => array[pg_temp.bid('b1')])$$,
  'un texte rempli par la traduction automatique'
);
select is(
  (select s.machine from public.translation_state(pg_temp.cid('article')) s where s.language = 'en'),
  array[pg_temp.bid('b1')],
  'il est marqué « Traduit automatiquement »'
);
select pg_temp.tsave('article', 'en', 'Coffee', pg_temp.english('Hello all'));
select is(
  (select s.machine from public.translation_state(pg_temp.cid('article')) s where s.language = 'en'),
  '{}'::text[],
  'une personne le modifie : il n''est plus marqué'
);
select is(
  (select (public.translation_publish(pg_temp.cid('article'), 'en', pg_temp.trev('article', 'en'))).version_number),
  2,
  'chaque langue a son historique : la deuxième version de l''anglais'
);
select is(
  (select v.number from public.contents c join public.versions v on v.id = c.live_version_id
    where c.id = pg_temp.cid('article')),
  1,
  'la langue d''origine garde sa première version'
);

-- ---------------------------------------------------------------------------------------------
-- La langue d'origine se fixe ; une langue utilisée ne se retire pas
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$select pg_temp.save('article', pg_temp.article_draft('Bonjour à tous'), '{"source_language": "es"}')$$,
  'P0001', 'langue_d_origine_fixee', 'avec une traduction, la langue d''origine ne change plus'
);
select pg_temp.create_content('brouillon', 'article', content_title => 'Brouillon');
select lives_ok(
  $$select pg_temp.save('brouillon', pg_temp.draft('[]', 'Draft'), '{"source_language": "en"}')$$,
  'sans traduction, la langue d''origine change'
);
select throws_ok(
  $$select pg_temp.save('brouillon', pg_temp.draft('[]', 'Draft'), '{"source_language": "de"}')$$,
  'P0001', 'langue_invalide', 'la langue d''origine est une langue active'
);
select pg_temp.as_postgres();
select throws_ok(
  $$delete from public.languages where code = 'en'$$, '23514', 'langue_utilisee',
  'une langue utilisée par un contenu ne se retire pas'
);
select lives_ok(
  $$delete from public.languages where code = 'de'$$, 'une langue inutilisée se retire'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Le son d'un épisode, dans chaque langue
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('episode', 'episode', content_title => 'Épisode');
select pg_temp.save(
  'episode',
  pg_temp.draft('[]', 'Épisode', pg_temp.cover() || jsonb_build_object('audio', jsonb_build_object('mediaId', pg_temp.mid('son')))),
  '{"access_level_id": null}'
);
select public.translation_create(pg_temp.cid('episode'), 'es');
select pg_temp.tsave('episode', 'es', 'Episodio', '{}');
select is(
  (select s.ready from public.translation_state(pg_temp.cid('episode')) s where s.language = 'es'),
  false,
  'un épisode traduit sans son n''est pas prêt'
);
select throws_ok(
  $$select public.translation_publish(pg_temp.cid('episode'), 'es', pg_temp.trev('episode', 'es'))$$,
  'P0001', 'son_manquant', 'ni publiable'
);
select throws_ok(
  $$select pg_temp.tsave('episode', 'es', 'Episodio', '{}', jsonb_build_object('mediaId', pg_temp.mid('photo')))$$,
  'P0001', 'fichier_inadapte', 'le son d''une traduction est un fichier audio'
);
select throws_ok(
  $$select pg_temp.tsave('article', 'en', 'Coffee', pg_temp.english('Hello all'), jsonb_build_object('mediaId', pg_temp.mid('son')))$$,
  'P0001', 'forme_invalide', 'seul un épisode a un son'
);
select pg_temp.tsave('episode', 'es', 'Episodio', '{}', jsonb_build_object('mediaId', pg_temp.mid('son')));
select is(
  (select public.translation_publish(pg_temp.cid('episode'), 'es', pg_temp.trev('episode', 'es')) is not null),
  true,
  'avec son son, l''épisode traduit se publie'
);
select pg_temp.as_postgres();
select ok(
  exists (
    select 1 from private.media_uses(pg_temp.mid('son')) u
    where u.content_id = pg_temp.cid('episode') and u.in_draft and u.in_app
  ),
  'le son d''une traduction compte parmi les utilisations du fichier'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Revenir à une version d'une traduction
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select public.revert_to_version((select v.id from public.versions v
    where v.content_id = pg_temp.cid('article') and v.language = 'en' and v.number = 1))$$,
  'revenir à la première version de l''anglais'
);
select is(
  (select texts #>> array[pg_temp.bid('b1'), 'doc', 'content', '0', 'content', '0', 'text']
    from public.content_translations where content_id = pg_temp.cid('article') and language = 'en'),
  'Hello',
  'ses textes reviennent'
);
select is(
  (select s.review from public.translation_state(pg_temp.cid('article')) s where s.language = 'en'),
  array[pg_temp.bid('b1')],
  'les textes repris sont à revoir'
);
select is(
  (select draft ->> 'title' from public.contents where id = pg_temp.cid('article')),
  'Café',
  'la langue d''origine ne bouge pas'
);

-- ---------------------------------------------------------------------------------------------
-- Programmer, retirer, remplacer un fichier en ligne
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select public.translation_schedule(pg_temp.cid('article'), 'en', now() + interval '1 day')$$,
  'la traduction se programme'
);
select pg_temp.as_postgres();
update public.content_translations set scheduled_at = now() - interval '1 minute'
where content_id = pg_temp.cid('article') and language = 'en';
select private.run_due_publications();
select is(
  (select array[v.number::text, coalesce(t.scheduled_at::text, 'aucune')]
    from public.content_translations t join public.versions v on v.id = t.live_version_id
    where t.content_id = pg_temp.cid('article') and t.language = 'en'),
  array['3', 'aucune'],
  'à son heure, la traduction est publiée (troisième version de l''anglais)'
);
select pg_temp.as_person('editor');

select results_eq(
  $$select version_number from public.media_replace_live(pg_temp.mid('photo'), pg_temp.mid('fond')) order by 1$$,
  $$values (2), (4)$$,
  'remplacer une image en ligne : une nouvelle version dans chaque langue (fr n° 2, en n° 4)'
);
select is(
  (select v.media_ids @> array[pg_temp.mid('fond')] from public.content_translations t
    join public.versions v on v.id = t.live_version_id
    where t.content_id = pg_temp.cid('article') and t.language = 'en'),
  true,
  'la traduction en ligne a la nouvelle image'
);

select lives_ok(
  $$select public.translation_unpublish(pg_temp.cid('article'), 'en')$$, 'l''anglais se retire seul'
);
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('article'), 'en'), null,
  'retiré, et le contenu caché sans traduction : en anglais, rien'
);
select is(
  public.app_content(pg_temp.cid('article'), 'fr') ->> 'language', 'fr',
  'la langue d''origine reste en ligne'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Corbeille, suppression d'une traduction, droits
-- ---------------------------------------------------------------------------------------------

select public.trash(pg_temp.cid('episode'));
select is(
  (select live_version_id from public.content_translations
    where content_id = pg_temp.cid('episode') and language = 'es'),
  null,
  'à la corbeille, les traductions quittent l''app'
);
select throws_ok(
  $$select pg_temp.tsave('episode', 'es', 'Episodio', '{}', jsonb_build_object('mediaId', pg_temp.mid('son')))$$,
  'P0001', 'dans_la_corbeille', 'la traduction d''un contenu à la corbeille ne se modifie pas'
);

select lives_ok(
  $$select public.translation_delete(pg_temp.cid('article'), 'en')$$, 'une traduction se supprime'
);
select is(
  (select count(*)::integer from public.translation_locks where content_id = pg_temp.cid('article')),
  0,
  'son verrou part avec elle'
);

select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  $$select * from public.translation_state(pg_temp.cid('article'))$$, '42501', 'reserve_a_l_equipe',
  'avant la double vérification, pas de traduction'
);
select pg_temp.as_anon();
select throws_ok(
  $$select count(*) from public.content_translations$$, '42501', null,
  'anonyme : les traductions ne se lisent pas'
);

select * from finish();
rollback;
