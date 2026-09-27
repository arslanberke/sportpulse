export const players = [
  { id: 'sinner', name: 'Jannik Sinner', country: 'ITA', tour: 'ATP', rank: 1, points: '11.830', initials: 'JS', photo: 'https://a.espncdn.com/i/headshots/tennis/players/full/3623.png' },
  { id: 'alcaraz', name: 'Carlos Alcaraz', country: 'ESP', tour: 'ATP', rank: 2, points: '10.240', initials: 'CA', photo: 'https://a.espncdn.com/i/headshots/tennis/players/full/3782.png' },
  { id: 'rybakina', name: 'Elena Rybakina', country: 'KAZ', tour: 'WTA', rank: 4, points: '6.450', initials: 'ER' },
  { id: 'sabalenka', name: 'Aryna Sabalenka', country: 'BLR', tour: 'WTA', rank: 1, points: '10.870', initials: 'AS' },
];

export const teams = [
  { id: 'bjk', name: 'Beşiktaş', sport: 'football', initials: 'BJK', league: 'Süper Lig' },
  { id: 'gs', name: 'Galatasaray', sport: 'football', initials: 'GS', league: 'Süper Lig' },
  { id: 'fb', name: 'Fenerbahçe', sport: 'football', initials: 'FB', league: 'Süper Lig' },
  { id: 'efes', name: 'Anadolu Efes', sport: 'basketball', initials: 'AE', league: 'EuroLeague' },
];

export const events = [
  { id: 'derby', sport: 'football', league: 'Süper Lig', home: 'Beşiktaş', away: 'Galatasaray', homeId: 'bjk', awayId: 'gs', homeMark: 'BJK', awayMark: 'GS', day: 14, time: '20:00', live: true, score: '2 : 1', minute: '67′ · İkinci yarı', channel: 'beIN SPORTS 1', featured: true, venue: 'Tüpraş Stadyumu' },
  { id: 'tennis-evening', sport: 'tennis', league: 'US Open', home: 'Jannik Sinner', away: 'Carlos Alcaraz', homeId: 'sinner', awayId: 'alcaraz', homeMark: 'JS', awayMark: 'CA', day: 14, time: '21:30', live: false, channel: 'Eurosport 1', round: 'Yarı final', venue: 'Arthur Ashe Stadium' },
  { id: 'basket', sport: 'basketball', league: 'EuroLeague', home: 'Anadolu Efes', away: 'Olympiacos', homeId: 'efes', awayId: 'oly', homeMark: 'AE', awayMark: 'OLY', day: 14, time: '22:00', live: false, channel: 'S Sport', venue: 'Basketbol Gelişim Merkezi' },
  { id: 'tennis-women', sport: 'tennis', league: 'US Open', home: 'Elena Rybakina', away: 'Aryna Sabalenka', homeId: 'rybakina', awayId: 'sabalenka', homeMark: 'ER', awayMark: 'AS', day: 15, time: '19:00', live: false, channel: 'Eurosport 1', round: 'Yarı final', venue: 'Arthur Ashe Stadium' },
  { id: 'europe', sport: 'football', league: 'Avrupa Ligi', home: 'Beşiktaş', away: 'Roma', homeId: 'bjk', awayId: 'roma', homeMark: 'BJK', awayMark: 'ROM', day: 17, time: '22:00', live: false, channel: 'TRT 1', venue: 'Tüpraş Stadyumu' },
  { id: 'fb-match', sport: 'football', league: 'Süper Lig', home: 'Fenerbahçe', away: 'Trabzonspor', homeId: 'fb', awayId: 'ts', homeMark: 'FB', awayMark: 'TS', day: 15, time: '20:00', live: false, channel: 'beIN SPORTS 1', venue: 'Şükrü Saracoğlu Stadyumu' },
];

export const draw = [
  { id: 'tennis-evening', tour: 'ATP', round: 'semi', day: 14, time: '21:30', status: 'upcoming', home: 'Jannik Sinner', homeId: 'sinner', homeCountry: 'ITA', homeRank: 1, away: 'Carlos Alcaraz', awayId: 'alcaraz', awayCountry: 'ESP', awayRank: 2 },
  { id: 'semi2', tour: 'ATP', round: 'semi', day: 14, time: '23:00', status: 'upcoming', home: 'Alexander Zverev', homeCountry: 'GER', homeRank: 3, away: 'Novak Djokovic', awayCountry: 'SRB', awayRank: 7 },
  { id: 'quarter1', tour: 'ATP', round: 'quarter', day: 13, time: '21:00', status: 'finished', home: 'Jannik Sinner', homeId: 'sinner', homeCountry: 'ITA', homeRank: 1, away: 'Ben Shelton', awayCountry: 'USA', awayRank: 10, homeSets: '6 6 7', awaySets: '4 3 5' },
  { id: 'tennis-women', tour: 'WTA', round: 'semi', day: 15, time: '19:00', status: 'upcoming', home: 'Elena Rybakina', homeId: 'rybakina', homeCountry: 'KAZ', homeRank: 4, away: 'Aryna Sabalenka', awayId: 'sabalenka', awayCountry: 'BLR', awayRank: 1 },
  { id: 'qualifying', tour: 'WTA', round: 'qualifying', day: 12, time: '15:30', status: 'finished', home: 'Zeynep Sönmez', homeCountry: 'TUR', homeRank: 85, away: 'Örnek sporcu', awayCountry: 'FRA', awayRank: 112, homeSets: '6 6', awaySets: '3 4' },
];

export function isFavorite(event, favoriteIds) {
  return favoriteIds.has(event.homeId) || favoriteIds.has(event.awayId);
}

export function filterEvents(list, filters, favoriteIds) {
  return list.filter((event) =>
    (!filters.sport || filters.sport === 'all' || event.sport === filters.sport) &&
    (!filters.favoritesOnly || isFavorite(event, favoriteIds)) &&
    (!filters.liveOnly || event.live) &&
    (!filters.league || event.league === filters.league) &&
    (!filters.channel || event.channel === filters.channel) &&
    (!filters.day || event.day === filters.day),
  );
}

export function filterDraw(list, filters) {
  return list.filter((match) => match.tour === filters.tour &&
    (filters.round === 'all' ? match.round !== 'qualifying' : match.round === filters.round) &&
    (filters.time === 'all' || (filters.time === 'today' ? match.day === 14 : match.status === filters.time)),
  );
}

export function fold(value) {
  return value.toLocaleLowerCase('tr').replaceAll('ı', 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function searchCatalog(query) {
  const needle = fold(query.trim());
  return {
    teams: teams.filter((item) => fold(item.name).includes(needle)),
    players: players.filter((item) => fold(item.name).includes(needle)),
  };
}
