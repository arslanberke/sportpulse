-- Hand-picked league artwork (user-selected from TheSportsDB alternatives).

update public.leagues l set artwork_url = a.artwork
from (values
  ('UEFA Champions League', 'https://r2.thesportsdb.com/images/media/league/banner/vxp99n1696614859.jpg'),
  ('UEFA Conference League', 'https://r2.thesportsdb.com/images/media/league/banner/8ov0ah1718777610.jpg'),
  ('UEFA Europa League', 'https://r2.thesportsdb.com/images/media/league/banner/opjw7l1718777604.jpg'),
  ('NBA', 'https://r2.thesportsdb.com/images/media/league/fanart/srdqlb1619946305.jpg')
) as a (name, artwork)
where l.name = a.name;
