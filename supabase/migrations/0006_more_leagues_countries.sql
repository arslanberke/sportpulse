-- More leagues (Ligue 1, Primeira Liga, Eredivisie, F2, Moto2/3, women's
-- volleyball) and channel mappings for FR, ES, IT and PT
-- (2025-26 season rights, best-effort — primary rights holder per league).

-- Focus volleyball on the women's game.
update public.leagues
set name = 'Sultanlar Ligi'
where name = 'Sultanlar Ligi / Efeler Ligi';

insert into public.leagues (sport_id, name, country_code, external_ids) values
  ('football', 'Ligue 1', 'FR', '{"thesportsdb": "4334", "espn": "fra.1"}'),
  ('football', 'Primeira Liga', 'PT', '{"thesportsdb": "4344", "espn": "por.1"}'),
  ('football', 'Eredivisie', 'NL', '{"thesportsdb": "4337", "espn": "ned.1"}'),
  ('f1', 'Formula 2', null, '{"thesportsdb": "4486"}'),
  ('motogp', 'Moto2', null, '{"thesportsdb": "4436"}'),
  ('motogp', 'Moto3', null, '{"thesportsdb": "4437"}'),
  ('volleyball', 'FIVB Kadınlar Milletler Ligi', null, '{"thesportsdb": "5084"}'),
  ('volleyball', 'Kadınlar Avrupa Şampiyonası', null, '{"thesportsdb": "5612"}');

insert into public.channels (name, country_code) values
  ('Canal+', 'FR'),
  ('beIN Sports France', 'FR'),
  ('Ligue 1+', 'FR'),
  ('RMC Sport', 'FR'),
  ('Eurosport France', 'FR'),
  ('Movistar Plus+', 'ES'),
  ('DAZN España', 'ES'),
  ('Eurosport España', 'ES'),
  ('Sky Sport Italia', 'IT'),
  ('DAZN Italia', 'IT'),
  ('Sport TV', 'PT'),
  ('DAZN Portugal', 'PT'),
  ('Eleven Sports PT', 'PT');

insert into public.league_channels (league_id, channel_id, country_code)
select l.id, c.id, m.country
from (values
  -- France
  ('Ligue 1', 'FR', 'Ligue 1+'),
  ('Premier League', 'FR', 'Canal+'),
  ('LaLiga', 'FR', 'beIN Sports France'),
  ('Serie A', 'FR', 'beIN Sports France'),
  ('Bundesliga', 'FR', 'beIN Sports France'),
  ('Süper Lig', 'FR', 'beIN Sports France'),
  ('UEFA Champions League', 'FR', 'Canal+'),
  ('UEFA Europa League', 'FR', 'Canal+'),
  ('NBA', 'FR', 'beIN Sports France'),
  ('Formula 1', 'FR', 'Canal+'),
  ('Formula 2', 'FR', 'Canal+'),
  ('MotoGP', 'FR', 'Canal+'),
  ('Moto2', 'FR', 'Canal+'),
  ('Moto3', 'FR', 'Canal+'),
  ('UFC', 'FR', 'RMC Sport'),
  ('ATP Tour', 'FR', 'Eurosport France'),
  ('WTA Tour', 'FR', 'Eurosport France'),
  -- Spain
  ('LaLiga', 'ES', 'Movistar Plus+'),
  ('Premier League', 'ES', 'DAZN España'),
  ('Serie A', 'ES', 'DAZN España'),
  ('Bundesliga', 'ES', 'Movistar Plus+'),
  ('Ligue 1', 'ES', 'DAZN España'),
  ('UEFA Champions League', 'ES', 'Movistar Plus+'),
  ('UEFA Europa League', 'ES', 'Movistar Plus+'),
  ('NBA', 'ES', 'Movistar Plus+'),
  ('EuroLeague', 'ES', 'Movistar Plus+'),
  ('Formula 1', 'ES', 'DAZN España'),
  ('Formula 2', 'ES', 'DAZN España'),
  ('MotoGP', 'ES', 'DAZN España'),
  ('Moto2', 'ES', 'DAZN España'),
  ('Moto3', 'ES', 'DAZN España'),
  ('UFC', 'ES', 'Eurosport España'),
  ('ATP Tour', 'ES', 'Movistar Plus+'),
  ('WTA Tour', 'ES', 'Movistar Plus+'),
  -- Italy
  ('Serie A', 'IT', 'DAZN Italia'),
  ('Premier League', 'IT', 'Sky Sport Italia'),
  ('LaLiga', 'IT', 'DAZN Italia'),
  ('Bundesliga', 'IT', 'Sky Sport Italia'),
  ('Ligue 1', 'IT', 'DAZN Italia'),
  ('UEFA Champions League', 'IT', 'Sky Sport Italia'),
  ('UEFA Europa League', 'IT', 'Sky Sport Italia'),
  ('NBA', 'IT', 'Sky Sport Italia'),
  ('EuroLeague', 'IT', 'Sky Sport Italia'),
  ('Formula 1', 'IT', 'Sky Sport Italia'),
  ('Formula 2', 'IT', 'Sky Sport Italia'),
  ('MotoGP', 'IT', 'Sky Sport Italia'),
  ('Moto2', 'IT', 'Sky Sport Italia'),
  ('Moto3', 'IT', 'Sky Sport Italia'),
  ('UFC', 'IT', 'DAZN Italia'),
  ('ATP Tour', 'IT', 'Sky Sport Italia'),
  ('WTA Tour', 'IT', 'Sky Sport Italia'),
  -- Portugal
  ('Primeira Liga', 'PT', 'Sport TV'),
  ('Premier League', 'PT', 'DAZN Portugal'),
  ('LaLiga', 'PT', 'DAZN Portugal'),
  ('Serie A', 'PT', 'Sport TV'),
  ('Bundesliga', 'PT', 'Eleven Sports PT'),
  ('UEFA Champions League', 'PT', 'Eleven Sports PT'),
  ('UEFA Europa League', 'PT', 'Sport TV'),
  ('NBA', 'PT', 'Sport TV'),
  ('Formula 1', 'PT', 'Sport TV'),
  ('Formula 2', 'PT', 'Sport TV'),
  ('MotoGP', 'PT', 'Sport TV'),
  ('Moto2', 'PT', 'Sport TV'),
  ('Moto3', 'PT', 'Sport TV'),
  ('UFC', 'PT', 'Sport TV'),
  ('ATP Tour', 'PT', 'Sport TV'),
  ('WTA Tour', 'PT', 'Sport TV'),
  -- New leagues in already-supported countries
  ('Ligue 1', 'TR', 'beIN Sports'),
  ('Formula 2', 'TR', 'TV8,5'),
  ('Moto2', 'TR', 'S Sport Plus'),
  ('Moto3', 'TR', 'S Sport Plus'),
  ('FIVB Kadınlar Milletler Ligi', 'TR', 'TRT Spor'),
  ('Ligue 1', 'GB', 'TNT Sports'),
  ('Formula 2', 'GB', 'Sky Sports'),
  ('Moto2', 'GB', 'TNT Sports'),
  ('Moto3', 'GB', 'TNT Sports'),
  ('Ligue 1', 'DE', 'DAZN'),
  ('Formula 2', 'DE', 'Sky Sport'),
  ('Moto2', 'DE', 'ServusTV On'),
  ('Moto3', 'DE', 'ServusTV On'),
  ('Ligue 1', 'US', 'CBS / Paramount+'),
  ('Formula 2', 'US', 'ESPN'),
  ('Moto2', 'US', 'FOX Sports'),
  ('Moto3', 'US', 'FOX Sports'),
  ('Eredivisie', 'NL', 'ESPN NL'),
  ('Ligue 1', 'NL', 'Ziggo Sport'),
  ('Formula 2', 'NL', 'Viaplay'),
  ('Moto2', 'NL', 'Ziggo Sport'),
  ('Moto3', 'NL', 'Ziggo Sport')
) as m (league_name, country, channel_name)
join public.leagues l on l.name = m.league_name
join public.channels c on c.name = m.channel_name and c.country_code = m.country;
