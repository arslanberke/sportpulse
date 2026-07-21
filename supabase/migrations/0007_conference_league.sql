-- UEFA Conference League + broadcast channel mappings
-- (2025-26 season rights, best-effort — primary rights holder per country).

insert into public.leagues (sport_id, name, country_code, external_ids) values
  ('football', 'UEFA Conference League', null, '{"thesportsdb": "5071", "espn": "uefa.europa.conf"}');

insert into public.league_channels (league_id, channel_id, country_code)
select l.id, c.id, m.country
from (values
  ('UEFA Conference League', 'TR', 'TABİİ Spor'),
  ('UEFA Conference League', 'GB', 'TNT Sports'),
  ('UEFA Conference League', 'DE', 'RTL'),
  ('UEFA Conference League', 'US', 'CBS / Paramount+'),
  ('UEFA Conference League', 'NL', 'HBO Max'),
  ('UEFA Conference League', 'FR', 'Canal+'),
  ('UEFA Conference League', 'ES', 'Movistar Plus+'),
  ('UEFA Conference League', 'IT', 'Sky Sport Italia'),
  ('UEFA Conference League', 'PT', 'Sport TV')
) as m (league_name, country, channel_name)
join public.leagues l on l.name = m.league_name
join public.channels c on c.name = m.channel_name and c.country_code = m.country;
