-- Domestic cups, the UEFA Super Cup and the national-team competitions.
--
-- All of them come from ESPN; TheSportsDB's free tier has no cup data worth
-- using. Note there is no Turkish cup here: ESPN carries exactly one Turkish
-- competition ("tur.1") and TheSportsDB lists none, so Türkiye Kupası has no
-- source yet.

-- A cup's entry list is not something to put in the follow catalog: the FA
-- Cup fields 124 clubs down to non-league, and the friendlies bucket spans
-- 183 national teams. Those competitions still want fixtures, just not a
-- roster, so the roster sync is opt-out per league.
alter table public.leagues
  add column if not exists sync_teams boolean not null default true;

comment on column public.leagues.sync_teams is
  'Whether sync-teams should maintain a roster for this competition. Off for '
  'cups and friendlies, where the entry list is huge and not worth following.';

insert into public.leagues (sport_id, name, country_code, logo_url, external_ids, sync_teams) values
  -- Domestic cups: fixtures only.
  ('football', 'FA Cup', 'GB', 'https://a.espncdn.com/i/leaguelogos/soccer/500/40.png',
   '{"espn": "eng.fa"}', false),
  ('football', 'Carabao Cup', 'GB', 'https://a.espncdn.com/i/leaguelogos/soccer/500/41.png',
   '{"espn": "eng.league_cup"}', false),
  ('football', 'Copa del Rey', 'ES', 'https://a.espncdn.com/i/leaguelogos/soccer/500/80.png',
   '{"espn": "esp.copa_del_rey"}', false),
  ('football', 'DFB-Pokal', 'DE', 'https://a.espncdn.com/i/leaguelogos/soccer/500/2061.png',
   '{"espn": "ger.dfb_pokal"}', false),
  ('football', 'Coppa Italia', 'IT', 'https://a.espncdn.com/i/leaguelogos/soccer/500/2192.png',
   '{"espn": "ita.coppa_italia"}', false),
  ('football', 'Coupe de France', 'FR', 'https://a.espncdn.com/i/leaguelogos/soccer/500/182.png',
   '{"espn": "fra.coupe_de_france"}', false),
  ('football', 'UEFA Super Cup', null, 'https://a.espncdn.com/i/leaguelogos/soccer/500/1272.png',
   '{"espn": "uefa.super_cup"}', true),
  -- National teams: 54 UEFA sides, small enough to follow one by one.
  ('football', 'UEFA Nations League', null, 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
   '{"espn": "uefa.nations"}', true),
  ('football', 'Dünya Kupası Elemeleri – Avrupa', null,
   'https://a.espncdn.com/i/leaguelogos/soccer/500/67.png',
   '{"espn": "fifa.worldq.uefa"}', true),
  ('football', 'Milli Hazırlık Maçları', null,
   'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
   '{"espn": "fifa.friendly"}', false);
