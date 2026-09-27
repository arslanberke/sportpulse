import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clubKey, dedupeClubTeams, enrichTableLogos } from './table-logos.ts';

test('provider spellings for Amed and Beşiktaş share a stable club key', () => {
  assert.equal(clubKey('Amed Sportif Faaliyetler'), clubKey('Amed SFK'));
  assert.equal(clubKey('Beşiktaş JK'), clubKey('Besiktas'));
});

test('catalog search keeps the richer canonical team when provider spellings duplicate it', () => {
  const teams = dedupeClubTeams([
    { id: 'old', sportId: 'football', leagueId: null, name: 'Beşiktaş JK', logoUrl: 'bsd.png', externalIds: {} },
    { id: 'canonical', sportId: 'football', leagueId: null, name: 'Beşiktaş', logoUrl: 'official.png', externalIds: { bsd: '196', espn: '1895', thesportsdb: '133794' } },
  ]);
  assert.deepEqual(teams.map(team => team.id), ['canonical']);
});

test('missing standings crests are filled without replacing provider crests', () => {
  const groups = [{ name: '', rows: [
    { team: 'Amed Sportif Faaliyetler', teamLogoUrl: null },
    { team: 'Beşiktaş', teamLogoUrl: 'provider.png' },
  ] }];
  const teams = [
    { name: 'Amed SFK', logoUrl: 'amed.png' },
    { name: 'Beşiktaş JK', logoUrl: 'catalog.png' },
  ];
  const rows = enrichTableLogos(groups, teams)[0].rows;
  assert.equal(rows[0].teamLogoUrl, 'amed.png');
  assert.equal(rows[1].teamLogoUrl, 'provider.png');
});
