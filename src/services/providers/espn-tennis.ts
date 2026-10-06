import { PROVIDER_USER_AGENT } from './log.ts';

export interface TennisSet {
  home: number;
  away: number;
  homeTiebreak: number | null;
  awayTiebreak: number | null;
}

export interface TennisSets {
  live: boolean;
  retired: boolean;
  homeWinner: boolean;
  awayWinner: boolean;
  sets: TennisSet[];
}

interface EspnLine { value?: number; tiebreak?: number }
interface EspnCompetitor {
  homeAway?: string;
  winner?: boolean;
  athlete?: { displayName?: string };
  linescores?: EspnLine[];
}
export interface EspnTennisCompetition {
  id?: string;
  status?: { type?: { state?: string; name?: string } };
  competitors?: EspnCompetitor[];
}
interface EspnBoard {
  events?: { competitions?: EspnTennisCompetition[]; groupings?: { competitions?: EspnTennisCompetition[] }[] }[];
}

const fold = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** ESPN'in ev/deplasman sirasi bizim basliktakinden ters olabilir; ev sahibi adla bulunur. */
export function parseTennisSets(comp: EspnTennisCompetition, homeName: string | null | undefined): TennisSets | null {
  const list = comp.competitors ?? [];
  if (list.length < 2) return null;
  const byName = list.findIndex((c) => fold(c.athlete?.displayName) === fold(homeName));
  const espnHome = list.find((c) => c.homeAway === 'home') ?? list[0];
  const home = byName >= 0 ? list[byName] : espnHome;
  const away = list.find((c) => c !== home) ?? list[1];
  const hl = home.linescores ?? [];
  const al = away.linescores ?? [];
  const sets: TennisSet[] = [];
  for (let i = 0; i < Math.min(hl.length, al.length); i++) {
    if (hl[i].value == null || al[i].value == null) continue;
    sets.push({
      home: hl[i].value!,
      away: al[i].value!,
      homeTiebreak: hl[i].tiebreak ?? null,
      awayTiebreak: al[i].tiebreak ?? null,
    });
  }
  if (sets.length === 0) return null;
  const type = comp.status?.type;
  return {
    live: type?.state === 'in',
    retired: type?.name === 'STATUS_RETIRED',
    homeWinner: home.winner === true,
    awayWinner: away.winner === true,
    sets,
  };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

/** Mac panoda kendi gununde; gece yarisina yakin maclar icin bir onceki gun de denenir. */
export async function fetchTennisSets(
  tour: string,
  espnId: string,
  startsAt: string,
  homeName: string | null | undefined,
): Promise<TennisSets | null> {
  const start = new Date(startsAt).getTime();
  for (const offset of [0, -1]) {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard?dates=${ymd(new Date(start + offset * 86_400_000))}`,
      { headers: { 'User-Agent': PROVIDER_USER_AGENT } },
    );
    if (!res.ok) throw new Error(`ESPN tennis ${res.status}`);
    const board = (await res.json()) as EspnBoard;
    const comp = (board.events ?? [])
      .flatMap((e) => [...(e.competitions ?? []), ...(e.groupings ?? []).flatMap((g) => g.competitions ?? [])])
      .find((c) => c.id === espnId);
    if (comp) return parseTennisSets(comp, homeName);
  }
  return null;
}
