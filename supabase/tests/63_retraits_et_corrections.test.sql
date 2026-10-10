-- Ce qui a été retiré les 09 et 10/10/2026 n'existe plus (langues et traductions, première charte
-- graphique de l'app), et les corrections du 10/10/2026 (…_corrections_base.sql) : un titre ou
-- une adresse pris entre-temps donne le code de la base ; le texte alternatif de la Médiathèque
-- n'a plus qu'une fonction.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(13);

-- Langues et traductions (retirées le 09/10/2026).
select hasnt_table('public', 'languages', 'languages n''existe plus');
select hasnt_table('public', 'content_translations', 'content_translations n''existe plus');
select hasnt_table('public', 'translation_locks', 'translation_locks n''existe plus');
select hasnt_table('public', 'admin_terms', 'admin_terms n''existe plus');

-- La première charte graphique de l'app (retirée le 10/10/2026).
select hasnt_table('public', 'app_style', 'app_style n''existe plus');
select hasnt_function('public', 'app_style', 'app_style() n''existe plus');
select hasnt_function('public', 'style_save', 'style_save n''existe plus');
select hasnt_function('private', 'style_problems', 'private.style_problems n''existe plus');
select ok(
  not exists (select 1 from storage.buckets where id = 'polices'),
  'l''espace « polices » n''existe plus'
);

-- Une seule fonction pour le texte alternatif tiré de la Médiathèque.
select hasnt_function('private', 'resolve_alt', 'private.resolve_alt n''existe plus');

-- Un titre ou une adresse pris entre-temps (index unique) : le code de la base.
select throws_ok(
  $$select private.raise_taken('contents_title_key')$$,
  'P0001', 'titre_pris', 'un titre pris : titre_pris'
);
select throws_ok(
  $$select private.raise_taken('contents_page_slug_key')$$,
  'P0001', 'adresse_prise', 'une adresse prise : adresse_prise'
);
select pg_temp.as_person('editor');
select throws_ok(
  $$select private.raise_taken('contents_title_key')$$,
  '42501', null, 'private.raise_taken n''est pas appelable par l''équipe'
);
select pg_temp.as_postgres();

select * from finish();
rollback;
