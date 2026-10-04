import assert from 'node:assert/strict';
import { test } from 'node:test';
import { f1SessionOver, parseSessionInfo } from './f1-livetiming.ts';
import { matchOpenF1Session, openF1Classification, openF1SessionName } from './openf1.ts';

const sessions = [
  { session_key: 1, session_name: 'Qualifying', date_start: '2026-10-03T08:00:00+00:00', date_end: '2026-10-03T09:00:00+00:00' },
  { session_key: 2, session_name: 'Race', date_start: '2026-10-04T07:00:00+00:00', date_end: '2026-10-04T09:00:00+00:00' },
];

test('maps titles to OpenF1 session names; support series match nothing', () => {
  assert.equal(openF1SessionName('Bahrain in Malaysia Grand Prix'), 'Race');
  assert.equal(openF1SessionName('Singapore Grand Prix Sprint Qualifying'), 'Sprint Qualifying');
  assert.equal(openF1SessionName('Singapore Grand Prix Sprint'), 'Sprint');
  assert.equal(openF1SessionName('Azerbaijan Grand Prix Practice 2'), 'Practice 2');
  assert.equal(openF1SessionName('Azerbaijan Qualifying 1'), null);
  assert.equal(openF1SessionName('Azerbaijan Feature Race 1'), null);
});

test('race drifted 45 min in our data still matches the race, not qualifying', () => {
  assert.equal(matchOpenF1Session(sessions, 'Bahrain in Malaysia Grand Prix', '2026-10-04T07:45:00Z')?.session_key, 2);
});

test('classification uses each driver\'s last position', () => {
  const r = openF1Classification(sessions[1], [
    { date: '2026-10-04T07:10:00Z', driver_number: 1, position: 2 },
    { date: '2026-10-04T07:10:00Z', driver_number: 3, position: 1 },
    { date: '2026-10-04T08:50:00Z', driver_number: 1, position: 1 },
    { date: '2026-10-04T08:50:00Z', driver_number: 3, position: 2 },
  ], [
    { driver_number: 1, first_name: 'Lando', last_name: 'Norris', team_name: 'McLaren' },
    { driver_number: 3, first_name: 'Max', last_name: 'Verstappen', team_name: 'Red Bull Racing' },
  ]);
  assert.deepEqual(r.entries.map((e) => e.name), ['Lando Norris', 'Max Verstappen']);
  assert.equal(r.live, false);
  assert.equal(r.session, 'Race');
});

test('F1 live timing: finished session is over, other sessions unknown', () => {
  const info = parseSessionInfo({ StartDate: '2026-10-04T15:00:00', EndDate: '2026-10-04T17:00:00', GmtOffset: '08:00:00', SessionStatus: 'Finalised' });
  assert.equal(info.startUtc, Date.parse('2026-10-04T07:00:00Z'));
  assert.equal(f1SessionOver(info, '2026-10-04T07:00:00Z'), true);
  assert.equal(f1SessionOver(info, '2026-10-03T08:00:00Z'), null);
  assert.equal(f1SessionOver({ ...info, status: 'Started' }, '2026-10-04T07:00:00Z'), false);
  assert.equal(f1SessionOver({ ...info, status: 'Inactive' }, '2026-10-04T07:00:00Z', Date.parse('2026-10-04T06:00:00Z')), false);
  assert.equal(f1SessionOver({ ...info, status: 'Inactive' }, '2026-10-04T07:00:00Z', Date.parse('2026-10-04T10:00:00Z')), true);
});
