-- Club names differ by decoration, not identity.
--
-- ESPN writes "Amed", TheSportsDB "Amed SFK"; "Erzurum BB" is "Erzurumspor";
-- "Gaziantep" is "Gaziantep FK". Accent folding alone left those as separate
-- clubs, so the fold now also drops the legal-form tokens (FK, SK, FC, ...)
-- and the Turkish "-spor" suffix before comparing.
--
-- This is deliberately conservative: it only removes decoration, never parts
-- of the actual name, so distinct clubs stay distinct.

drop index if exists teams_folded_name_idx;

create or replace function public.fold_team_name(p_name text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(extensions.unaccent(translate(p_name, 'İıŞşĞğÇçÖöÜü', 'IiSsGgCcOoUu'))),
          '[^a-z0-9]+', ' ', 'g'
        ),
        -- Legal forms and generic club words, wherever they appear.
        '\y(fc|cf|sc|ac|sk|fk|sfk|bb|bk|bc|cd|ud|if|sv|tsv|as|ss|us|afc|cfc|club|kulubu|spor kulubu)\y',
        ' ', 'g'
      ),
      -- Turkish "-spor" suffix: Erzurumspor -> erzurum.
      'spor\y', '', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

create index teams_folded_name_idx
  on public.teams (sport_id, public.fold_team_name(name));

-- Re-run the merge with the stronger fold.
do $$
declare
  r record;
begin
  for r in
    select sport_id, fold_team_name(name) as folded,
           array_agg(id order by jsonb_array_length(
             coalesce(jsonb_path_query_array(external_ids, '$.keyvalue()'), '[]'::jsonb)) desc,
             logo_url nulls last) as ids
    from teams
    where fold_team_name(name) <> ''
    group by 1, 2
    having count(*) > 1
  loop
    for i in 2 .. array_length(r.ids, 1) loop
      perform merge_teams(r.ids[1], r.ids[i]);
    end loop;
  end loop;
end;
$$;
