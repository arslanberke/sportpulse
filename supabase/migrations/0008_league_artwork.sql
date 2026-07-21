-- League artwork (fanart backgrounds + badges) from TheSportsDB.

alter table public.leagues add column if not exists artwork_url text;

update public.leagues l set artwork_url = a.artwork, logo_url = a.badge
from (values
  ('ATP Tour', 'https://r2.thesportsdb.com/images/media/league/fanart/vqcuyh1487422744.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/q7aej51769857150.png'),
  ('Basketbol Süper Ligi', null, 'https://r2.thesportsdb.com/images/media/league/badge/bnkkgh1551517800.png'),
  ('Bundesliga', 'https://r2.thesportsdb.com/images/media/league/fanart/uststt1422059550.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png'),
  ('Eredivisie', 'https://r2.thesportsdb.com/images/media/league/fanart/9lc0b71620328005.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/5cdsu21725984946.png'),
  ('EuroLeague', 'https://r2.thesportsdb.com/images/media/league/fanart/lyclvd1576753705.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/7xjtuy1554397263.png'),
  ('FIVB Kadınlar Milletler Ligi', 'https://r2.thesportsdb.com/images/media/league/fanart/pjhfxc1625518030.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/t36s6v1732874074.png'),
  ('Formula 1', 'https://r2.thesportsdb.com/images/media/league/fanart/hreocd1620552411.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/g8cofl1513623681.png'),
  ('Formula 2', 'https://r2.thesportsdb.com/images/media/league/fanart/z14s9y1537133372.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/6pfj0e1768918080.png'),
  ('Kadınlar Avrupa Şampiyonası', null, 'https://r2.thesportsdb.com/images/media/league/badge/x5390r1748597766.png'),
  ('LaLiga', 'https://r2.thesportsdb.com/images/media/league/fanart/6am8r81707716890.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png'),
  ('Ligue 1', 'https://r2.thesportsdb.com/images/media/league/fanart/aed3181711691515.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/9f7z9d1742983155.png'),
  ('Moto2', 'https://r2.thesportsdb.com/images/media/league/fanart/uurvyq1432337883.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/py0ez81768486001.png'),
  ('Moto3', 'https://r2.thesportsdb.com/images/media/league/fanart/jir97w1487422636.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/jkm5v11768487097.png'),
  ('MotoGP', 'https://r2.thesportsdb.com/images/media/league/fanart/vvwuxq1432213976.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/gg3c201768486075.png'),
  ('NBA', 'https://r2.thesportsdb.com/images/media/league/fanart/wtqwqq1453033773.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/frdjqy1536585083.png'),
  ('Premier League', 'https://r2.thesportsdb.com/images/media/league/fanart/odberp1725731801.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png'),
  ('Primeira Liga', 'https://r2.thesportsdb.com/images/media/league/fanart/tprwuu1421683000.jpg', 'https://www.thesportsdb.com/images/media/league/badge/3tgdke1782689102.png'),
  ('Serie A', 'https://r2.thesportsdb.com/images/media/league/fanart/spqxtv1425356374.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png'),
  ('Sultanlar Ligi', null, 'https://r2.thesportsdb.com/images/media/league/badge/o6t0nn1555008684.png'),
  ('Süper Lig', 'https://r2.thesportsdb.com/images/media/league/fanart/4fost31681020426.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/ifm3zc1779990699.png'),
  ('Trendyol 1. Lig', null, 'https://r2.thesportsdb.com/images/media/league/badge/rj645y1724738627.png'),
  ('UEFA Champions League', 'https://r2.thesportsdb.com/images/media/league/fanart/08goac1732585837.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/facv1u1742998896.png'),
  ('UEFA Conference League', 'https://r2.thesportsdb.com/images/media/league/fanart/gc24bn1718779138.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/ymfo5j1718775759.png'),
  ('UEFA Europa League', 'https://r2.thesportsdb.com/images/media/league/fanart/o6ornh1718779133.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/mlsr7d1718774547.png'),
  ('UFC', 'https://r2.thesportsdb.com/images/media/league/fanart/vrutwv1463859748.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/bewnz31717531281.png'),
  ('WTA Tour', 'https://r2.thesportsdb.com/images/media/league/fanart/y6opcq1549450360.jpg', 'https://r2.thesportsdb.com/images/media/league/badge/bddhun1768230678.png')
) as a (name, artwork, badge)
where l.name = a.name;
