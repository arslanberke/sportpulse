// Orijinal logolar. Kaynaklar uygulamanın kullandığı sağlayıcılarla aynı:
// ESPN (birincil fikstür kaynağı) takım/lig logoları, TheSportsDB (yedek) rozetler
// ve supabase/migrations/0008_league_artwork.sql içindeki lig rozetleri.
// Kanal logoları assets/channels'tan kopya (design-directions/img).
const espn = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
const tsdb = (p) => `https://r2.thesportsdb.com/images/media/${p}`;

export const teamLogos = {
  ENG: espn(448),
  ESP: espn(164),
  TUR: espn(465),
  FRA: espn(478),
  BJK: espn(1895),
  GS: espn(432),
  TRB: espn(997),
  AMD: tsdb('team/badge/4fqdgh1783788571.png'),
  EFS: tsdb('team/badge/uldz0d1782050729.png'),
  OLY: tsdb('team/badge/4s5lug1676581220.png'),
  ALC: tsdb('player/cutout/ybvci41748969943.png'),
  SIN: tsdb('player/cutout/3ava8z1748970589.png'),
  F1: tsdb('league/badge/g8cofl1513623681.png'),
  ROM: espn(104),
};

export const leagueLogos = {
  'UEFA Uluslar Ligi': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  'Süper Lig': tsdb('league/badge/ifm3zc1779990699.png'),
  'ATP · Tokyo': tsdb('league/badge/q7aej51769857150.png'),
  'Formula 1': tsdb('league/badge/g8cofl1513623681.png'),
  EuroLeague: tsdb('league/badge/7xjtuy1554397766.png'),
};

// Repoda logosu olan kanallar. Olmayanlar (ATV, A Spor, Eurosport 1) metin kalır;
// uygulamadaki channel-logo.ts de aynı şekilde davranır.
export const channelLogos = {
  'beIN SPORTS 1': 'img/bein-sports.png',
  'beIN Sports': 'img/bein-sports.png',
  'S Sport': 'img/s-sport.png',
  'S Sport 2': 'img/s-sport.png',
};
