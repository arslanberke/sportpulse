// Bir kerelik: sonucu eksik gecmis maclari ESPN scoreboard'undan doldurur.
//
// Neden yerel: ESPN, Supabase Edge Function IP'lerine 403 donuyor (AGENTS.md,
// 14 Eylul 2026 olcumu); ayni istek yerelden 200 doner. Sync-events'in kalici
// sonuc yazimi engel kalkinca kendiliginden calisir; bu betik yalnizca
// birikmis acigi kapatir.
//
// Veritabanina `supabase db query --linked` ile baglanir (servis anahtari
// gerekmez) ve yalnizca set_event_results (migration 0070) cagirir: mevcut
// satiri id ile gunceller, bitmis sonucu geri almaz.
//
//   node scripts/backfill-espn-results.mjs           # yaz
//   node scripts/backfill-espn-results.mjs --dry-run # yalnizca say

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { espnResult } from '../src/services/providers/espn.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const PATHS = { football: 'soccer', basketball: 'basketball' };
const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

function query(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'espn-backfill-'));
  const file = join(dir, 'q.sql');
  writeFileSync(file, sql);
  try {
    const out = execFileSync('npx', ['-y', 'supabase@latest', 'db', 'query', '--linked', '-f', file, '--output-format', 'json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(out.slice(out.indexOf('[')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const ymd = (date) => date.toISOString().slice(0, 10).replace(/-/g, '');

const targets = query(`
  select e.id, e.sport_id, e.external_ids->>'espn' espn, e.starts_at,
         l.external_ids->>'espn' slug, l.external_ids->>'espnQualifying' qslug
    from events_missing_result(100000) e
    join leagues l on l.id = e.league_id
   where e.external_ids ? 'espn' and l.external_ids ? 'espn';`);

// Ayni lig + gun icin tek istek. ESPN tarih araligini 400 ile reddediyor,
// gunu de ABD saatine gore kesiyor: bir gun once ve sonrasi ayri sorulur.
const boards = new Map();
for (const target of targets) {
  const path = PATHS[target.sport_id];
  if (!path) continue;
  const day = new Date(target.starts_at).getTime();
  for (const offset of [-1, 0, 1]) {
    for (const slug of [target.slug, target.qslug].filter(Boolean)) {
      const url = `${BASE}/${path}/${slug}/scoreboard?dates=${ymd(new Date(day + offset * 86_400_000))}`;
      if (!boards.has(url)) boards.set(url, new Set());
      boards.get(url).add(target.espn);
    }
  }
}

const found = new Map();
let failed = 0;
for (const url of boards.keys()) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) { failed += 1; continue; }
    const body = await response.json();
    for (const event of Array.isArray(body.events) ? body.events : []) {
      const result = espnResult(event);
      if (result.resultStatus === 'finished' && result.homeScore !== null) found.set(String(event.id), result);
    }
  } catch {
    failed += 1;
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
}

const rows = targets.flatMap((target) => {
  const result = found.get(target.espn);
  return result ? [{ id: target.id, home_score: result.homeScore, away_score: result.awayScore, result_status: 'finished' }] : [];
});

let written = 0;
if (!DRY_RUN && rows.length > 0) {
  for (let offset = 0; offset < rows.length; offset += 200) {
    const payload = JSON.stringify(rows.slice(offset, offset + 200)).replaceAll("'", "''");
    written += Number(query(`select set_event_results('${payload}'::jsonb) written;`)[0].written);
  }
}

console.log(JSON.stringify({ candidates: targets.length, scoreboards: boards.size, failedScoreboards: failed, finishedOnEspn: rows.length, written, dryRun: DRY_RUN }));
