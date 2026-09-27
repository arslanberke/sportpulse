// Ornek veri — dort yon de ayni icerigi cizer ki fark yalnizca tasarimdan gelsin.
export const today = { label: 'Cuma', date: '26 Eylül' };

export const days = [
  { key: 'thu', short: 'Per', num: 25 },
  { key: 'fri', short: 'Cum', num: 26, today: true },
  { key: 'sat', short: 'Cmt', num: 27 },
  { key: 'sun', short: 'Paz', num: 28 },
  { key: 'mon', short: 'Pzt', num: 29 },
  { key: 'tue', short: 'Sal', num: 30 },
  { key: 'wed', short: 'Çar', num: 1 },
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
    { date: '2 Eki', opp: 'Roma', ha: 'E', result: '22:00', upcoming: true, comp: 'UEL' },
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
