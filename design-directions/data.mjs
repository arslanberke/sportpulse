// Ornek veri — dort yon de ayni icerigi cizer ki fark yalnizca tasarimdan gelsin.
export const today = { label: 'Cuma', date: '26 Eylül' };

export const days = [
  { key: 'thu', short: 'Per', long: 'Perşembe', num: 25, month: 'Eyl', past: true },
  { key: 'fri', short: 'Cum', long: 'Cuma', num: 26, month: 'Eyl', today: true },
  { key: 'sat', short: 'Cmt', long: 'Cumartesi', num: 27, month: 'Eyl' },
  { key: 'sun', short: 'Paz', long: 'Pazar', num: 28, month: 'Eyl' },
  { key: 'mon', short: 'Pzt', long: 'Pazartesi', num: 29, month: 'Eyl' },
  { key: 'tue', short: 'Sal', long: 'Salı', num: 30, month: 'Eyl' },
  { key: 'wed', short: 'Çar', long: 'Çarşamba', num: 1, month: 'Eki' },
];

export const events = [
  {
    id: 'eng-esp', sport: 'football', league: 'UEFA Uluslar Ligi', round: 'A Ligi · 2. Hafta',
    home: 'İngiltere', away: 'İspanya', homeAbbr: 'ENG', awayAbbr: 'ESP',
    homeColor: '#1d3a8a', awayColor: '#c8102e',
    time: '21:45', live: true, homeScore: 2, awayScore: 3, minute: "78'",
    channel: 'A Spor', venue: 'Wembley Stadyumu, Londra',
    timeline: [
      { min: "12'", side: 'home', type: 'goal', who: 'Kane', note: 'Saka' },
      { min: "31'", side: 'away', type: 'goal', who: 'Yamal', note: 'Pedri' },
      { min: "44'", side: 'away', type: 'yellow', who: 'Rodri' },
      { min: "55'", side: 'home', type: 'goal', who: 'Bellingham', note: 'Foden' },
      { min: "63'", side: 'away', type: 'goal', who: 'Morata', note: 'Olmo' },
      { min: "71'", side: 'away', type: 'goal', who: 'Williams', note: 'Yamal' },
      { min: "74'", side: 'home', type: 'sub', who: 'Palmer', note: 'Foden ↓' },
    ],
  },
  {
    id: 'tur-fra', sport: 'football', league: 'UEFA Uluslar Ligi', round: 'A Ligi · 2. Hafta',
    home: 'Türkiye', away: 'Fransa', homeAbbr: 'TUR', awayAbbr: 'FRA',
    homeColor: '#e30a17', awayColor: '#0055a4',
    time: '21:45', live: false, favorite: true,
    channel: 'ATV', venue: 'Rams Park, İstanbul',
  },
  {
    id: 'bjk-amed', sport: 'football', league: 'Süper Lig', round: '7. Hafta',
    home: 'Beşiktaş', away: 'Amed SFK', homeAbbr: 'BJK', awayAbbr: 'AMD',
    homeColor: '#1a1a1a', awayColor: '#0d7a3a',
    time: '20:00', live: false, favorite: true, day: 'sat',
    channel: 'beIN SPORTS 1', venue: 'Tüpraş Stadyumu',
  },
  {
    id: 'alc-sin', sport: 'tennis', league: 'ATP · Tokyo', round: 'Yarı final',
    home: 'C. Alcaraz', away: 'J. Sinner', homeAbbr: 'ALC', awayAbbr: 'SIN',
    homeColor: '#c8102e', awayColor: '#0b5e2a',
    time: '13:00', live: true, sets: [[6, 4], [3, 5]], detail: '2. Set',
    channel: 'Eurosport 1', venue: 'Ariake Coliseum',
  },
  {
    id: 'f1-sgp', sport: 'f1', league: 'Formula 1', round: 'Singapur GP · Sıralama',
    home: 'Singapur GP', away: null, homeAbbr: 'F1', awayAbbr: null,
    homeColor: '#e10600', awayColor: '#e10600',
    time: '15:00', live: false, day: 'sat',
    channel: 'S Sport 2', venue: 'Marina Bay',
  },
  {
    id: 'efes-oly', sport: 'basketball', league: 'EuroLeague', round: '1. Hafta',
    home: 'Anadolu Efes', away: 'Olympiacos', homeAbbr: 'EFS', awayAbbr: 'OLY',
    homeColor: '#0e2b6b', awayColor: '#d0202c',
    time: '20:30', live: false, day: 'sat',
    channel: 'S Sport', venue: 'Basketbol Gelişim Merkezi',
  },
  // Haftanın diğer günleri (hafta görünümü için)
  {
    id: 'fb-nice', sport: 'football', league: 'Avrupa Ligi', round: 'Lig aşaması · 1. Hafta',
    home: 'Fenerbahçe', away: 'Nice', homeAbbr: 'FB', awayAbbr: 'NCE',
    homeColor: '#0a2a5e', awayColor: '#c8102e',
    time: '22:00', live: false, done: true, homeScore: 1, awayScore: 0, day: 'thu',
    channel: 'TRT 1', venue: 'Chobani Stadyumu',
  },
  {
    id: 'f1-sgp-race', sport: 'f1', league: 'Formula 1', round: 'Singapur GP · Yarış',
    home: 'Singapur GP', away: null, homeAbbr: 'F1', awayAbbr: null,
    homeColor: '#e10600', awayColor: '#e10600',
    time: '15:00', live: false, day: 'sun',
    channel: 'S Sport 2', venue: 'Marina Bay',
  },
  {
    id: 'gs-trb', sport: 'football', league: 'Süper Lig', round: '7. Hafta',
    home: 'Galatasaray', away: 'Trabzonspor', homeAbbr: 'GS', awayAbbr: 'TRB',
    homeColor: '#a90432', awayColor: '#5c1a33',
    time: '20:00', live: false, day: 'sun',
    channel: 'beIN SPORTS 1', venue: 'Rams Park',
  },
  {
    id: 'nap-rom', sport: 'football', league: 'Serie A', round: '5. Hafta',
    home: 'Napoli', away: 'Roma', homeAbbr: 'NAP', awayAbbr: 'ROM',
    homeColor: '#12a0d7', awayColor: '#8e1f2f',
    time: '21:45', live: false, day: 'sun',
    channel: 'S Sport', venue: 'Diego Armando Maradona',
  },
  {
    id: 'psg-ol', sport: 'football', league: 'Ligue 1', round: '6. Hafta',
    home: 'PSG', away: 'Lyon', homeAbbr: 'PSG', awayAbbr: 'OL',
    homeColor: '#004170', awayColor: '#1d2f6f',
    time: '21:45', live: false, day: 'mon',
    channel: 'beIN SPORTS 3', venue: 'Parc des Princes',
  },
  {
    id: 'gs-liv', sport: 'football', league: 'Şampiyonlar Ligi', round: 'Lig aşaması · 2. Hafta',
    home: 'Galatasaray', away: 'Liverpool', homeAbbr: 'GS', awayAbbr: 'LIV',
    homeColor: '#a90432', awayColor: '#c8102e',
    time: '22:00', live: false, day: 'tue',
    channel: 'TRT 1', venue: 'Rams Park',
  },
  {
    id: 'bjk-rom', sport: 'football', league: 'Avrupa Ligi', round: 'Lig aşaması · 2. Hafta',
    home: 'Beşiktaş', away: 'Roma', homeAbbr: 'BJK', awayAbbr: 'ROM',
    homeColor: '#1a1a1a', awayColor: '#8e1f2f',
    time: '22:00', live: false, favorite: true, day: 'wed',
    channel: 'TRT 1', venue: 'Tüpraş Stadyumu',
  },
];

// "Yoğun gün": aynı güne düşen ek maçlar. Yalnızca yoğunluk anahtarı açıkken listeye eklenir.
const m = (id, league, round, home, away, homeAbbr, awayAbbr, time, channel, extra = {}) =>
  ({ id, sport: 'football', league, round, home, away, homeAbbr, awayAbbr, homeColor: '#333', awayColor: '#666', time, live: false, channel, ...extra });

export const denseEvents = [
  // Cuma
  m('kas-kon', 'Süper Lig', '7. Hafta', 'Kasımpaşa', 'Konyaspor', 'KAS', 'KON', '14:30', 'beIN SPORTS 2'),
  { id: 'djo-zve', sport: 'tennis', league: 'ATP · Tokyo', round: 'Yarı final', home: 'N. Djokovic', away: 'A. Zverev', homeAbbr: 'DJO', awayAbbr: 'ZVE', homeColor: '#1d3a8a', awayColor: '#333', time: '15:30', live: false, channel: 'Eurosport 2', venue: 'Ariake Coliseum' },
  m('lev-sge', 'Bundesliga', '5. Hafta', 'Leverkusen', 'Frankfurt', 'LEV', 'SGE', '16:30', 'S Sport 2'),
  m('mci-che', 'Premier Lig', '6. Hafta', 'Man City', 'Chelsea', 'MCI', 'CHE', '17:00', 'beIN SPORTS 3'),
  m('ath-vil', 'La Liga', '7. Hafta', 'Athletic', 'Villarreal', 'ATH', 'VIL', '17:00', 'S Sport'),
  m('ts-goz', 'Süper Lig', '7. Hafta', 'Trabzonspor', 'Göztepe', 'TRB', 'GOZ', '17:00', 'beIN SPORTS 1'),
  m('nap-mil', 'Serie A', '5. Hafta', 'Napoli', 'Milan', 'NAP', 'MIL', '19:00', 'S Sport 2'),
  m('por-bel', 'UEFA Uluslar Ligi', 'A Ligi · 2. Hafta', 'Portekiz', 'Belçika', 'POR', 'BEL', '19:00', 'A Spor'),
  m('tot-new', 'Premier Lig', '6. Hafta', 'Tottenham', 'Newcastle', 'TOT', 'NEW', '19:30', 'beIN SPORTS 2'),
  m('avl-mun', 'Premier Lig', '6. Hafta', 'Aston Villa', 'Man United', 'AVL', 'MUN', '19:30', 'beIN SPORTS 4'),
  m('bar-sev', 'La Liga', '7. Hafta', 'Barcelona', 'Sevilla', 'BAR', 'SEV', '19:30', 'S Sport'),
  m('gs-fb', 'Süper Lig', '7. Hafta', 'Galatasaray', 'Fenerbahçe', 'GS', 'FB', '20:00', 'beIN SPORTS 1', { live: true, homeScore: 1, awayScore: 1, minute: "45+2'" }),
  { id: 'pao-zal', sport: 'basketball', league: 'EuroLeague', round: '1. Hafta', home: 'Panathinaikos', away: 'Zalgiris', homeAbbr: 'PAO', awayAbbr: 'ZAL', homeColor: '#0a7a3a', awayColor: '#1a7a3a', time: '20:15', live: false, channel: 'S Sport Plus', venue: 'OAKA' },
  m('rma-atm', 'La Liga', '7. Hafta', 'Real Madrid', 'Atlético', 'RMA', 'ATM', '21:00', 'S Sport'),
  { id: 'rmb-fcb', sport: 'basketball', league: 'EuroLeague', round: '1. Hafta', home: 'R. Madrid', away: 'Barcelona', homeAbbr: 'RMB', awayAbbr: 'FCB', homeColor: '#fff', awayColor: '#a50044', time: '21:30', live: false, channel: 'S Sport 2', venue: 'WiZink Center' },
  m('fcb-bvb', 'Bundesliga', '5. Hafta', 'Bayern', 'Dortmund', 'BAY', 'BVB', '21:30', 'S Sport 2'),
  m('ger-ita', 'UEFA Uluslar Ligi', 'A Ligi · 2. Hafta', 'Almanya', 'İtalya', 'GER', 'ITA', '21:45', 'ATV', { live: true, homeScore: 0, awayScore: 1, minute: "12'" }),
  m('int-juv', 'Serie A', '5. Hafta', 'Inter', 'Juventus', 'INT', 'JUV', '21:45', 'S Sport'),
  m('ars-liv', 'Premier Lig', '6. Hafta', 'Arsenal', 'Liverpool', 'ARS', 'LIV', '22:00', 'beIN SPORTS 1'),
  m('psg-om', 'Ligue 1', '6. Hafta', 'PSG', 'Marsilya', 'PSG', 'OM', '22:05', 'beIN SPORTS 3'),
  // Cumartesi
  m('rso-bet', 'La Liga', '7. Hafta', 'Real Sociedad', 'Betis', 'RSO', 'BET', '17:15', 'S Sport', { day: 'sat' }),
  m('ata-rom', 'Serie A', '5. Hafta', 'Atalanta', 'Roma', 'ATA', 'ROM', '19:00', 'S Sport 2', { day: 'sat' }),
  m('fb-sam', 'Süper Lig', '7. Hafta', 'Fenerbahçe', 'Samsunspor', 'FB', 'SAM', '17:00', 'beIN SPORTS 1', { day: 'sat' }),
  m('ol-asm', 'Ligue 1', '6. Hafta', 'Lyon', 'Monaco', 'OL', 'ASM', '22:05', 'beIN SPORTS 3', { day: 'sat' }),
];

export const team = {
  name: 'Beşiktaş', abbr: 'BJK', league: 'Süper Lig', country: 'Türkiye',
  color: '#1a1a1a', accent: '#f5f5f5',
  form: ['G', 'G', 'B', 'M', 'G'],
  standing: { pos: 3, played: 6, won: 4, drawn: 1, lost: 1, gd: '+7', pts: 13 },
  squad: [
    { no: 1, name: 'Mert Günok', pos: 'KL' },
    { no: 3, name: 'Gabriel Paulista', pos: 'DF' },
    { no: 10, name: 'Rafa Silva', pos: 'OS' },
    { no: 8, name: 'Orkun Kökçü', pos: 'OS' },
    { no: 9, name: 'Dušan Vlahović', pos: 'FV' },
  ],
  fixtures: [
    { date: '20 Eyl', opp: 'Trabzonspor', ha: 'D', result: '1–2', win: 'L' },
    { date: '27 Eyl', opp: 'Amed SFK', ha: 'E', result: '20:00', upcoming: true },
    { date: '1 Eki', opp: 'Roma', ha: 'E', result: '22:00', upcoming: true, comp: 'UEL' },
    { date: '5 Eki', opp: 'Galatasaray', ha: 'D', result: '20:00', upcoming: true },
  ],
};

export const sports = [
  { id: 'all', label: 'Tümü' },
  { id: 'football', label: 'Futbol' },
  { id: 'tennis', label: 'Tenis' },
  { id: 'basketball', label: 'Basketbol' },
  { id: 'f1', label: 'F1' },
];
