-- Wordmark/badge artwork for leagues whose fanart options were rejected;
-- rendered "contained" over the league gradient instead of cropped fanart.

update public.leagues l set artwork_url = a.artwork
from (values
  ('LaLiga', 'https://r2.thesportsdb.com/images/media/league/logo/gq4b1r1687707889.png'),
  ('MotoGP', 'https://r2.thesportsdb.com/images/media/league/logo/tkd2rt1733231583.png'),
  ('Primeira Liga', 'https://www.thesportsdb.com/images/media/league/logo/j77ajj1782689102.png'),
  ('Süper Lig', 'https://r2.thesportsdb.com/images/media/league/logo/ti32e21779990763.png'),
  ('Trendyol 1. Lig', 'https://r2.thesportsdb.com/images/media/league/badge/rj645y1724738627.png'),
  ('WTA Tour', 'https://r2.thesportsdb.com/images/media/league/badge/bddhun1768230678.png'),
  ('Kadınlar Avrupa Şampiyonası', 'https://r2.thesportsdb.com/images/media/league/badge/x5390r1748597766.png')
) as a (name, artwork)
where l.name = a.name;
