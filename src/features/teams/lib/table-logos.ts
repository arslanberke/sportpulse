import type { LeagueTableGroup, Team } from '../../../types/index.ts';

export function clubKey(name: string): string {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/sportif faaliyetler|futbol kulubu|football club/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(fc|cf|sc|ac|sk|fk|sfk|jk|bb|bk|bc|as|club)\b/g, ' ')
    .replace(/spor\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function dedupeClubTeams(teams: Team[]): Team[] {
  const unique = new Map<string, Team>();
  for (const team of teams) {
    const key = `${team.sportId}|${clubKey(team.name)}`;
    const current = unique.get(key);
    const quality = (item: Team) => Object.keys(item.externalIds).length * 2 + Number(Boolean(item.logoUrl));
    if (!current || quality(team) > quality(current)) unique.set(key, team);
  }
  return [...unique.values()];
}

export function enrichTableLogos(groups: LeagueTableGroup[], teams: Team[]): LeagueTableGroup[] {
  const logos = new Map<string, string>();
  for (const team of teams) if (team.logoUrl) logos.set(clubKey(team.name), team.logoUrl);
  return groups.map(group => ({
    ...group,
    rows: group.rows.map(row => ({
      ...row,
      teamLogoUrl: row.teamLogoUrl ?? logos.get(clubKey(row.team)) ?? null,
    })),
  }));
}
