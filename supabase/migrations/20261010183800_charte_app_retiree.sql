-- La charte graphique de l'app retirée (10/10/2026) : la première version, construite le jour même
-- (20261010125930_charte_app.sql, 20261010132218_polices_app.sql, la teinte de l'Encadré de
-- 20261010150507_schema_blocs.sql), n'est pas validée à l'usage. L'admin ne s'en sert plus
-- depuis #51 ; la base revient à l'état d'avant. Les pages « App mobile » se rempliront page par
-- page (docs/ADMINISTRATION.md, § 1).
--
-- La migration du schéma des blocs qui suit (…_schema_blocs.sql, générée) retire la variante
-- « style » et la teinte de l'Encadré.

-- ---------------------------------------------------------------------------------------------
-- La charte : sa table, ses fonctions et la lecture de l'app.
-- ---------------------------------------------------------------------------------------------

drop function public.app_style();
drop function public.style_save(jsonb, integer);
drop function public.style_publish(integer);
drop function public.style_discard(integer);
drop function private.style_for_update(integer);
drop function private.missing_fonts(jsonb);
drop function private.font_folder(text);

-- La table d'abord : ses contraintes appellent private.style_is_valid.
drop table public.app_style;
drop function private.check_style(jsonb);
drop function private.style_is_valid(jsonb);
drop function private.style_problems(jsonb);

-- ---------------------------------------------------------------------------------------------
-- L'espace « polices » : ses règles, puis l'espace lui-même s'il est vide. Supabase refuse
-- d'effacer des fichiers en SQL (ils resteraient dans le stockage sans ligne) : un espace qui en
-- contient encore se vide depuis le tableau de bord (Storage), puis se supprime de même.
-- ---------------------------------------------------------------------------------------------

drop policy "Polices : envoi par un admin" on storage.objects;
drop policy "Polices : lecture par l'équipe" on storage.objects;
drop domain public.font_path;

do $$
begin
  if not exists (select 1 from storage.objects where bucket_id = 'polices') then
    -- Le garde-fou de Supabase contre l'effacement direct, levé pour cette seule transaction :
    -- l'espace est vide, aucun fichier ne reste sans ligne.
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.buckets where id = 'polices';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- La teinte de l'Encadré : retirée des brouillons qui en ont une, pour qu'ils restent valables
-- avec le schéma qui suit. Les versions publiées ne changent jamais : l'app ignore ce champ.
-- ---------------------------------------------------------------------------------------------

update public.contents c
set draft = jsonb_set(
  c.draft,
  '{blocks}',
  (
    select coalesce(
      jsonb_agg(case when b ->> 'type' = 'box' then b - 'tint' else b end order by i),
      '[]'::jsonb
    )
    from jsonb_array_elements(c.draft -> 'blocks') with ordinality as t (b, i)
  )
)
where jsonb_path_exists(c.draft, '$.blocks[*] ? (@.type == "box" && exists(@.tint))');
