-- Les polices de la charte de l'app : l'espace public « polices », où seul un admin envoie, au
-- chemin attendu (« <famille>/<épaisseur>.ttf », « <famille>/OFL.txt ») ; la charte ne se
-- publie que si chacune de ses polices (sauf celle du téléphone) y est (police_manquante).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
\ir aides/blocs-cas.inc
select plan(15);

select pg_temp.create_people();

create function pg_temp.upload(object_name text)
returns void
language sql
as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('polices', object_name, auth.uid()::text, '{"size": 10, "mimetype": "font/ttf"}')
$$;
-- La charte neutre, sa police « Headings » changée en Inter grasse.
create function pg_temp.with_inter()
returns jsonb
language sql
as $$
  select jsonb_set(
    jsonb_set(data, '{fonts,0,family}', '"Inter"'), '{fonts,0,weight}', '700'
  )
  from blocks_cases where name = 'accepte-charte-neutre'
$$;
grant execute on function pg_temp.upload(text), pg_temp.with_inter() to public;

-- L'espace « polices » : public, 2 Mo, TrueType et licence.
select is(
  (select row(public, file_size_limit, allowed_mime_types)::text
   from storage.buckets where id = 'polices'),
  row(true, 2097152::bigint, array['font/ttf', 'text/plain'])::text,
  'espace « polices » : public, 2 Mo, TrueType et texte'
);
select is(private.font_folder('Source Serif 4'), 'source-serif-4', 'le dossier d''une famille');

-- Envois.
select pg_temp.as_anon();
select throws_ok($$select pg_temp.upload('inter/700.ttf')$$, '42501', null, 'anon : n''envoie pas');
select pg_temp.as_person('editor');
select throws_ok($$select pg_temp.upload('inter/700.ttf')$$, '42501', null, 'éditeur : n''envoie pas');
select pg_temp.as_person('admin', 'aal1');
select throws_ok(
  $$select pg_temp.upload('inter/700.ttf')$$, '42501', null,
  'admin sans la double vérification : n''envoie pas'
);
select pg_temp.as_person('admin');
select throws_ok(
  $$select pg_temp.upload('Inter/700.ttf')$$, '23514', null, 'admin : pas de majuscule dans le dossier'
);
select throws_ok(
  $$select pg_temp.upload('inter/800.ttf')$$, '23514', null, 'admin : épaisseur hors de la liste'
);
select throws_ok(
  $$select pg_temp.upload('inter/700.woff2')$$, '23514', null, 'admin : TrueType seulement'
);
select throws_ok(
  $$select pg_temp.upload('../inter/700.ttf')$$, '23514', null, 'admin : pas d''autre dossier'
);

-- Publier : la police doit être là.
select is(
  public.style_save(pg_temp.with_inter(), (select draft_rev from public.app_style)),
  (select draft_rev + 1 from public.app_style),
  'admin : enregistre une charte avec Inter grasse (l''enregistrement ne demande pas la police)'
);
select is(
  pg_temp.facts_of(format('select public.style_publish(%s)', (select draft_rev from public.app_style))),
  '{"code": "police_manquante", "hint": [{"family": "Inter", "weight": 700}]}'::jsonb,
  'publier sans la police : refusé, avec la famille et l''épaisseur'
);
select lives_ok($$select pg_temp.upload('inter/700.ttf')$$, 'admin : envoie la police');
select lives_ok($$select pg_temp.upload('inter/OFL.txt')$$, 'admin : envoie sa licence');
select lives_ok(
  format('select public.style_publish(%s)', (select draft_rev from public.app_style)),
  'publier avec la police : accepté'
);
select pg_temp.as_anon();
select is(
  public.app_style() -> 'fonts' -> 0 ->> 'family', 'Inter', 'anon : l''app lit la charte avec Inter'
);

select * from finish();
rollback;
