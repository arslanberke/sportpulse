-- Seed catalog: sports, popular leagues (with TheSportsDB ids so the sync
-- job can pull fixtures immediately) and the Turkish broadcaster mapping.

insert into public.sports (id, name_en, name_tr, icon, sort_order) values
  ('football', 'Football', 'Futbol', 'football', 1),
  ('basketball', 'Basketball', 'Basketbol', 'basketball', 2),
  ('f1', 'Formula 1', 'Formula 1', 'speedometer', 3),
  ('motogp', 'MotoGP', 'MotoGP', 'bicycle', 4),
  ('ufc', 'UFC / MMA', 'UFC / MMA', 'hand-left', 5),
  ('tennis', 'Tennis', 'Tenis', 'tennisball', 6),
  ('volleyball', 'Volleyball', 'Voleybol', 'baseball', 7);

insert into public.leagues (sport_id, name, country_code, external_ids) values
  ('football', 'Süper Lig', 'TR', '{"thesportsdb": "4339", "espn": "tur.1"}'),
  ('football', 'Trendyol 1. Lig', 'TR', '{"thesportsdb": "4676"}'),
  ('football', 'Premier League', 'GB', '{"thesportsdb": "4328", "espn": "eng.1"}'),
  ('football', 'LaLiga', 'ES', '{"thesportsdb": "4335", "espn": "esp.1"}'),
  ('football', 'Serie A', 'IT', '{"thesportsdb": "4332", "espn": "ita.1"}'),
  ('football', 'Bundesliga', 'DE', '{"thesportsdb": "4331", "espn": "ger.1"}'),
  ('football', 'UEFA Champions League', null, '{"thesportsdb": "4480", "espn": "uefa.champions"}'),
  ('football', 'UEFA Europa League', null, '{"thesportsdb": "4481", "espn": "uefa.europa"}'),
  ('basketball', 'NBA', 'US', '{"thesportsdb": "4387", "espn": "nba"}'),
  ('basketball', 'Basketbol Süper Ligi', 'TR', '{"thesportsdb": "4475"}'),
  ('basketball', 'EuroLeague', null, '{"thesportsdb": "4546"}'),
  ('f1', 'Formula 1', null, '{"thesportsdb": "4370", "espn": "f1"}'),
  ('motogp', 'MotoGP', null, '{"thesportsdb": "4407"}'),
  ('ufc', 'UFC', null, '{"thesportsdb": "4443", "espn": "ufc"}'),
  ('tennis', 'ATP Tour', null, '{"thesportsdb": "4464", "espn": "atp"}'),
  ('tennis', 'WTA Tour', null, '{"thesportsdb": "4517", "espn": "wta"}'),
  ('volleyball', 'Sultanlar Ligi / Efeler Ligi', 'TR', '{"thesportsdb": "4543"}');

insert into public.channels (name, country_code) values
  ('beIN Sports', 'TR'),
  ('TRT Spor', 'TR'),
  ('S Sport', 'TR'),
  ('S Sport Plus', 'TR'),
  ('Tivibu Spor', 'TR'),
  ('TV8', 'TR'),
  ('TV8,5', 'TR'),
  ('Exxen', 'TR'),
  ('TABİİ Spor', 'TR');

-- Default Turkish broadcaster per league (2025-26 season rights).
insert into public.league_channels (league_id, channel_id, country_code)
select l.id, c.id, 'TR'
from (values
  ('Süper Lig', 'beIN Sports'),
  ('Trendyol 1. Lig', 'TRT Spor'),
  ('Premier League', 'beIN Sports'),
  ('LaLiga', 'S Sport'),
  ('Serie A', 'S Sport'),
  ('Bundesliga', 'Tivibu Spor'),
  ('UEFA Champions League', 'TABİİ Spor'),
  ('UEFA Europa League', 'TABİİ Spor'),
  ('NBA', 'S Sport'),
  ('Basketbol Süper Ligi', 'beIN Sports'),
  ('EuroLeague', 'S Sport Plus'),
  ('Formula 1', 'TV8,5'),
  ('MotoGP', 'S Sport Plus'),
  ('UFC', 'S Sport Plus'),
  ('ATP Tour', 'S Sport Plus'),
  ('WTA Tour', 'S Sport Plus'),
  ('Sultanlar Ligi / Efeler Ligi', 'TRT Spor')
) as m (league_name, channel_name)
join public.leagues l on l.name = m.league_name
join public.channels c on c.name = m.channel_name and c.country_code = 'TR';
