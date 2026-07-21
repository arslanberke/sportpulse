-- Alternative Turkish broadcasters: many events air on more than one
-- channel/platform in TR (free-to-air simulcasts, streaming apps).

insert into public.channels (name, country_code) values
  ('TRT 1', 'TR'),
  ('TOD', 'TR'),
  ('TRT Spor Yıldız', 'TR')
on conflict (name, country_code) do nothing;

insert into public.league_channels (league_id, channel_id, country_code)
select l.id, c.id, m.country
from (values
  -- UEFA nights: selected matches also free-to-air on TRT 1
  ('UEFA Champions League', 'TR', 'TRT 1'),
  ('UEFA Europa League', 'TR', 'TRT 1'),
  ('UEFA Conference League', 'TR', 'TRT 1'),
  -- Races simulcast on TV8 (main channel) alongside TV8,5
  ('Formula 1', 'TR', 'TV8'),
  ('Formula 2', 'TR', 'TV8'),
  -- beIN content also streams on TOD
  ('Süper Lig', 'TR', 'TOD'),
  ('Premier League', 'TR', 'TOD'),
  ('Ligue 1', 'TR', 'TOD'),
  ('Basketbol Süper Ligi', 'TR', 'TOD'),
  -- S Sport content: linear TV channel next to the streaming app
  ('NBA', 'TR', 'S Sport Plus'),
  ('LaLiga', 'TR', 'S Sport Plus'),
  ('Serie A', 'TR', 'S Sport Plus'),
  ('EuroLeague', 'TR', 'S Sport'),
  ('MotoGP', 'TR', 'S Sport'),
  ('Moto2', 'TR', 'S Sport'),
  ('Moto3', 'TR', 'S Sport'),
  ('UFC', 'TR', 'S Sport'),
  ('ATP Tour', 'TR', 'S Sport'),
  ('WTA Tour', 'TR', 'S Sport'),
  -- Volleyball: TRT Spor Yıldız carries overflow matches
  ('Sultanlar Ligi', 'TR', 'TRT Spor Yıldız'),
  ('FIVB Kadınlar Milletler Ligi', 'TR', 'TRT Spor Yıldız'),
  ('Kadınlar Avrupa Şampiyonası', 'TR', 'TRT Spor')
) as m (league, country, channel)
join public.leagues l on l.name = m.league
join public.channels c on c.name = m.channel and c.country_code = m.country
on conflict do nothing;
