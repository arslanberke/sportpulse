import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarDays, currentCalendarEvents, filterBracketMatches, filterCalendarEvents, groupCalendarEvents } from './calendar-view.ts';

const now = new Date(2026, 8, 20, 12);
const match = (id, extra = {}) => ({ id, sportId: 'football', leagueId: 'super', startsAt: new Date(2026, 8, 20, 20).toISOString(), status: 'scheduled', channels: [{ id: 'tv' }], ...extra });
const events = [match('favorite'), match('other'), match('tennis', { sportId: 'tennis', leagueId: 'atp' })];
const favorite = (event) => event.id === 'favorite';

test('sport, favorite, league and channel filters compose without mutating the calendar', () => {
  assert.deepEqual(filterCalendarEvents(events, { sportId: 'football', favoritesOnly: true, leagueId: 'super', channelId: 'tv' }, favorite).map(e => e.id), ['favorite']);
  assert.equal(filterCalendarEvents(events, { sportId: 'football' }, favorite).length, 2);
  assert.equal(events.length, 3);
  assert.deepEqual(filterCalendarEvents(events, { channelId: 'missing' }, favorite), []);
});

test('day filter uses local calendar dates and retains overlapping multi-day events', () => {
  const day = new Date(2026, 8, 21);
  const tournament = match('tournament', { startsAt: new Date(2026, 8, 19).toISOString(), endsAt: new Date(2026, 8, 22).toISOString() });
  assert.deepEqual(filterCalendarEvents([...events, tournament], { day }, favorite).map(e => e.id), ['tournament']);
  assert.equal(filterCalendarEvents([tournament], { day: new Date(2026, 8, 22) }, favorite).length, 0);
  assert.equal(calendarDays(now).length, 7);
  assert.equal(calendarDays(now)[0].getHours(), 0);
});

test('past single matches stay out of the normal calendar while ongoing multi-day events remain', () => {
  const pastSingle = match('past', { startsAt: new Date(2026, 8, 20, 10).toISOString() });
  const ongoing = match('ongoing', { startsAt: new Date(2026, 8, 18).toISOString(), endsAt: new Date(2026, 8, 22).toISOString() });
  const future = match('future', { startsAt: new Date(2026, 8, 21).toISOString() });
  assert.deepEqual(currentCalendarEvents([pastSingle, ongoing, future], now).map(e => e.id), ['ongoing', 'future']);
});

test('ongoing events share today’s group and expired end dates do not move events to today', () => {
  const ongoing = match('ongoing', { startsAt: new Date(2026, 8, 18).toISOString(), endsAt: new Date(2026, 8, 22).toISOString() });
  const future = match('future', { startsAt: new Date(2026, 8, 21).toISOString() });
  const groups = groupCalendarEvents([future, events[0], ongoing], now);
  assert.deepEqual(groups.map(g => g.events.map(e => e.id)), [['ongoing', 'favorite'], ['future']]);
});

test('tennis main draw excludes qualifying; categories and rounds remain independent', () => {
  const matches = [
    match('final', { bracket: "Men's Singles", round: 'Final' }),
    match('qualifying', { bracket: "Men's Singles", round: 'Qualifying Final' }),
    match('women', { bracket: "Women's Singles", round: 'Final' }),
    match('semi', { bracket: "Men's Singles", round: 'Semifinal' }),
  ];
  assert.deepEqual(filterBracketMatches(matches, { category: "Men's Singles", round: 'Final' }, now).map(e => e.id), ['final']);
  assert.deepEqual(filterBracketMatches(matches, { category: "Women's Singles" }, now).map(e => e.id), ['women']);
  assert.equal(filterBracketMatches(matches, { qualifying: true }, now).length, 4);
  assert.deepEqual(filterBracketMatches(matches, { round: 'Quarterfinal' }, now), []);
});

test('past scheduled fixtures are never invented results', () => {
  const past = match('past', { startsAt: new Date(2026, 8, 19).toISOString() });
  assert.deepEqual(filterBracketMatches([past], { time: 'upcoming' }, now), []);
  assert.deepEqual(filterBracketMatches([past], { time: 'results' }, now), []);
});
