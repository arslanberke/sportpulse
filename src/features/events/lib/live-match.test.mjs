import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    espnLiveScoreText,
    matchEspnLive,
    matchLiveScores,
    resolveMatchCentre,
} from './live-match.ts';

const event = (id, home, away, overrides = {}) => ({
  id, sportId: 'football', leagueId: 'l', homeTeamId: 'h', awayTeamId: 'a',
  title: `${home} vs ${away}`, startsAt: new Date().toISOString(), status: 'scheduled',
  imageUrl: null, venue: null, venueImageUrl: null, importance: 0, externalIds: {},
  homeTeamName: home, awayTeamName: away, ...overrides,
});
const score = (home, away, overrides = {}) => ({
  fixtureId: 1, leagueId: 39, leagueName: 'Premier League', homeTeam: home, awayTeam: away,
  homeScore: 1, awayScore: 0, elapsed: 23, status: '1H', startsAt: new Date().toISOString(), ...overrides,
});

test('exact team-name equality matches regardless of punctuation/diacritics', () => {
  const matches = matchLiveScores(
    [event('e1', 'Paris Saint Germain', 'Marseille')],
    [score('Paris Saint-Germain', 'Marseille')],
  );
  assert.equal(matches.get('e1')?.homeScore, 1);
});

test('provider fixture id matches a rescued event even when catalog team spelling differs', () => {
  const matches = matchLiveScores(
    [event('e1', 'Amed SFK', 'Beşiktaş', { externalIds: { apisports: '1584412' } })],
    [score('Amed', 'Beşiktaş', { fixtureId: 1584412 })],
  );
  assert.equal(matches.get('e1')?.homeTeam, 'Amed');
});

test('a live match for a different fixture does not attach to an unrelated event', () => {
  const matches = matchLiveScores(
    [event('e1', 'Angers', 'Queens Park Rangers')],
    [score('Queens Park Rangers', 'Chelsea')],
  );
  assert.equal(matches.has('e1'), false);
});

test('non-football events and events missing team names are never matched', () => {
  const matches = matchLiveScores(
    [event('e1', 'Real Madrid', 'Barcelona', { sportId: 'tennis' }), event('e2', null, null)],
    [score('Real Madrid', 'Barcelona')],
  );
  assert.equal(matches.size, 0);
});

test('an event with no live score present is simply absent from the result', () => {
  const matches = matchLiveScores([event('e1', 'Inter', 'Milan')], [score('Roma', 'Lazio')]);
  assert.equal(matches.has('e1'), false);
});

const espnEntry = (overrides = {}) => ({
  id: 'espn-1', sport: 'basketball', series: 'nba', name: 'A at B',
  statusDetail: 'Q3 4:32', home: 'Boston Celtics', away: 'Los Angeles Lakers',
  homeScore: 88, awayScore: 91, homeLines: [], awayLines: [],
  startsAt: new Date().toISOString(), ...overrides,
});

test('espn: basketball matches by team names in either order', () => {
  const m = matchEspnLive(
    [event('e1', 'Los Angeles Lakers', 'Boston Celtics', { sportId: 'basketball' })],
    [espnEntry()],
  );
  assert.equal(m.get('e1')?.homeScore, 88);
});

test('espn: tennis matches by player names parsed from the title', () => {
  const m = matchEspnLive(
    [event('e1', null, null, { sportId: 'tennis', title: 'C. Alcaraz vs J. Sinner', homeTeamName: null, awayTeamName: null })],
    [espnEntry({ sport: 'tennis', series: 'atp', home: 'Carlos Alcaraz', away: 'Jannik Sinner', homeScore: null, awayScore: null, homeLines: [6, 3], awayLines: [4, 6] })],
  );
  // Kisa yazilis ("C. Alcaraz") tam esit degildir: eslesme beklenmez.
  assert.equal(m.has('e1'), false);
});

test('espn: tennis matches with full player names; score text shows the live set games', () => {
  const e = event('e1', null, null, { sportId: 'tennis', title: 'Carlos Alcaraz vs Jannik Sinner', homeTeamName: null, awayTeamName: null });
  const entry = espnEntry({ sport: 'tennis', series: 'atp', home: 'Carlos Alcaraz', away: 'Jannik Sinner', homeScore: null, awayScore: null, homeLines: [6, 3, 4], awayLines: [4, 6, 2] });
  const m = matchEspnLive([e], [entry]);
  assert.equal(m.get('e1'), entry);
  assert.equal(espnLiveScoreText(entry), '4–2');
});

test('espn: f1 session matches by start-time proximity, not name', () => {
  const start = new Date();
  const e = event('e1', null, null, { sportId: 'f1', title: 'Azerbaijan Grand Prix - Race', homeTeamName: null, awayTeamName: null, startsAt: start.toISOString() });
  const entry = espnEntry({ sport: 'f1', series: 'f1', name: 'Race', home: null, away: null, homeScore: null, awayScore: null, startsAt: new Date(start.getTime() + 30 * 60 * 1000).toISOString() });
  const m = matchEspnLive([e], [entry]);
  assert.equal(m.get('e1'), entry);
});

test('espn: f1 beyond the 90-minute tolerance and outside the session window stays silent', () => {
  const start = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 saat once basladi
  const e = event('e1', null, null, { sportId: 'f1', title: 'Race', homeTeamName: null, awayTeamName: null, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString() });
  const entry = espnEntry({ sport: 'f1', series: 'f1', home: null, away: null, homeScore: null, awayScore: null, startsAt: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString() });
  assert.equal(matchEspnLive([e], [entry]).has('e1'), false);
});

test('espn: motogp has no board — live only inside its own session window', () => {
  const start = new Date(Date.now() - 30 * 60 * 1000);
  const e = event('e1', null, null, { sportId: 'motogp', title: 'Race', homeTeamName: null, awayTeamName: null, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 60 * 60 * 1000).toISOString() });
  const m = matchEspnLive([e], []);
  assert.equal(m.get('e1'), 'window');
});

test('espn: a partial name overlap never matches (substring trap)', () => {
  const m = matchEspnLive(
    [event('e1', 'Angers', 'Marseille', { sportId: 'basketball' })],
    [espnEntry({ home: 'Queens Park Rangers', away: 'Marseille' })],
  );
  assert.equal(m.has('e1'), false);
});

test('espn: ufc card event goes live when a bout is live near its start', () => {
  const start = new Date();
  const e = event('e1', null, null, { sportId: 'ufc', title: 'UFC Fight Night: Rosas Jr. vs. Barcelos', homeTeamName: null, awayTeamName: null, startsAt: start.toISOString() });
  const bout = espnEntry({ sport: 'ufc', series: 'ufc', name: 'Demopoulos vs Jauregui', home: 'Jasmine Jasudavicius', away: 'Karine Silva', homeScore: null, awayScore: null, startsAt: new Date(start.getTime() + 60 * 60 * 1000).toISOString() });
  assert.equal(matchEspnLive([e], [bout]).get('e1'), 'window');
});

test('espn: nations-league football matches by exact team names (API-Sports fallback)', () => {
  const e = event('e1', 'Bulgaria', 'Luxembourg', { sportId: 'football' });
  const entry = espnEntry({ sport: 'football', series: 'uefa.nations', name: 'Bulgaria vs Luxembourg', home: 'Bulgaria', away: 'Luxembourg', homeScore: 1, awayScore: 2, statusDetail: '2nd Half' });
  const m = matchEspnLive([e], [entry]);
  assert.equal(m.get('e1'), entry);
  assert.equal(espnLiveScoreText(entry), '1–2');
});

test('bsd: live football matches by bsd event id even when names differ', () => {
  const e = event('e1', 'Amed SFK', 'Beşiktaş', { sportId: 'football', externalIds: { bsd: '587001' } });
  const entry = espnEntry({ sport: 'football', series: 'bsd', id: '587001', name: 'Amed vs Besiktas', home: 'Amed', away: 'Besiktas', homeScore: 2, awayScore: 1, statusDetail: "67'" });
  const m = matchEspnLive([e], [entry]);
  assert.equal(m.get('e1'), entry);
});

test('bsd: an unrelated event with no bsd id never matches a bsd entry', () => {
  const e = event('e1', 'Roma', 'Lazio', { sportId: 'football' });
  const entry = espnEntry({ sport: 'football', series: 'bsd', id: '587001', home: 'Amed', away: 'Besiktas' });
  assert.equal(matchEspnLive([e], [entry]).has('e1'), false);
});

test('a same-named fixture that finished hours earlier never attaches to tonight\'s match', () => {
  const e = event('e1', 'England', 'Spain', {
    startsAt: '2026-09-26T18:45:00Z',
  });
  // Kadin UNL'sinde sabah bitmis ayri bir England-Spain: ayni isim, FT 2-2.
  const stale = score('England', 'Spain', {
    status: 'FT', homeScore: 2, awayScore: 2, elapsed: null,
    startsAt: '2026-09-26T10:00:00Z',
  });
  assert.equal(matchLiveScores([e], [stale]).has('e1'), false);
  // Ayni saatteki canli kayit eslesmeye devam eder.
  const live = score('England', 'Spain', {
    status: '2H', homeScore: 1, awayScore: 1, elapsed: 55,
    startsAt: '2026-09-26T18:45:00Z',
  });
  assert.equal(matchLiveScores([e], [live]).get('e1')?.status, '2H');
});

test('espn: a same-named football entry with a far-off kickoff is not matched', () => {
  const e = event('e1', 'England', 'Spain', { startsAt: '2026-09-26T18:45:00Z' });
  const entry = espnEntry({
    sport: 'football', series: 'uefa.nations', home: 'England', away: 'Spain',
    startsAt: '2026-09-26T09:00:00Z',
  });
  assert.equal(matchEspnLive([e], [entry]).has('e1'), false);
});

test('espn: bsd id match ignores kickoff drift (identity is already proven)', () => {
  const e = event('e1', 'England', 'Spain', {
    startsAt: '2026-09-26T18:45:00Z', externalIds: { bsd: '999' },
  });
  const entry = espnEntry({
    sport: 'football', series: 'bsd', id: '999', home: 'X', away: 'Y',
    startsAt: '2026-09-20T00:00:00Z',
  });
  assert.equal(matchEspnLive([e], [entry]).get('e1'), entry);
});

const detailed = (overrides = {}) => ({
  fixtureId: 9, status: 'FT', elapsed: null, homeScore: 2, awayScore: 2, events: [], ...overrides,
});

test('centre: a stale final-looking detail state loses to a live aggregate entry', () => {
  const live = resolveMatchCentre(
    detailed({ status: 'FT', homeScore: 2, awayScore: 2 }),
    null,
    espnEntry({ sport: 'football', series: 'bsd', homeScore: 2, awayScore: 3, statusDetail: "78'" }),
  );
  assert.equal(live.status, '2H');
  assert.equal(live.elapsed, 78);
  assert.equal(live.homeScore, 2);
  assert.equal(live.awayScore, 3);
});

test('centre: halftime detail from the feed overrides a stale FT snapshot', () => {
  const live = resolveMatchCentre(
    detailed({ status: 'FT' }),
    null,
    espnEntry({ sport: 'football', series: 'uefa.nations', statusDetail: 'HT', homeScore: 1, awayScore: 1 }),
  );
  assert.equal(live.status, 'HT');
});

test('centre: an explicit final status still resolves final when no feed says live', () => {
  const live = resolveMatchCentre(detailed({ status: 'FT' }), null, null);
  assert.equal(live.status, 'FT');
  assert.equal(live.homeScore, 2);
});

test('centre: api-sports live score wins over stale detail, keeps its events', () => {
  const events = [{ minute: 12, extraMinute: null, type: 'goal', detail: 'Normal Goal', isHome: true, player: 'X', assistOrSubIn: null }];
  const live = resolveMatchCentre(
    detailed({ status: 'NS', homeScore: null, awayScore: null, events }),
    score('England', 'Spain', { status: '2H', elapsed: 55, homeScore: 1, awayScore: 1 }),
    null,
  );
  assert.equal(live.status, '2H');
  assert.equal(live.elapsed, 55);
  assert.equal(live.events.length, 1);
});

test('centre: unknown live detail text still counts as live without a minute', () => {
  const live = resolveMatchCentre(
    detailed({ status: 'FT' }),
    null,
    espnEntry({ sport: 'football', series: 'uefa.nations', statusDetail: 'Second Half', homeScore: 0, awayScore: 0 }),
  );
  assert.equal(live.status, '1H');
  assert.equal(live.elapsed, null);
});

test('centre: nothing resolves when no source has the match', () => {
  assert.equal(resolveMatchCentre(null, null, null), null);
});
