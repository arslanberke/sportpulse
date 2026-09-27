-- BSD uses longer/shorter spellings for three Süper Lig clubs. Attach the BSD
-- id to the canonical catalog row and relink memberships/events, without
-- deleting the old row (safe/reversible data repair).

do $$
declare
  pair record;
begin
  for pair in
    select canonical.id canonical_id, duplicate.id duplicate_id,
           duplicate.external_ids->>'bsd' bsd_id
    from (values
      ('Amed SFK', 'Amed Sportif Faaliyetler'),
      ('Beşiktaş', 'Beşiktaş JK'),
      ('İstanbul Başakşehir', 'Başakşehir FK')
    ) names(canonical_name, duplicate_name)
    join public.teams canonical on canonical.sport_id='football' and canonical.name=names.canonical_name
    join public.teams duplicate on duplicate.sport_id='football' and duplicate.name=names.duplicate_name
  loop
    update public.teams
    set external_ids = external_ids || jsonb_build_object('bsd', pair.bsd_id)
    where id = pair.canonical_id and pair.bsd_id is not null;

    insert into public.league_teams (league_id, team_id)
    select league_id, pair.canonical_id from public.league_teams where team_id=pair.duplicate_id
    on conflict do nothing;

    update public.events set home_team_id=pair.canonical_id where home_team_id=pair.duplicate_id;
    update public.events set away_team_id=pair.canonical_id where away_team_id=pair.duplicate_id;
  end loop;
end $$;
