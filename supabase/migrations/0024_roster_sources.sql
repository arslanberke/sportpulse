-- Point the leagues nobody else covers at a source that knows their entry list.
--
-- TheSportsDB's free tier caps list endpoints at ten rows and ESPN doesn't
-- carry Turkish basketball/volleyball or the second football tier at all, so
-- these leagues sat with a third of their clubs. Two sources fill the gap:
--
--   external_ids.euroleague  competition code for EuroLeague Basketball's API
--   external_ids.wikipedia   the season article's suffix on tr.wikipedia.org,
--                            e.g. "1. Lig" -> "2026-27 1. Lig"
--
-- Both are read by the team-list provider chain in sync-teams.

update leagues
set external_ids = external_ids || jsonb_build_object('euroleague', 'E')
where name = 'EuroLeague';

update leagues
set external_ids = external_ids || jsonb_build_object('wikipedia', 'Basketbol Süper Ligi')
where name = 'Basketbol Süper Ligi';

update leagues
set external_ids = external_ids || jsonb_build_object('wikipedia', 'Sultanlar Ligi')
where name = 'Sultanlar Ligi';

update leagues
set external_ids = external_ids || jsonb_build_object('wikipedia', '1. Lig')
where name = 'Trendyol 1. Lig';
