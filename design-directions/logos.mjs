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
  // yoğun gün
  KAS: espn(6870), KON: espn(7648), GOZ: espn(789), FB: espn(436), SAM: espn(11429),
  LEV: espn(131), SGE: espn(125), BAY: espn(132), BVB: espn(124),
  MCI: espn(382), CHE: espn(363), TOT: espn(367), NEW: espn(361), AVL: espn(362), MUN: espn(360), ARS: espn(359), LIV: espn(364),
  ATH: espn(93), VIL: espn(102), BAR: espn(83), SEV: espn(243), RMA: espn(86), ATM: espn(1068), RSO: espn(89), BET: espn(244),
  NAP: espn(114), MIL: espn(103), INT: espn(110), JUV: espn(111), ATA: espn(105),
  PSG: espn(160), OM: espn(176), OL: espn(167), ASM: espn(174), NCE: espn(2502),
  POR: espn(482), BEL: espn(476), GER: espn(481), ITA: espn(162),
  DJO: tsdb('player/cutout/h6od2i1748970226.png'),
  ZVE: tsdb('player/cutout/c8fy2l1748969907.png'),
  PAO: tsdb('team/badge/7cdjwz1767366987.png'),
  ZAL: tsdb('team/badge/dn7ouv1703960565.png'),
  RMB: tsdb('team/badge/g4ev2c1522175902.png'),
  FCB: tsdb('team/badge/0tz26j1729097443.png'),
};

export const leagueLogos = {
  'UEFA Uluslar Ligi': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  'Süper Lig': tsdb('league/badge/ifm3zc1779990699.png'),
  'ATP · Tokyo': tsdb('league/badge/q7aej51769857150.png'),
  'Formula 1': tsdb('league/badge/g8cofl1513623681.png'),
  EuroLeague: tsdb('league/badge/7xjtuy1554397766.png'),
  'Premier Lig': 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
  'La Liga': 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
  Bundesliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png',
  'Serie A': 'https://a.espncdn.com/i/leaguelogos/soccer/500/12.png',
  'Ligue 1': 'https://a.espncdn.com/i/leaguelogos/soccer/500/9.png',
  'Şampiyonlar Ligi': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
  'Avrupa Ligi': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png',
};

// Repoda logosu olan kanallar. Olmayanlar (ATV, A Spor, Eurosport 1) metin kalır;
// uygulamadaki channel-logo.ts de aynı şekilde davranır.
export const channelLogos = {
  'beIN SPORTS 1': 'img/bein-sports.png',
  'beIN Sports': 'img/bein-sports.png',
  'S Sport': 'img/s-sport.png',
  'S Sport 2': 'img/s-sport.png',
  'S Sport Plus': 'img/s-sport.png',
  'beIN SPORTS 2': 'img/bein-sports.png',
  'beIN SPORTS 3': 'img/bein-sports.png',
  'beIN SPORTS 4': 'img/bein-sports.png',
};
