import type { StandingEntry, Standings } from './types.ts';

/**
 * Motorsport championship (drivers'/riders') standings.
 *
 * F1 comes from the open Ergast/Jolpica API; MotoGP from motogp.com's own
 * pulselive API (same source as the session results). Both are structured
 * JSON — no scraping. Returns null on any miss so the caller can hide the card.
 */

const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const MOTOGP = 'https://api.motogp.pulselive.com/motogp/v1/results';
const UA = 'Mozilla/5.0';
// Premier MotoGP class; the uuid is stable across seasons.
const MOTOGP_CATEGORY = 'e8c110ad-64aa-4e8e-8a86-f2f152f6a942';

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface ErgastStandings {
  MRData?: {
    StandingsTable?: {
      StandingsLists?: {
        DriverStandings?: {
          position: string;
          points: string;
          Driver: { givenName: string; familyName: string };
          Constructors: { name: string }[];
        }[];
      }[];
    };
  };
}

async function fetchF1Standings(year: number): Promise<Standings | null> {
  const data = await getJson<ErgastStandings>(`${JOLPICA}/${year}/driverStandings.json`);
  const rows = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  const entries: StandingEntry[] = rows.map((r) => ({
    position: Number(r.position),
    name: `${r.Driver.givenName} ${r.Driver.familyName}`,
    team: r.Constructors[0]?.name ?? null,
    points: Number(r.points),
  }));
  if (entries.length === 0) return null;
  return { season: String(year), entries };
}

interface Season {
  id: string;
  year: number;
}

interface MotoGpStandingRow {
  position: number | null;
  points: number | null;
  rider?: { full_name?: string };
  team?: { name?: string };
  constructor?: { name?: string };
}

async function fetchMotoGpStandings(year: number): Promise<Standings | null> {
  const seasons = await getJson<Season[]>(`${MOTOGP}/seasons`);
  const season = seasons?.find((s) => s.year === year);
  if (!season) return null;

  const data = await getJson<{ classification?: MotoGpStandingRow[] }>(
    `${MOTOGP}/standings?seasonUuid=${season.id}&categoryUuid=${MOTOGP_CATEGORY}`,
  );
  const rows = data?.classification ?? [];
  const entries: StandingEntry[] = rows
    .filter((r): r is MotoGpStandingRow & { position: number } => r.position != null)
    .map((r) => ({
      position: r.position,
      name: r.rider?.full_name ?? '',
      team: r.constructor?.name ?? r.team?.name ?? null,
      points: r.points ?? 0,
    }))
    .filter((e) => e.name.length > 0)
    .sort((a, b) => a.position - b.position);
  if (entries.length === 0) return null;
  return { season: String(year), entries };
}

export async function fetchMotorsportStandings(params: {
  sportId: string;
  year: number;
}): Promise<Standings | null> {
  if (params.sportId === 'f1') return fetchF1Standings(params.year);
  if (params.sportId === 'motogp') return fetchMotoGpStandings(params.year);
  return null;
}
