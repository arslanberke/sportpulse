-- 2026 Turkey rights: F1 and its support series (including F2) are carried
-- by beIN SPORTS; sessions stream on TOD. The old TV8 / TV8,5 mapping was
-- from a prior rights cycle. Transform both existing rows rather than
-- deleting them, preserving the season-level two-channel shape.

update public.league_channels lc
set channel_id = replacement.id
from public.leagues l, public.channels current_channel, public.channels replacement
where lc.league_id = l.id
  and lc.channel_id = current_channel.id
  and lc.country_code = 'TR'
  and l.name in ('Formula 1', 'Formula 2')
  and current_channel.name = 'TV8'
  and replacement.name = 'Bein Sports 4'
  and replacement.country_code = 'TR';

update public.league_channels lc
set channel_id = replacement.id
from public.leagues l, public.channels current_channel, public.channels replacement
where lc.league_id = l.id
  and lc.channel_id = current_channel.id
  and lc.country_code = 'TR'
  and l.name in ('Formula 1', 'Formula 2')
  and current_channel.name = 'TV8,5'
  and replacement.name = 'TOD'
  and replacement.country_code = 'TR';
