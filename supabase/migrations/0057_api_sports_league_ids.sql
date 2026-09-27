-- API-Sports competition ids for leagues whose live fixtures may be rescued
-- into `events` by the aggregated live-scores function when ESPN/TheSportsDB
-- missed the scheduled fixture. Stable ids from API-Sports' league catalog.

update public.leagues
set external_ids = external_ids || jsonb_build_object('apisports', ids.api_id::text)
from (values
  ('Süper Lig', 203),
  ('Premier League', 39),
  ('LaLiga', 140),
  ('Bundesliga', 78),
  ('Serie A', 135),
  ('Ligue 1', 61)
) as ids(name, api_id)
where leagues.name = ids.name;
