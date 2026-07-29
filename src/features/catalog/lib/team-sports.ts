/**
 * Sports where clubs face each other, so "follow a team" is meaningful: the
 * user wants that club's matches wherever they are played — league, cup or
 * European night alike.
 *
 * The rest (F1, MotoGP, UFC, tennis) do have teams in the data providers, but
 * following one makes no sense here: the entries don't play *against* each
 * other, so what a user picks is the event itself. Those sports stop at the
 * league level.
 */
const TEAM_SPORTS = new Set(['football', 'basketball', 'volleyball']);

export function hasTeams(sportId: string | null | undefined): boolean {
  return Boolean(sportId && TEAM_SPORTS.has(sportId));
}
