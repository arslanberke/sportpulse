-- National teams were created twice by different sync paths: one row carries
-- the BSD identity plus all memberships/events, the other only the ESPN id.
-- Sharing external_ids->>'espn' lets upsert_event attach to either row
-- nondeterministically (same bug class as migration 0065). Keep the empty row
-- for reversibility but strip the colliding key, and relink any data it owns.
--
-- Runs generically over every provider key so future duplicates of the same
-- shape are cleaned too; a pair is only touched when one side carries strictly
-- more provider identities than the other (the canonical side).

do $$
declare
  key text;
  pair record;
begin
  for key in select unnest(array['espn','bsd','thesportsdb','goal']) loop
    for pair in
      select canonical.id canonical_id, duplicate.id duplicate_id
      from public.teams canonical
      join public.teams duplicate
        on duplicate.sport_id = canonical.sport_id
       and duplicate.name = canonical.name
       and duplicate.id <> canonical.id
       and duplicate.external_ids ->> key = canonical.external_ids ->> key
      where duplicate.external_ids ? key
        -- canonical taraf daha fazla saglayici kimligi tasiyor
        and (select count(*) from jsonb_each(canonical.external_ids))
          > (select count(*) from jsonb_each(duplicate.external_ids))
    loop
      update public.teams set external_ids = external_ids - key where id = pair.duplicate_id;

      insert into public.league_teams (league_id, team_id)
      select league_id, pair.canonical_id from public.league_teams where team_id = pair.duplicate_id
      on conflict do nothing;

      update public.events set home_team_id = pair.canonical_id where home_team_id = pair.duplicate_id;
      update public.events set away_team_id = pair.canonical_id where away_team_id = pair.duplicate_id;
    end loop;
  end loop;
end $$;
