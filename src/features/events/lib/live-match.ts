import { fold } from '../../../lib/search.ts';
import type { EspnLiveEntry } from '../../../services/events.ts';
import {
    LIVE_STATUSES,
    type ApiSportsFixtureEvent,
    type ApiSportsFixtureState,
} from '../../../services/providers/api-sports-fixture.ts';
import type { FootballLiveScore } from '../../../services/providers/api-sports-live.ts';
import type { SportEvent } from '../../../types/index.ts';

/** Team-name equality tolerant of punctuation ("Paris Saint-Germain" vs "Paris Saint Germain"). */
function foldTeamName(name: string): string {
  return fold(name).replace(/[^a-z0-9]/g, '');
}

/**
 * Matches our catalog events to the aggregated live-scores feed by exact
 * home+away team-name equality — not a substring/contains match. A missed
 * match just means that event isn't shown as live, which is safer than
 * attaching the wrong score to it (see the `Angers` ⊂ `Queens Park Rangers`
 * class of bug documented in AGENTS.md).
 *
 * Deliberately not scoped to a fixed league-id allowlist like the match
 * centre's `resolveApiSportsFixture`: `fixtures?live=all` covers every
 * league API-Sports knows, and requiring both team names to match exactly
 * is enough disambiguation on its own.
 */
export function matchLiveScores(
  events: SportEvent[],
  scores: FootballLiveScore[],
): Map<string, FootballLiveScore> {
  const byFixtureId = new Map(scores.map(score => [String(score.fixtureId), score]));
  const byTeams = new Map<string, FootballLiveScore>();
  for (const score of scores) {
    byTeams.set(`${foldTeamName(score.homeTeam)}|${foldTeamName(score.awayTeam)}`, score);
  }
  const matches = new Map<string, FootballLiveScore>();
  for (const event of events) {
    if (event.sportId !== 'football') continue;
    // Rescued live fixtures are persisted with their API-Sports id. Prefer
    // that stable identity: provider may say "Amed" while our catalog says
    // "Amed SFK", and name equality should not hide a known same fixture.
    const byId = event.externalIds.apisports
      ? byFixtureId.get(event.externalIds.apisports)
      : undefined;
    if (byId) {
      matches.set(event.id, byId);
      continue;
    }
    if (!event.homeTeamName || !event.awayTeamName) continue;
    const score = byTeams.get(`${foldTeamName(event.homeTeamName)}|${foldTeamName(event.awayTeamName)}`);
    // Two different fixtures can share team names (e.g. a women's Nations
    // League game that finished 2-2 earlier vs tonight's men's match still
    // being played). The live feed only contains fixtures near "now", so a
    // name match whose kickoff drifts >3h from ours is a different fixture —
    // attaching it would print a finished score on a live match.
    if (score && startDriftOk(event.startsAt, score.startsAt)) matches.set(event.id, score);
  }
  return matches;
}

/** Name-matched records must be the same fixture: kickoff drift <= 3h. */
const MAX_START_DRIFT_MS = 3 * 60 * 60 * 1000;

function startDriftOk(eventStart: string, feedStart: string): boolean {
  const a = new Date(eventStart).getTime();
  const b = new Date(feedStart).getTime();
  // Unparseable dates can't disprove the match — keep the old behaviour.
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) <= MAX_START_DRIFT_MS;
}

/** ESPN kayitlarinda iki tarafin adi (kulup ya da sporcu). */
function espnPair(entry: EspnLiveEntry): [string, string] | null {
  return entry.home && entry.away ? [foldTeamName(entry.home), foldTeamName(entry.away)] : null;
}

/** Etkinlik basliginda rakip ayiraci "vs" / "v" / "at" — tenis ve dovus maclari. */
function titlePair(title: string): [string, string] {
  const parts = title.split(/\s+(?:vs\.?|at)\s+/i);
  return parts.length === 2 ? [foldTeamName(parts[0]), foldTeamName(parts[1])] : ['', ''];
}

/** Yaris seansi icin saat penceresi: seansin o anda suruyor olmasi beklenir. */
const RACE_SESSION_MS = 120 * 60 * 1000;

function inSessionWindow(event: SportEvent, now: number): boolean {
  if (event.status !== 'scheduled') return false;
  const start = new Date(event.startsAt).getTime();
  if (!Number.isFinite(start) || now < start) return false;
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + RACE_SESSION_MS;
  return now <= end;
}

/**
 * ESPN scoreboard kayitlarini futbol disi etkinliklerimizle esler:
 * basketbol/tenis/ufc iki tarafin adiyla (sira serbest — kaynaklarin
 * ev/deplasman dizesi farkli), f1 seans saatleriyle (isimler kaynaklar
 * arasinda tutarsiz), motogp ise kaynakta olmadigi icin yalnizca saat
 * penceresiyle. Iki tarafin da tam eslesmesi sart: Angers ⊂ QPR tuzagi.
 */
export function matchEspnLive(
  events: SportEvent[],
  entries: EspnLiveEntry[],
  now = Date.now(),
): Map<string, EspnLiveEntry | 'window'> {
  const matches = new Map<string, EspnLiveEntry | 'window'>();
  const f1Sessions = entries.filter((e) => e.sport === 'f1');

  for (const event of events) {
    if (event.sportId === 'f1' || event.sportId === 'motogp') {
      const start = new Date(event.startsAt).getTime();
      // ESPN f1 seansinin tarihi bizimkinden en fazla 90 dk sapabilir.
      const hit = event.sportId === 'f1'
        ? f1Sessions.find((s) => {
            const t = new Date(s.startsAt).getTime();
            return Number.isFinite(t) && Math.abs(t - start) <= 90 * 60 * 1000;
          })
        : undefined;
      if (hit) {
        matches.set(event.id, hit);
      } else if (inSessionWindow(event, now)) {
        matches.set(event.id, 'window');
      }
      continue;
    }

    const sport = event.sportId === 'football' || event.sportId === 'basketball' || event.sportId === 'tennis' || event.sportId === 'ufc'
      ? event.sportId
      : null;
    if (!sport) continue;

    // Takim adlari once; bireysel sporlarda basliktan iki adi ayristir.
    const pair = event.homeTeamName && event.awayTeamName
      ? [foldTeamName(event.homeTeamName), foldTeamName(event.awayTeamName)] as const
      : titlePair(event.title);
    if (!pair[0] || !pair[1]) {
      // UFC karti "UFC Fight Night: X vs. Y" biciminde; bout adlari icermez.
      // Kart saatine yakin canli bout varsa karti canli say.
      if (sport === 'ufc' && ufcCardLive(entries, event)) matches.set(event.id, 'window');
      continue;
    }

    const hit = entries.find((e) => {
      if (e.sport !== sport) return false;
      // BSD kayitlari kimlik tasir: events.external_ids.bsd ile ayni event id.
      if (sport === 'football' && e.series === 'bsd' && event.externalIds.bsd) {
        return e.id === String(event.externalIds.bsd);
      }
      const ep = espnPair(e);
      if (!ep || !ep[0] || !ep[1]) return false;
      const nameHit = (ep[0] === pair[0] && ep[1] === pair[1]) || (ep[0] === pair[1] && ep[1] === pair[0]);
      // Same-named different football fixtures (e.g. an earlier women's match
      // vs tonight's men's match in the same competition) need the kickoff
      // guard. Tennis/UFC entry times drift legitimately, so skip it there.
      return nameHit && (e.sport !== 'football' || startDriftOk(event.startsAt, e.startsAt));
    });
    if (hit) {
      matches.set(event.id, hit);
    } else if (sport === 'ufc' && ufcCardLive(entries, event)) {
      matches.set(event.id, 'window');
    }
  }
  return matches;
}

/** UFC kart duzeyi etkinligin bir bout'u canliysa kart canli sayilir. */
function ufcCardLive(entries: EspnLiveEntry[], event: SportEvent): boolean {
  const start = new Date(event.startsAt).getTime();
  if (!Number.isFinite(start)) return false;
  return entries.some((e) => {
    if (e.sport !== 'ufc') return false;
    const t = new Date(e.startsAt).getTime();
    return Number.isFinite(t) && Math.abs(t - start) <= 6 * 60 * 60 * 1000;
  });
}

/** Kart icin normalize edilmis durum: API-Sports kisa statu kodu + dakika. */
export interface MatchCentreState {
  status: string;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  events: ApiSportsFixtureEvent[];
}

/**
 * BSD/ESPN `statusDetail` metnini ("63'", "HT", "PEN", "UZ 105'",
 * "Halftime", "45'+2'") API-Sports kisa statu koduna + dakikaya cevirir.
 * `espn` akisinda yalnizca su an canli olan kayitlar vardir, bu yuzden
 * taninmayan bir metin de canlidir — dakika sadece bilinmiyor demektir.
 */
function feedStatus(detail: string | null): { status: string; elapsed: number | null } {
  if (!detail) return { status: '1H', elapsed: null };
  const lower = detail.toLowerCase();
  if (lower === 'ht' || lower.includes('halftime') || lower === 'half time') {
    return { status: 'HT', elapsed: null };
  }
  if (lower === 'pen' || lower.startsWith('penalt')) return { status: 'P', elapsed: null };
  const minute = detail.match(/(\d+)/);
  if (minute) {
    const extra = lower.startsWith('uz') || lower.includes('extra');
    return { status: extra ? 'ET' : '2H', elapsed: Number(minute[1]) };
  }
  return { status: '1H', elapsed: null };
}

/**
 * Mac merkezi icin detay ucu (`event-live`) ve toplu canli akis
 * (`live-scores`) kayitlarini uzlastirir.
 *
 * Toplu akista canli gorunen bir mac (BSD/ESPN kayitlari yalnizca oynanmakta
 * olanlari tasir; API-Sports kaydi LIVE_STATUSES'ta ise) her zaman canli
 * sayilir: detay ucunun bayat 'FT' onbellegi ya da kapsamadigi bir lig
 * ("league_not_covered") gercek bir canli isareti ezemez. Skor once canli
 * akisin kaydindan alinir; eksikse detay ucunku yedek olarak kalir. Olay
 * zaman cizelgesi yalnizca detay ucutan gelir — uydurulmaz.
 */
export function resolveMatchCentre(
  detailed: ApiSportsFixtureState | null,
  apiScore: FootballLiveScore | null | undefined,
  feedEntry: EspnLiveEntry | null | undefined,
): MatchCentreState | null {
  const apiLive = apiScore && LIVE_STATUSES.has(apiScore.status) ? apiScore : null;
  if (feedEntry) {
    const { status, elapsed } = feedStatus(feedEntry.statusDetail);
    return {
      status,
      elapsed: elapsed ?? apiLive?.elapsed ?? detailed?.elapsed ?? null,
      homeScore: feedEntry.homeScore ?? apiLive?.homeScore ?? detailed?.homeScore ?? null,
      awayScore: feedEntry.awayScore ?? apiLive?.awayScore ?? detailed?.awayScore ?? null,
      events: detailed?.events ?? [],
    };
  }
  if (apiLive) {
    return {
      status: apiLive.status,
      elapsed: apiLive.elapsed,
      homeScore: apiLive.homeScore ?? detailed?.homeScore ?? null,
      awayScore: apiLive.awayScore ?? detailed?.awayScore ?? null,
      events: detailed?.events ?? [],
    };
  }
  if (detailed) return detailed;
  if (apiScore) {
    return { ...apiScore, events: [] };
  }
  return null;
}

/** Kartin ortasina yazilacak kisa canli metin: skor ya da set cetelesi. */
export function espnLiveScoreText(entry: EspnLiveEntry): string | null {
  if (entry.sport === 'tennis' && entry.homeLines.length > 0 && entry.awayLines.length > 0) {
    // Tenis: score alani bos gelir; linescores set basina oyun sayisi
    // tasir. Devam eden/son oynanan setin oyunlari gosterilir ("5–4").
    return `${entry.homeLines[entry.homeLines.length - 1]}–${entry.awayLines[entry.awayLines.length - 1]}`;
  }
  if (entry.homeScore !== null && entry.awayScore !== null) {
    return `${entry.homeScore}–${entry.awayScore}`;
  }
  return null;
}
